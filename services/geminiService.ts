export interface GeminiConfig {
  apiKey: string;
}

export interface LeadCriteria {
  description: string;
}

export interface AnalyzedLead {
  id: string;
  channel: string;
  author: string;
  message: string;
  timestamp: string;
  reason: string;
  confidence: number; // 0-100
}

export interface AnalysisResult {
  leads: AnalyzedLead[];
  totalAnalyzed: number;
  processingTime: number;
}

class OpenRouterService {
  private config: GeminiConfig | null = null;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  async initialize(config: GeminiConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.config = config;
    console.log('OpenRouter service initialized successfully');
  }

  async analyzeMessagesForLeads(
    messages: Array<{
      id: string;
      channel: string;
      author: string;
      message: string;
      timestamp: string;
    }>,
    criteria: LeadCriteria
  ): Promise<AnalysisResult> {
    if (!this.config) {
      throw new Error('Gemini service not initialized');
    }

    const startTime = Date.now();
    const leads: AnalyzedLead[] = [];

    try {
      // Создаем промпт для анализа
      const prompt = this.createAnalysisPrompt(messages, criteria);
      
      // Отправляем запрос к OpenRouter API
      const response = await this.callOpenRouterAPI(prompt);
      
      // Парсим ответ и извлекаем лиды
      const analyzedLeads = this.parseOpenRouterResponse(response, messages);
      leads.push(...analyzedLeads);

    } catch (error) {
      console.error('Error analyzing messages with OpenRouter:', error);
      throw new Error(`Failed to analyze messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const processingTime = Date.now() - startTime;

    return {
      leads,
      totalAnalyzed: messages.length,
      processingTime
    };
  }

  private createAnalysisPrompt(
    messages: Array<{
      id: string;
      channel: string;
      author: string;
      message: string;
      timestamp: string;
    }>,
    criteria: LeadCriteria
  ): string {
    const messagesText = messages.map((msg, index) => 
      `Message ${index + 1}:\nID: ${msg.id}\nChannel: ${msg.channel}\nAuthor: ${msg.author}\nTimestamp: ${msg.timestamp}\nContent: ${msg.message}\n---`
    ).join('\n');

    // Используем единый промпт пользователя, заменяя ${messagesText} на реальные сообщения
    return criteria.description.replace('${messagesText}', messagesText);
  }

  private async callOpenRouterAPI(prompt: string): Promise<any> {
    if (!this.config) {
      throw new Error('OpenRouter service not initialized');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Telegram Lead Scanner'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8192,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  private parseOpenRouterResponse(
    response: any,
    originalMessages: Array<{
      id: string;
      channel: string;
      author: string;
      message: string;
      timestamp: string;
    }>
  ): AnalyzedLead[] {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.warn('No content in OpenRouter response');
        return [];
      }

      // Пытаемся извлечь JSON из ответа
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in OpenRouter response');
        return [];
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      const leads: AnalyzedLead[] = [];

      if (parsedResponse.leads && Array.isArray(parsedResponse.leads)) {
        for (const lead of parsedResponse.leads) {
          const originalMessage = originalMessages.find(msg => msg.id === lead.messageId);
          if (originalMessage) {
            leads.push({
              id: `lead_${originalMessage.id}_${Date.now()}`,
              channel: originalMessage.channel,
              author: originalMessage.author,
              message: originalMessage.message,
              timestamp: originalMessage.timestamp,
              reason: lead.reason || 'Соответствует критериям поиска',
              confidence: Math.min(100, Math.max(0, lead.confidence || 50))
            });
          }
        }
      }

      return leads;
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
      return [];
    }
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  getConfig(): GeminiConfig | null {
    return this.config;
  }
}

const openRouterService = new OpenRouterService();
export default openRouterService;