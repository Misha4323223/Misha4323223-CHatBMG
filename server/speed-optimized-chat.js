/**
 * Оптимизированная система чата для быстрых ответов (3-5 секунд)
 * Приоритизирует скорость над разнообразием провайдеров
 */

const axios = require('axios');

// Быстрые провайдеры с минимальными таймаутами
const FAST_PROVIDERS = [
  {
    name: 'ChatGPT4Online',
    url: 'https://chatgpt4online.org/wp-json/mwai-ui/v1/chats/submit',
    timeout: 5000,
    format: 'chatgpt4online'
  },
  {
    name: 'Free2GPT',
    url: 'https://free2gpt.xyz/api/generate',
    timeout: 4000,
    format: 'free2gpt'
  },
  {
    name: 'ChatAnyWhere', 
    url: 'https://api.chatanywhere.com.cn/v1/chat/completions',
    timeout: 6000,
    format: 'openai'
  }
];

/**
 * Форматирование запроса для ChatGPT4Online
 */
function formatChatGPT4OnlineRequest(message) {
  return {
    botId: 'default',
    customId: null,
    session: 'N/A',
    chatId: `chatcmpl-${Date.now()}`,
    contextId: 1,
    messages: [{ role: 'user', content: message }],
    newMessage: message,
    stream: false
  };
}

/**
 * Форматирование запроса для Free2GPT
 */
function formatFree2GPTRequest(message) {
  return {
    prompt: message,
    model: 'gpt-3.5-turbo'
  };
}

/**
 * Форматирование запроса для OpenAI-совместимых API
 */
function formatOpenAIRequest(message) {
  return {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
    temperature: 0.7,
    max_tokens: 1000
  };
}

/**
 * Получение быстрого ответа от одного провайдера
 */
async function getResponseFromProvider(provider, message) {
  try {
    let requestData;
    
    switch (provider.format) {
      case 'chatgpt4online':
        requestData = formatChatGPT4OnlineRequest(message);
        break;
      case 'free2gpt':
        requestData = formatFree2GPTRequest(message);
        break;
      case 'openai':
        requestData = formatOpenAIRequest(message);
        break;
      default:
        requestData = { message };
    }

    console.log(`⚡ Пробуем ${provider.name}...`);
    
    const response = await axios.post(provider.url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: provider.timeout
    });

    // Извлекаем ответ в зависимости от формата
    let aiResponse = '';
    
    if (response.data) {
      if (response.data.reply) {
        aiResponse = response.data.reply;
      } else if (response.data.choices && response.data.choices[0]) {
        aiResponse = response.data.choices[0].message?.content || response.data.choices[0].text;
      } else if (response.data.response) {
        aiResponse = response.data.response;
      } else if (response.data.text) {
        aiResponse = response.data.text;
      } else if (typeof response.data === 'string') {
        aiResponse = response.data;
      }
    }

    if (aiResponse && aiResponse.trim()) {
      console.log(`✅ ${provider.name} ответил быстро!`);
      return {
        success: true,
        response: aiResponse.trim(),
        provider: provider.name,
        model: 'gpt-3.5-turbo',
        responseTime: provider.timeout
      };
    }

    throw new Error('Пустой ответ');
    
  } catch (error) {
    console.log(`❌ ${provider.name} не ответил: ${error.message}`);
    return {
      success: false,
      error: error.message,
      provider: provider.name
    };
  }
}

/**
 * Главная функция для получения быстрого ответа
 * Пробует провайдеры параллельно для максимальной скорости
 */
async function getSpeedOptimizedResponse(message) {
  console.log('🚀 Запуск оптимизированной системы быстрых ответов...');
  
  try {
    // Запускаем все провайдеры параллельно
    const promises = FAST_PROVIDERS.map(provider => 
      getResponseFromProvider(provider, message)
    );
    
    // Ждем первый успешный ответ
    const results = await Promise.allSettled(promises);
    
    // Находим первый успешный результат
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`⚡ Быстрый ответ получен от ${result.value.provider}!`);
        return result.value;
      }
    }
    
    // Если никто не ответил успешно, возвращаем последнюю ошибку
    const lastError = results[results.length - 1];
    return {
      success: false,
      error: 'Все быстрые провайдеры недоступны',
      provider: 'SpeedOptimized',
      details: lastError.reason || lastError.value?.error
    };
    
  } catch (error) {
    console.error('❌ Критическая ошибка в оптимизированной системе:', error);
    return {
      success: false,
      error: 'Критическая ошибка системы',
      provider: 'SpeedOptimized'
    };
  }
}

module.exports = {
  getSpeedOptimizedResponse
};