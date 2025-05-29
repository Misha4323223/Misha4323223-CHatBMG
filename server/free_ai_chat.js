/**
 * Бесплатный AI чат с проверенными провайдерами
 */

// Список проверенных бесплатных AI сервисов
const FREE_AI_PROVIDERS = [
  {
    name: 'HuggingFace',
    endpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
    type: 'public'
  },
  {
    name: 'Ollama',
    endpoint: 'http://localhost:11434/api/generate',
    type: 'local'
  }
];

/**
 * Получение ответа от бесплатного AI провайдера
 */
async function getFreeAIResponse(message, providerName = 'demo') {
  try {
    // Пробуем использовать публичные API
    if (providerName === 'huggingface') {
      return await getHuggingFaceResponse(message);
    }
    
    // Fallback на демо режим с умными ответами
    return getDemoAIResponse(message);
    
  } catch (error) {
    console.error('Ошибка AI провайдера:', error);
    return getDemoAIResponse(message);
  }
}

/**
 * HuggingFace бесплатное API
 */
async function getHuggingFaceResponse(message) {
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: message,
        parameters: {
          max_length: 100,
          temperature: 0.7
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].generated_text) {
        return {
          success: true,
          response: data[0].generated_text.replace(message, '').trim(),
          provider: 'HuggingFace',
          model: 'DialoGPT-medium'
        };
      }
    }
    
    throw new Error('HuggingFace API не ответил');
    
  } catch (error) {
    throw error;
  }
}

/**
 * Умный демо режим с контекстными ответами
 */
function getDemoAIResponse(message) {
  const msg = message.toLowerCase();
  
  // Контекстные ответы
  if (msg.includes('привет') || msg.includes('здравств')) {
    return {
      success: true,
      response: 'Привет! Я BOOOMERANGS AI ассистент. Как дела? Чем могу помочь?',
      provider: 'Demo AI',
      model: 'context-aware'
    };
  }
  
  if (msg.includes('как дела') || msg.includes('как поживаешь')) {
    return {
      success: true,
      response: 'У меня всё отлично! Работаю в режиме демонстрации. Готов помочь с вопросами или просто поболтать.',
      provider: 'Demo AI',
      model: 'context-aware'
    };
  }
  
  if (msg.includes('что умеешь') || msg.includes('возможности')) {
    return {
      success: true,
      response: 'Я могу отвечать на вопросы, поддерживать беседу, анализировать изображения и генерировать SVG графику. Сейчас работаю в демо режиме с ограниченными возможностями.',
      provider: 'Demo AI',
      model: 'context-aware'
    };
  }
  
  if (msg.includes('спасибо') || msg.includes('благодарю')) {
    return {
      success: true,
      response: 'Пожалуйста! Рад был помочь. Если есть ещё вопросы - обращайтесь!',
      provider: 'Demo AI',
      model: 'context-aware'
    };
  }
  
  if (msg.includes('пока') || msg.includes('до свидания')) {
    return {
      success: true,
      response: 'До свидания! Было приятно пообщаться. Возвращайтесь ещё!',
      provider: 'Demo AI',
      model: 'context-aware'
    };
  }
  
  // Общий ответ
  return {
    success: true,
    response: `Понял ваше сообщение: "${message}". В демо режиме мои возможности ограничены, но я стараюсь быть полезным! Для полноценной работы AI нужны API ключи от OpenAI или Anthropic.`,
    provider: 'Demo AI',
    model: 'context-aware'
  };
}

/**
 * Проверка доступности бесплатных провайдеров
 */
async function checkFreeProviders() {
  const results = [];
  
  for (const provider of FREE_AI_PROVIDERS) {
    try {
      if (provider.type === 'public') {
        const response = await fetch(provider.endpoint, {
          method: 'HEAD',
          timeout: 5000
        });
        results.push({
          name: provider.name,
          status: response.ok ? 'available' : 'unavailable',
          type: provider.type
        });
      } else {
        results.push({
          name: provider.name,
          status: 'local',
          type: provider.type
        });
      }
    } catch (error) {
      results.push({
        name: provider.name,
        status: 'error',
        error: error.message,
        type: provider.type
      });
    }
  }
  
  return results;
}

module.exports = {
  getFreeAIResponse,
  checkFreeProviders,
  FREE_AI_PROVIDERS
};