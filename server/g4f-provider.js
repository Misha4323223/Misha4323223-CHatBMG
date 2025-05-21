// G4F провайдеры для бесплатного доступа к AI моделям
const fetch = require('node-fetch');

// Список доступных провайдеров, отсортированных по стабильности
const PROVIDERS = {
  QWEN: 'qwen',        // Самый стабильный
  DIFY: 'dify',        // Хорошая альтернатива
  GEMINI: 'gemini',    // Требует валидный API ключ
  DEEPAI: 'deepai',    // Часто ограничения
  AICHAT: 'aichat',    // Менее стабильный
  CHATGPT: 'chatgpt',  // Может быть нестабильным
  GIGA: 'gigachat'     // Требует российский номер телефона
};

// Порядок провайдеров от самых стабильных к менее стабильным
const PROVIDER_PRIORITY = [
  PROVIDERS.QWEN,
  PROVIDERS.DIFY,
  PROVIDERS.GEMINI,
  PROVIDERS.DEEPAI,
  PROVIDERS.AICHAT,
  PROVIDERS.CHATGPT
];

// Функция для получения списка доступных провайдеров в порядке приоритета
function getProviders() {
  return PROVIDER_PRIORITY;
}

// Функция для проверки доступности провайдера
async function checkProviderAvailability(provider) {
  try {
    // Проверка доступности через быстрый запрос
    switch (provider.toLowerCase()) {
      case PROVIDERS.QWEN:
        const qwenResponse = await fetch('https://api.lingyiwanwu.com/v1/models', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        return qwenResponse.ok;
        
      case PROVIDERS.DIFY:
        const difyResponse = await fetch('https://api.dify.ai/v1/health', {
          method: 'GET',
          timeout: 5000
        });
        return difyResponse.ok;
        
      default:
        // По умолчанию считаем доступными
        return true;
    }
  } catch (error) {
    console.error(`Провайдер ${provider} недоступен:`, error);
    return false;
  }
}

// Основная функция для получения ответа от модели с каскадным перебором провайдеров
async function getResponse(message, options = {}) {
  const {
    provider = null, // Если не указан, будем перебирать по приоритету
    model = null,
    temperature = 0.7,
    maxTokens = 800,
    maxRetries = 2
  } = options;

  // Валидация параметров
  if (!message) {
    throw new Error('Сообщение не может быть пустым');
  }

  // Если указан конкретный провайдер, используем только его
  if (provider) {
    return tryProviderWithRetries(provider, message, { model, temperature, maxTokens, maxRetries });
  }
  
  // Иначе перебираем провайдеры по приоритету
  const providersToTry = [...PROVIDER_PRIORITY]; // Копируем массив приоритетов
  let lastError = null;
  
  // Проходим по всем провайдерам в порядке приоритета
  for (const currentProvider of providersToTry) {
    try {
      // Проверяем доступность провайдера
      const isAvailable = await checkProviderAvailability(currentProvider);
      if (!isAvailable) {
        console.log(`Провайдер ${currentProvider} недоступен, пропускаем`);
        continue;
      }
      
      // Пробуем получить ответ от текущего провайдера
      console.log(`Пробуем получить ответ от провайдера ${currentProvider}...`);
      const result = await tryProviderWithRetries(currentProvider, message, { 
        model, 
        temperature, 
        maxTokens,
        maxRetries: 1 // Для каскадного перебора достаточно 1 попытки на провайдер
      });
      
      return result;
    } catch (err) {
      lastError = err;
      console.error(`Ошибка при использовании провайдера ${currentProvider}:`, err.message);
      // Продолжаем со следующим провайдером
    }
  }
  
  // Если ни один провайдер не сработал
  throw new Error(`Не удалось получить ответ от всех доступных провайдеров: ${lastError ? lastError.message : 'неизвестная ошибка'}`);
}

// Вспомогательная функция для попыток с ретраями на одном провайдере
async function tryProviderWithRetries(provider, message, options) {
  const { model, temperature, maxTokens, maxRetries } = options;
  
  // Получаем обработчик для указанного провайдера
  let handler;
  switch (provider.toLowerCase()) {
    case PROVIDERS.QWEN:
      handler = handleQwenProvider;
      break;
    case PROVIDERS.DIFY:
      handler = handleDifyProvider;
      break;
    case PROVIDERS.AICHAT:
      handler = handleAIChatProvider;
      break;
    case PROVIDERS.GEMINI:
      handler = handleGeminiProvider;
      break;
    case PROVIDERS.GIGA:
      handler = handleGigaChatProvider;
      break;
    case PROVIDERS.DEEPAI:
      handler = handleDeepAIProvider;
      break;
    default:
      // По умолчанию используем Qwen как самый стабильный провайдер
      console.warn(`Провайдер ${provider} не найден, используем Qwen`);
      handler = handleQwenProvider;
  }

  // Попытка получить ответ с ретраями
  let retries = 0;
  let error = null;

  while (retries < maxRetries) {
    try {
      const result = await handler(message, { model, temperature, maxTokens });
      return result;
    } catch (err) {
      error = err;
      console.error(`Ошибка при попытке ${retries + 1} для провайдера ${provider}:`, err.message);
      retries += 1;
      // Экспоненциальная задержка перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }

  throw new Error(`Не удалось получить ответ от провайдера ${provider} после ${maxRetries} попыток: ${error ? error.message : 'неизвестная ошибка'}`);
}

// Обработчик для модели Qwen от Alibaba
async function handleQwenProvider(message, options = {}) {
  try {
    const response = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        model: 'qwen-2.5-ultra-preview',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: 'Qwen',
      model: data.model || 'qwen-2.5-ultra-preview'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Qwen API:', error);
    throw error;
  }
}

// Обработчик для Dify.AI
async function handleDifyProvider(message, options = {}) {
  try {
    const response = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: message,
        user: "anonymous-" + Math.random().toString(36).substring(2, 10),
        response_mode: 'blocking',
        conversation_id: Math.random().toString(36).substring(2, 10)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dify API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.answer,
      provider: 'Dify',
      model: 'dify-gguf'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Dify API:', error);
    throw error;
  }
}

// Обработчик для AI Chat провайдера
async function handleAIChatProvider(message, options = {}) {
  // Здесь была бы имплементация для AI Chat провайдера
  // Поскольку в текущий момент этот провайдер не реализован, возвращаем ошибку
  throw new Error('AI Chat провайдер временно недоступен');
}

// Обработчик для Google Gemini
async function handleGeminiProvider(message, options = {}) {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 800,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.candidates[0].content.parts[0].text,
      provider: 'Gemini',
      model: 'gemini-pro'
    };
  } catch (error) {
    console.error('Ошибка при обращении к Gemini API:', error);
    throw error;
  }
}

// Обработчик для GigaChat
async function handleGigaChatProvider(message, options = {}) {
  try {
    // Здесь была бы имплементация для GigaChat
    // Возвращаем ошибку, так как требуется ключ API
    throw new Error('GigaChat требует API ключ');
  } catch (error) {
    console.error('Ошибка при обращении к GigaChat API:', error);
    throw error;
  }
}

// Обработчик для DeepAI
async function handleDeepAIProvider(message, options = {}) {
  try {
    const response = await fetch('https://api.deepai.org/api/text-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepAI API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      response: data.output,
      provider: 'DeepAI',
      model: 'deepai-text-generator'
    };
  } catch (error) {
    console.error('Ошибка при обращении к DeepAI API:', error);
    throw error;
  }
}

// Экспорт функций и констант
module.exports = {
  getResponse,
  getProviders,
  checkProviderAvailability,
  PROVIDERS
};