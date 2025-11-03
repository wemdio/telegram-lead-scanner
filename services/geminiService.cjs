class OpenRouterService {
  constructor() {
    this.config = null;
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  async initialize(config) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.config = config;
  }

  async analyzeMessagesForLeads(messages, criteria) {
    // Validate service initialization
    if (!this.config) {
      throw new Error('Gemini service not initialized');
    }

    // Check for mock mode first
    if (this.config.apiKey === 'mock_key') {
      console.log('🔧 Mock mode enabled - generating sample leads');
      return this.generateMockLeads(messages, criteria);
    }

    try {
      const leads = [];
      const batchSize = 10;
      const startTime = Date.now();

      console.log(`🔍 Analyzing ${messages.length} messages for leads...`);

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchLeads = await this.analyzeBatch(batch, criteria);
        leads.push(...batchLeads);
        
        console.log(`📊 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}, found ${batchLeads.length} leads`);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Analysis complete: ${leads.length} leads found in ${processingTime}ms`);

      return {
        leads,
        totalAnalyzed: messages.length,
        processingTime
      };
    } catch (error) {
      console.error('❌ Error analyzing messages:', error);
      throw error;
    }
  }

  async analyzeBatch(messages, criteria) {
    const prompt = this.createAnalysisPrompt(messages, criteria);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://telegram-scanner.com',
          'X-Title': 'Telegram Lead Scanner'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      return this.parseAnalysisResult(content, messages);
    } catch (error) {
      console.error('❌ Error in batch analysis:', error);
      return [];
    }
  }

  createAnalysisPrompt(messages, criteria) {
    const messagesText = messages.map((msg, index) => 
      `Message ${index + 1}:\nChannel: ${msg.channel}\nAuthor: ${msg.author}\nText: ${msg.message}\nTimestamp: ${msg.timestamp}\n---`
    ).join('\n');

    return `Analyze the following Telegram messages and identify potential leads based on these criteria: "${criteria.description}"

Messages to analyze:
${messagesText}

For each message that matches the lead criteria, respond with a JSON object in this exact format:
{
  "leads": [
    {
      "messageIndex": 1,
      "reason": "Brief explanation why this is a lead",
      "confidence": 85
    }
  ]
}

Only include messages that clearly match the criteria. Confidence should be 0-100. If no leads found, return {"leads": []}.`;
  }

  parseAnalysisResult(content, originalMessages) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ No JSON found in response');
        return [];
      }

      const result = JSON.parse(jsonMatch[0]);
      const leads = [];

      if (result.leads && Array.isArray(result.leads)) {
        for (const lead of result.leads) {
          const messageIndex = lead.messageIndex - 1;
          if (messageIndex >= 0 && messageIndex < originalMessages.length) {
            const originalMessage = originalMessages[messageIndex];
            leads.push({
              id: `lead_${Date.now()}_${messageIndex}`,
              channel: originalMessage.channel,
              author: originalMessage.author,
              message: originalMessage.message,
              timestamp: originalMessage.timestamp,
              reason: lead.reason || 'Matches lead criteria',
              confidence: Math.min(100, Math.max(0, lead.confidence || 50))
            });
          }
        }
      }

      return leads;
    } catch (error) {
      console.error('❌ Error parsing analysis result:', error);
      return [];
    }
  }

  generateMockLeads(messages, criteria) {
    const mockLeads = [];
    const sampleReasons = [
      'Mentions business opportunity',
      'Looking for services',
      'Potential client inquiry',
      'Business networking message'
    ];

    // Generate 1-3 mock leads from the messages
    const leadCount = Math.min(3, Math.max(1, Math.floor(messages.length * 0.1)));
    
    for (let i = 0; i < leadCount && i < messages.length; i++) {
      const message = messages[i];
      mockLeads.push({
        id: `mock_lead_${Date.now()}_${i}`,
        channel: message.channel,
        author: message.author,
        message: message.message,
        timestamp: message.timestamp,
        reason: sampleReasons[i % sampleReasons.length],
        confidence: 75 + Math.floor(Math.random() * 20) // 75-95
      });
    }

    return {
      leads: mockLeads,
      totalAnalyzed: messages.length,
      processingTime: 500 + Math.floor(Math.random() * 1000) // Mock processing time
    };
  }

  getConfig() {
    return this.config;
  }
}

module.exports = OpenRouterService;