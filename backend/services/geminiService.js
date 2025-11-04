class OpenRouterService {
  constructor() {
    this.config = null;
  }

  initialize(config) {
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
      console.log('🔧 Running in mock mode');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Return mock response with test leads
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              leads: [
                {
                  messageId: "test_msg_1",
                  reason: "Тестовый лид для демонстрации функциональности системы",
                  confidence: 80
                }
              ]
            })
          }
        }]
      };
    }

    // Validate API key for real mode
    if (!this.config.apiKey || this.config.apiKey === 'your_openrouter_api_key_here' || this.config.apiKey.length < 10) {
      throw new Error('Invalid or missing OpenRouter API key. Please set a valid OPENROUTER_API_KEY in your .env file.');
    }

    // Validate input parameters
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    if (messages.length === 0) {
      console.log('⚠️ No messages provided for analysis');
      return {
        leads: [],
        totalAnalyzed: 0,
        processingTime: 0
      };
    }

    if (!criteria || typeof criteria !== 'object' || !criteria.description) {
      throw new Error('Valid criteria with description is required');
    }

    // Validate message structure
    const invalidMessages = messages.filter(msg => 
      !msg.id || !msg.message || typeof msg.message !== 'string'
    );
    
    if (invalidMessages.length > 0) {
      console.warn(`⚠️ Found ${invalidMessages.length} invalid messages, skipping them`);
      messages = messages.filter(msg => msg.id && msg.message && typeof msg.message === 'string');
    }

    if (messages.length === 0) {
      console.log('⚠️ No valid messages remaining after validation');
      return {
        leads: [],
        totalAnalyzed: 0,
        processingTime: 0
      };
    }

    console.log('🔍 Starting lead analysis...');
    console.log(`📊 Messages to analyze: ${messages.length}`);
    console.log(`🎯 Criteria: ${JSON.stringify(criteria)}`);

    // Limit messages to prevent extremely long processing
    const MAX_MESSAGES = 5000; // Increased limit to 5000 messages for better performance
    if (messages.length > MAX_MESSAGES) {
      console.log(`⚠️ Too many messages (${messages.length}), limiting to ${MAX_MESSAGES} most recent`);
      messages = messages.slice(-MAX_MESSAGES); // Take the most recent messages
    }

    const startTime = Date.now();
    const allLeads = [];

    try {
      // Split messages into chunks to avoid API limits
      const chunks = this.splitMessagesIntoChunks(messages, 100); // Increase chunk size to 100
      console.log(`📦 Split into ${chunks.length} chunks for processing`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} messages)`);
        
        try {
          // Создаем промпт для анализа
          const prompt = this.createAnalysisPrompt(chunk, criteria);
          console.log(`📝 Generated prompt length for chunk ${i + 1}: ${prompt.length}`);
          console.log(`🎯 Found ${allLeads.length} leads so far...`);
          
          // Check if prompt is too long
          if (prompt.length > 100000) { // ~100k chars limit
            console.warn(`⚠️ Prompt too long (${prompt.length} chars), splitting chunk further`);
            const subChunks = this.splitMessagesIntoChunks(chunk, Math.floor(chunk.length / 2));
            for (const subChunk of subChunks) {
              const subPrompt = this.createAnalysisPrompt(subChunk, criteria);
              const subResponse = await this.callOpenRouterAPI(subPrompt);
              const subLeads = this.parseOpenRouterResponse(subResponse, subChunk);
              allLeads.push(...subLeads);
            }
          } else {
            // Отправляем запрос к OpenRouter API
            const response = await this.callOpenRouterAPI(prompt);
            
            // Парсим ответ и извлекаем лиды
            const analyzedLeads = this.parseOpenRouterResponse(response, chunk);
            console.log(`🎯 Found ${analyzedLeads.length} leads in chunk ${i + 1}`);
            allLeads.push(...analyzedLeads);
          }
          
          // Add delay between requests to avoid rate limiting
          if (i < chunks.length - 1) {
            console.log('⏳ Waiting 500ms before next chunk...');
            await new Promise(resolve => setTimeout(resolve, 500)); // Reduce delay to 500ms
          }
        } catch (chunkError) {
          console.error(`❌ Error processing chunk ${i + 1}:`, chunkError.message);
          // Continue with other chunks instead of failing completely
        }
      }

    } catch (error) {
      console.error('❌ Error analyzing messages with OpenRouter:', error);
      throw new Error(`Failed to analyze messages: ${error.message}`);
    }

    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`⏱️ Analysis completed in ${processingTime} seconds`);
    console.log(`🎯 Total leads found: ${allLeads.length}`);

    return {
      leads: allLeads,
      totalAnalyzed: messages.length,
      processingTime
    };
  }

  splitMessagesIntoChunks(messages, chunkSize) {
    const chunks = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }
    return chunks;
  }

  createAnalysisPrompt(messages, criteria) {
    // Группируем сообщения по авторам для лучшего контекста
    const messagesByAuthor = {};
    messages.forEach(msg => {
      if (!messagesByAuthor[msg.author]) {
        messagesByAuthor[msg.author] = [];
      }
      messagesByAuthor[msg.author].push(msg);
    });

    const messagesText = messages.map((msg, index) => {
      const authorMessages = messagesByAuthor[msg.author];
      const otherMessages = authorMessages.filter(m => m.id !== msg.id);
      
      let messageText = `Message ${index + 1}:
ID: ${msg.id}
Channel: ${msg.channel}
Author: ${msg.author}
Timestamp: ${msg.timestamp}
Content: ${msg.message}`;
      
      if (otherMessages.length > 0) {
        messageText += `
Другие сообщения от этого автора в данном наборе:`;
        otherMessages.forEach((otherMsg, idx) => {
          messageText += `
  - Сообщение ${idx + 1}: "${otherMsg.message}" (${otherMsg.timestamp})`;
        });
      }
      
      return messageText + '\n---';
    }).join('\n');

    // Используем только пользовательский промпт, заменяя переменную ${messagesText}
    return criteria.description.replace('${messagesText}', messagesText);
  }

  async callOpenRouterAPI(prompt) {
    
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    const requestBody = {
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 8192,
      top_p: 0.95
    };

    console.log('🌐 API Request URL:', url);
    console.log('📦 Request body model:', requestBody.model);
    console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'http://localhost:5174',
        'X-Title': 'Telegram Lead Scanner'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 API Response status:', response.status);
    console.log('📡 API Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        errorData: errorData
      });
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('OpenRouter API authentication failed. Please check your API key.');
      } else if (response.status === 429) {
        throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
      } else if (response.status === 413) {
        throw new Error('Request payload too large. Try reducing the number of messages.');
      } else if (response.status >= 500) {
        throw new Error('OpenRouter API server error. Please try again later.');
      } else {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
    }

    const jsonResponse = await response.json();
    console.log('✅ API Response received, choices count:', jsonResponse.choices?.length || 0);
    console.log('🔍 Full API Response:', JSON.stringify(jsonResponse, null, 2));
    console.log('📊 Model used by API:', jsonResponse.model);
    console.log('📊 Usage info:', jsonResponse.usage);
    return jsonResponse;
  }

  parseOpenRouterResponse(response, originalMessages) {
    try {
      console.log('🔍 Parsing OpenRouter response...');
      console.log('🔍 Full response structure:', JSON.stringify(response, null, 2));
      
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.warn('⚠️ No content in OpenRouter response');
        console.log('🔍 Response choices:', response.choices);
        return [];
      }

      console.log('📄 Raw AI response (full):', content);

      // Пытаемся извлечь JSON из ответа
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ No JSON found in OpenRouter response');
        console.log('📄 Full response content:', content);
        
        // Попробуем найти хотя бы слово "leads"
        if (content.toLowerCase().includes('leads') || content.toLowerCase().includes('лид')) {
          console.log('🔍 Response contains "leads" keyword, but no valid JSON structure');
        }
        return [];
      }

      console.log('📋 Extracted JSON (full):', jsonMatch[0]);
      let parsedResponse;
      try {
        // Очищаем JSON от возможных проблемных символов
        let cleanJson = jsonMatch[0].trim();
        
        // Проверяем что JSON начинается и заканчивается правильно
        if (!cleanJson.startsWith('{') || !cleanJson.endsWith('}')) {
          console.warn('⚠️ JSON не имеет правильного формата:', cleanJson.substring(0, 100));
          return [];
        }
        
        // Пытаемся исправить распространенные проблемы с JSON
        cleanJson = cleanJson
          .replace(/,\s*}/g, '}')  // Убираем лишние запятые перед }
          .replace(/,\s*]/g, ']')  // Убираем лишние запятые перед ]
          .replace(/\n/g, ' ')     // Заменяем переносы строк на пробелы
          .replace(/\t/g, ' ')     // Заменяем табы на пробелы
          .replace(/\s+/g, ' ');   // Убираем множественные пробелы
        
        console.log('🧹 Cleaned JSON:', cleanJson);
        parsedResponse = JSON.parse(cleanJson);
        console.log('✅ Parsed response:', JSON.stringify(parsedResponse, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.log('📄 Raw JSON that failed to parse:', jsonMatch[0]);
        
        // Пытаемся извлечь хотя бы базовую информацию
        try {
          // Ищем массив leads в тексте
          const leadsMatch = jsonMatch[0].match(/"leads"\s*:\s*\[(.*?)\]/s);
          if (leadsMatch) {
            console.log('🔧 Trying to extract leads array manually...');
            console.log('🔧 Found leads match:', leadsMatch[0]);
            parsedResponse = { leads: [] };
          } else {
            console.log('❌ No leads array found in response');
            return [];
          }
        } catch (fallbackError) {
          console.error('❌ Fallback parsing also failed:', fallbackError);
          return [];
        }
      }
      const leads = [];

      if (parsedResponse.leads && Array.isArray(parsedResponse.leads)) {
        console.log(`🔍 Processing ${parsedResponse.leads.length} potential leads from AI response`);
        
        for (const lead of parsedResponse.leads) {
          console.log(`📋 Checking lead: ${lead.messageId}, reason: "${lead.reason}", confidence: ${lead.confidence}`);
          
          // Более мягкая фильтрация лидов
          const hasValidReason = lead.reason && lead.reason.trim().length > 0;
          const isNotExplicitlyIrrelevant = !lead.reason || (
            !lead.reason.toLowerCase().includes('not relevant') && 
            !lead.reason.toLowerCase().includes('нерелевантн') &&
            !lead.reason.toLowerCase().includes('не релевантн') &&
            !lead.reason.toLowerCase().includes('irrelevant') &&
            !lead.reason.toLowerCase().includes('не подходит')
          );
          const hasReasonableConfidence = !lead.confidence || lead.confidence >= 30; // Снижаем порог с 50 до 30
          
          const isRelevant = hasValidReason && isNotExplicitlyIrrelevant && hasReasonableConfidence;
          
          if (isRelevant) {
            // Приводим messageId к строке для корректного сравнения
            const leadMessageId = String(lead.messageId);
            const originalMessage = originalMessages.find(msg => String(msg.id) === leadMessageId);
            if (originalMessage) {
              console.log(`✅ Found relevant lead: ${lead.messageId}, reason: ${lead.reason}, confidence: ${lead.confidence}`);
              console.log('🔍 Creating lead with username:', originalMessage.username, 'and author:', originalMessage.author);
              leads.push({
                id: `lead_${originalMessage.id}_${Date.now()}`,
                channel: originalMessage.channel,
                author: originalMessage.author,
                username: originalMessage.username || originalMessage.author,
                message: originalMessage.message,
                timestamp: originalMessage.timestamp,
                reasoning: lead.reason || 'Соответствует критериям поиска',
                confidence: Math.min(100, Math.max(0, parseInt(lead.confidence) || 50))
              });
            } else {
              console.warn(`⚠️ Original message not found for lead: ${lead.messageId}`);
              console.log('🔍 Available message IDs:', originalMessages.map(msg => `${msg.id} (${typeof msg.id})`));
              console.log('🔍 Looking for messageId:', leadMessageId, `(${typeof leadMessageId})`);
            }
          } else {
            console.log(`❌ Filtered out lead: ${lead.messageId}, reason: "${lead.reason}", confidence: ${lead.confidence}, hasValidReason: ${hasValidReason}, isNotExplicitlyIrrelevant: ${isNotExplicitlyIrrelevant}, hasReasonableConfidence: ${hasReasonableConfidence}`);
          }
        }
      }

      return leads;
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
      return [];
    }
  }

  isInitialized() {
    return this.config !== null;
  }

  getConfig() {
    return this.config;
  }
}

module.exports = OpenRouterService;
