/**
 * Оптимизированная система чата для быстрых ответов (3-5 секунд)
 * Приоритизирует скорость над разнообразием провайдеров
 */

const axios = require('axios');

// Быстрые AI провайдеры - приоритет самым быстрым
const FAST_PROVIDERS = [
  {
    name: 'PythonG4F-Qwen',
    url: 'http://localhost:5004/python/chat',
    timeout: 7000,
    format: 'python',
    provider: 'Qwen_Qwen_2_5_Max'
  },
  {
    name: 'FastFreeChatEnhanced',
    url: 'http://localhost:5000/api/freechat/chat',
    timeout: 8000,
    format: 'local'
  }
];

/**
 * Форматирование запроса для локальных провайдеров
 */
function formatLocalRequest(message) {
  return {
    message: message,
    provider: 'auto',
    timeout: 5000
  };
}

/**
 * Получение быстрого ответа от одного провайдера
 */
async function getResponseFromProvider(provider, message) {
  try {
    let requestData;
    
    switch (provider.format) {
      case 'local':
        requestData = formatLocalRequest(message);
        break;
      case 'python':
        requestData = {
          message: message,
          provider: provider.provider || 'Qwen_Qwen_2_5_Max'
        };
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