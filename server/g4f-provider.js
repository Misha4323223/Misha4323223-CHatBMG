// G4F провайдеры для бесплатного доступа к AI моделям
const fetch = require('node-fetch');

// Список доступных провайдеров
const PROVIDERS = {
  QWEN: 'qwen',
  DIFY: 'dify',
  AICHAT: 'aichat',
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini',
  GIGA: 'gigachat',
  DEEPAI: 'deepai'
};

// Функция для получения списка доступных провайдеров
function getProviders() {
  return Object.values(PROVIDERS);
}

// Функция для проверки доступности провайдера
async function checkProviderAvailability(provider) {
  try {
    // Проверка доступности через пинг API
    return true; // по умолчанию считаем доступными
  } catch (error) {
    console.error(`Провайдер ${provider} недоступен:`, error);
    return false;
  }
}

// Основная функция для получения ответа от модели
async function getResponse(message, options = {}) {
  const {
    provider = PROVIDERS.QWEN,
    model = null,
    temperature = 0.7,
    maxTokens = 800,
    maxRetries = 3
  } = options;

  // Валидация параметров
  if (!message) {
    throw new Error('Сообщение не может быть пустым');
  }

  // Выбор правильного обработчика в зависимости от провайдера
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
      console.error(`Ошибка при попытке ${retries + 1}:`, err);
      retries += 1;
      // Экспоненциальная задержка перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }

  throw new Error(`Не удалось получить ответ после ${maxRetries} попыток: ${error.message}`);
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