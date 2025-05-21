// Модуль для доступа к бесплатным AI провайдерам
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Список провайдеров, отсортированных по стабильности
const PROVIDERS = [
  {
    name: 'Qwen',
    model: 'qwen-2.5-ultra-preview',
    maxTokens: 800
  },
  {
    name: 'ChatGptAI',
    model: 'gpt-3.5-turbo',
    maxTokens: 4000
  },
  {
    name: 'DeepAI',
    model: 'chat',
    maxTokens: 800
  },
  {
    name: 'Perplexity',
    model: 'llama-3.1-sonar-small-128k-online',
    maxTokens: 1000
  }
];

// Функция для выполнения HTTP запроса с промисами
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(options.url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const contentType = res.headers['content-type'] || '';
            const result = contentType.includes('application/json') ? JSON.parse(data) : data;
            resolve({ data: result, headers: res.headers, statusCode: res.statusCode });
          } catch (error) {
            reject(new Error(`Ошибка парсинга ответа: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ошибка: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      const dataString = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataString);
    }
    
    req.end();
  });
}

// Функция для получения ответа от Qwen
async function getResponseFromQwen(message, options = {}) {
  try {
    const response = await httpRequest({
      url: 'https://api.lingyiwanwu.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }, {
      messages: [{ role: 'user', content: message }],
      model: options.model || 'qwen-2.5-ultra-preview',
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 800
    });
    
    return {
      response: response.data.choices[0].message.content,
      provider: 'Qwen',
      model: response.data.model || 'qwen-2.5-ultra-preview'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Qwen API:', error.message);
    throw error;
  }
}

// Функция для получения ответа от ChatGptAI
async function getResponseFromChatGptAI(message, options = {}) {
  try {
    const userId = `user-${Date.now()}`;
    const response = await httpRequest({
      url: 'https://chat-gpt.org/api/text',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    }, {
      userId: userId,
      message: message,
      conversationId: `conv-${Date.now()}`,
      temperature: options.temperature || 0.7
    });
    
    return {
      response: response.data.response || 'Нет ответа от ChatGptAI',
      provider: 'ChatGptAI',
      model: 'gpt-3.5-turbo'
    };
  } catch (error) {
    console.error('Ошибка при обращении к ChatGptAI API:', error.message);
    throw error;
  }
}

// Функция для получения ответа от DeepAI
async function getResponseFromDeepAI(message, options = {}) {
  try {
    const response = await httpRequest({
      url: 'https://api.deepai.org/api/text-generator',
      method: 'POST',
      headers: {
        'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K',
        'Content-Type': 'application/json'
      }
    }, {
      text: message
    });
    
    return {
      response: response.data.output || 'Нет ответа от DeepAI',
      provider: 'DeepAI',
      model: 'text-generator'
    };
  } catch (error) {
    console.error('Ошибка при обращении к DeepAI API:', error.message);
    throw error;
  }
}

// Функция для получения ответа от Perplexity
async function getResponseFromPerplexity(message, options = {}) {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('API ключ для Perplexity не найден в переменных окружения');
    }
    
    const response = await httpRequest({
      url: 'https://api.perplexity.ai/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, {
      model: options.model || 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Ты полезный ассистент.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7
    });
    
    return {
      response: response.data.choices[0].message.content,
      provider: 'Perplexity',
      model: options.model || 'llama-3.1-sonar-small-128k-online'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Perplexity API:', error.message);
    throw error;
  }
}

// Основная функция для получения ответа с каскадным перебором провайдеров
async function getAIResponse(message, options = {}) {
  const provider = options.provider?.toLowerCase();
  
  // Если указан конкретный провайдер, пробуем только его
  if (provider) {
    switch (provider) {
      case 'qwen':
        return getResponseFromQwen(message, options);
      case 'chatgptai':
        return getResponseFromChatGptAI(message, options);
      case 'deepai':
        return getResponseFromDeepAI(message, options);
      case 'perplexity':
        return getResponseFromPerplexity(message, options);
      default:
        throw new Error(`Неизвестный провайдер: ${provider}`);
    }
  }
  
  // Иначе перебираем все провайдеры по порядку
  let lastError = null;
  
  for (const providerInfo of PROVIDERS) {
    try {
      console.log(`Пробуем провайдер: ${providerInfo.name}`);
      
      switch (providerInfo.name.toLowerCase()) {
        case 'qwen':
          return await getResponseFromQwen(message, {
            ...options,
            model: providerInfo.model,
            maxTokens: providerInfo.maxTokens
          });
        case 'chatgptai':
          return await getResponseFromChatGptAI(message, {
            ...options,
            model: providerInfo.model,
            maxTokens: providerInfo.maxTokens
          });
        case 'deepai':
          return await getResponseFromDeepAI(message, {
            ...options,
            model: providerInfo.model,
            maxTokens: providerInfo.maxTokens
          });
        case 'perplexity':
          // Пропускаем, если нет API ключа
          if (!process.env.PERPLEXITY_API_KEY) {
            console.log('Пропускаем Perplexity - отсутствует API ключ');
            continue;
          }
          return await getResponseFromPerplexity(message, {
            ...options,
            model: providerInfo.model,
            maxTokens: providerInfo.maxTokens
          });
      }
    } catch (error) {
      console.warn(`Провайдер ${providerInfo.name} не сработал:`, error.message);
      lastError = error;
    }
  }
  
  throw new Error(lastError ? `Все провайдеры не ответили. Последняя ошибка: ${lastError.message}` : 'Все провайдеры не ответили');
}

// Получение списка доступных провайдеров
function getAvailableProviders() {
  return PROVIDERS.map(p => ({
    name: p.name,
    model: p.model,
    maxTokens: p.maxTokens
  }));
}

module.exports = {
  getAIResponse,
  getAvailableProviders
};