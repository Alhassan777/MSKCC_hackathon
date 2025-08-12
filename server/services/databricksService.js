const axios = require('axios');

class DatabricksService {
  constructor() {
    this.endpoint = process.env.DATABRICKS_ENDPOINT;
    this.pat = process.env.DATABRICKS_PAT;
    
    if (!this.endpoint || !this.pat) {
      throw new Error('DATABRICKS_ENDPOINT and DATABRICKS_PAT must be set in environment variables');
    }
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.endpoint,
      timeout: 30000, // 30 seconds
      headers: {
        'Authorization': `Bearer ${this.pat}`,
        'Content-Type': 'application/json',
      }
    });
  }

  /**
   * Send a message to Claude via Databricks
   * @param {Array} messages - Array of conversation messages
   * @param {string} language - Target language for response
   * @param {Object} options - Additional options
   */
  async sendMessage(messages, language = 'en', options = {}) {
    try {
      // Add language instruction to the system message
      const languageInstruction = this.getLanguageInstruction(language);
      
      // Prepare messages for Claude
      const formattedMessages = this.formatMessages(messages, languageInstruction);
      
      const payload = {
        messages: formattedMessages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stream: false
      };

      console.log('Sending request to Databricks:', {
        endpoint: this.endpoint,
        messageCount: formattedMessages.length,
        language
      });

      const response = await this.client.post('', payload);
      
      if (!response.data) {
        throw new Error('No response data from Databricks');
      }

      return {
        content: response.data.content?.[0]?.text || response.data.message || 'No response content',
        usage: response.data.usage || null,
        model: response.data.model || 'claude-3-sonnet',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Databricks Service Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // Handle specific error types
      if (error.response?.status === 401) {
        throw new Error('Authentication failed - check your Databricks PAT token');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      } else if (error.response?.status >= 500) {
        throw new Error('Databricks service is temporarily unavailable');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - the service took too long to respond');
      }

      throw new Error(`Databricks API error: ${error.message}`);
    }
  }

  /**
   * Format messages for Claude API
   */
  formatMessages(messages, languageInstruction) {
    const formatted = [];
    
    // Add system message with MSK context and language instruction
    formatted.push({
      role: 'system',
      content: `You are MSK Assistant, a helpful AI assistant for Memorial Sloan Kettering Cancer Center's Young Adult Program. 

Your role:
- Provide information about MSK services, appointments, costs, and young adult cancer support
- Be warm, supportive, and professional
- Avoid medical advice - always refer to care teams for medical questions
- Keep responses concise and actionable
- Include relevant action buttons when helpful (Call, Schedule, Resources)

${languageInstruction}

Important guidelines:
- Never provide medical diagnoses or treatment advice
- Always encourage users to contact their care team for medical questions
- For emergencies, direct to 911 or emergency services
- Protect user privacy - don't store or request personal information
- If asked about topics outside MSK services, politely redirect to relevant MSK resources`
    });

    // Add conversation messages
    messages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        formatted.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    return formatted;
  }

  /**
   * Get language-specific instruction
   */
  getLanguageInstruction(language) {
    const instructions = {
      en: 'Respond in English with a warm, supportive tone.',
      es: 'Responde en español con un tono cálido y de apoyo. Usa un lenguaje claro y accesible.',
      ar: 'أجب باللغة العربية بنبرة دافئة وداعمة. استخدم لغة واضحة ومفهومة.',
      zh: '用中文回答，语调温暖支持。使用清晰易懂的语言。',
      pt: 'Responda em português com um tom caloroso e de apoio. Use linguagem clara e acessível.'
    };

    return instructions[language] || instructions.en;
  }

  /**
   * Health check for Databricks connection
   */
  async healthCheck() {
    try {
      const testMessage = {
        messages: [{
          role: 'system',
          content: 'You are a test assistant. Respond with "OK" only.'
        }, {
          role: 'user',
          content: 'Health check'
        }],
        max_tokens: 10,
        temperature: 0
      };

      const response = await this.client.post('', testMessage);
      return { 
        status: 'healthy', 
        response: response.status === 200,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = DatabricksService;
