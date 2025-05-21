// Прямая интеграция с AI API (без использования g4f пакета)
const fetch = require('node-fetch').default;

// Набор рабочих API-провайдеров - обновленные провайдеры из списка G4F
const AI_PROVIDERS = {
  // FreeGPT API - настроен по списку G4F
  FREEGPT: {
    name: 'FreeGPT', 
    url: 'https://api.freegpt.ml/v1/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        model: "gemini-pro",
        messages: [{ role: "user", content: message }],
        temperature: 0.7
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от FreeGPT API');
    }
  },
  
  // Liaobots - без авторизации, сильный провайдер
  LIAOBOTS: {
    name: 'Liaobots',
    url: 'https://liaobots.work/api/chat',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.message && jsonResponse.message.content) {
        return jsonResponse.message.content;
      }
      throw new Error('Некорректный ответ от Liaobots');
    }
  },
  
  // You.com - без авторизации, Claude-модели
  YOUCOM: {
    name: 'You.com-AI',
    url: 'https://you.com/api/chat',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    },
    prepareRequest: (message) => {
      return {
        query: message,
        chat_model: "claude-3-sonnet",
        chat_history: []
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.response && jsonResponse.response.text) {
        return jsonResponse.response.text;
      }
      throw new Error('Некорректный ответ от You.com');
    }
  },
  
  // DeepInfraChat - бесплатные LLM модели
  DEEPINFRA: {
    name: 'DeepInfra',
    url: 'https://api.deepinfra.com/v1/openai/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json'
    },
    prepareRequest: (message) => {
      return {
        model: "llama-3.1-8b",
        messages: [{ role: "user", content: message }],
        temperature: 0.7,
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от DeepInfra');
    }
  },
  
  // Интеграция с Perplexity AI - дает доступ к текущей информации из интернета
  PERPLEXITY: {
    name: 'Perplexity',
    url: 'https://api.perplexity.ai/chat/completions',
    needsKey: true,
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    prepareRequest: (message) => {
      return {
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "Отвечай точно и кратко, используя актуальную информацию из интернета."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        top_p: 0.9,
        search_recency_filter: "month",
        stream: false
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        const content = jsonResponse.choices[0].message.content;
        const sources = jsonResponse.citations || [];
        
        // Добавляем источники, если они есть
        if (sources && sources.length > 0) {
          const sourcesText = "\n\n**Источники:**\n" + sources.slice(0, 3).map((src, i) => `${i+1}. ${src}`).join('\n');
          return content + sourcesText;
        }
        
        return content;
      }
      throw new Error('Некорректный ответ от Perplexity');
    }
  },
  
  // HuggingFace Inference API - бесплатный доступ к моделям
  HUGGINGFACE: {
    name: 'HuggingFace',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json'
    },
    prepareRequest: (message) => {
      return {
        inputs: message,
        parameters: {
          temperature: 0.7,
          max_new_tokens: 512
        }
      };
    },
    extractResponse: async (response) => {
      try {
        const jsonResponse = await response.json();
        if (jsonResponse && jsonResponse[0] && jsonResponse[0].generated_text) {
          return jsonResponse[0].generated_text;
        }
        throw new Error('Неправильный формат ответа');
      } catch (error) {
        throw new Error(`Ошибка при обработке ответа: ${error.message}`);
      }
    }
  },
  
  // FreeGPT4 - бесплатный API для доступа к моделям
  FREEGPT4: {
    name: 'FreeGPT4',
    url: 'https://freegpt4.org/api/generate',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Origin': 'https://freegpt4.org',
      'Referer': 'https://freegpt4.org/'
    },
    prepareRequest: (message) => {
      return {
        prompt: message,
        model: "meta/llama-3-8b-instruct",
        max_tokens: 800,
        temperature: 0.7
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.response) {
        return jsonResponse.response;
      }
      throw new Error('Некорректный ответ от FreeGPT4');
    }
  },
  
  // Альтернативный сервис для демо-режима
  DEMO: {
    name: 'BOOOMERANGS-Demo',
    url: 'http://localhost:5000', // Фиктивный URL, который не будет использоваться
    needsKey: false,
    prepareRequest: (message) => message,
    extractResponse: async (response) => {
      return response;
    }
  }
}

// Набор предустановленных ответов для демо-режима
const DEMO_RESPONSES = [
  {
    pattern: /привет|здравствуй|hello|hi/i,
    responses: [
      "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?",
      "Здравствуйте! Я ассистент BOOOMERANGS. Готов ответить на вопросы о нашем сервисе или просто поболтать!",
      "Добрый день! BOOOMERANGS AI на связи. Как я могу вам помочь?"
    ]
  },
  {
    pattern: /что такое booomerangs|расскажи о booomerangs|booomerangs это/i,
    responses: [
      "BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом, который объединяет возможности текстовых AI-моделей и генерации изображений. С BOOOMERANGS вы можете бесплатно использовать функции, аналогичные ChatGPT и DALL-E, без необходимости платить за подписки или покупать API ключи. Наше приложение работает напрямую в браузере и оптимизировано для использования на мобильных устройствах.",
      "BOOOMERANGS - это мультимодальная AI-платформа, предоставляющая доступ к генерации текста и изображений без необходимости покупки API ключей. Мы используем свободные AI провайдеры, обеспечиваем постоянное переключение между ними для стабильной работы и предлагаем удобный интерфейс для всех устройств."
    ]
  },
  {
    pattern: /что ты умеешь|возможности|функции/i,
    responses: [
      "Я умею многое! Вот мои основные возможности:\n\n1. Отвечать на ваши вопросы с использованием современных AI-моделей\n2. Генерировать текстовые описания и контент\n3. Помогать с решением проблем\n4. Давать рекомендации\n\nКроме того, BOOOMERANGS приложение позволяет:\n• Создавать изображения по текстовому описанию\n• Конвертировать изображения в SVG формат\n• Использовать различные AI-провайдеры для получения разнообразных ответов"
    ]
  },
  {
    pattern: /генер.*изображен|созда.*картин|картинк|изображен|рисун|как создать изображение|иллюстрац/i,
    responses: [
      "Для генерации изображений в BOOOMERANGS:\n\n1. Перейдите на вкладку 'Генератор Изображений'\n2. Введите текстовое описание изображения, которое хотите создать\n3. Нажмите кнопку 'Сгенерировать изображение'\n4. Дождитесь результата и используйте полученное изображение\n5. При желании конвертируйте его в SVG формат, нажав соответствующую кнопку\n\nСоветы для лучших результатов:\n• Давайте подробные описания\n• Указывайте стиль (акварель, фотореализм, аниме и т.д.)\n• Используйте слова, описывающие настроение и атмосферу"
    ]
  },
  {
    pattern: /технолог|как работает|api|llm|gpt|модел|нейросет|g4f|провайдер/i,
    responses: [
      "BOOOMERANGS использует различные бесплатные AI-провайдеры, работающие через JavaScript и Python интерфейсы. Для генерации изображений применяются свободные API, а для получения текстов - различные LLM модели, доступные без API ключей. Наша система автоматически переключается между провайдерами для обеспечения стабильной работы.",
      "В основе BOOOMERANGS лежат современные AI-технологии с прямым доступом к провайдерам через HTTP запросы. Мы используем You.com, Bing и другие сервисы для обработки текстовых запросов, а также API для генерации изображений с последующей векторизацией через алгоритмы трассировки."
    ]
  }
];

// Функция для получения ответа из демо-режима
function getDemoResponse(message) {
  // Ищем подходящий паттерн
  for (const template of DEMO_RESPONSES) {
    if (template.pattern.test(message)) {
      // Выбираем случайный ответ из доступных
      const randomIndex = Math.floor(Math.random() * template.responses.length);
      return template.responses[randomIndex];
    }
  }
  
  // Общий ответ, если ни один паттерн не подошел
  return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!";
}

// Функция для получения ответа от провайдера с таймаутом
async function getProviderResponseWithTimeout(providerKey, message, timeoutMs = 8000) {
  try {
    return await Promise.race([
      getProviderResponse(providerKey, message),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Таймаут запроса к ${providerKey} (${timeoutMs}мс)`)), timeoutMs)
      )
    ]);
  } catch (error) {
    console.error(`Ошибка получения ответа от ${providerKey}:`, error.message);
    throw error;
  }
}

// Функция для попытки получения ответа от провайдера с обработкой ошибок
async function tryProvider(providerKey, message, options = {}) {
  // Проверка существования провайдера
  if (!AI_PROVIDERS[providerKey]) {
    console.log(`Провайдер ${providerKey} не найден`);
    return null;
  }
  
  const provider = AI_PROVIDERS[providerKey];
  console.log(`Попытка использования провайдера ${provider.name}...`);
  
  // Специальная обработка для демо-провайдера
  if (providerKey === 'DEMO') {
    console.log('Использую демо-режим напрямую');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Проверка наличия API ключа для провайдеров, которые его требуют
  if (provider.needsKey) {
    const apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.log(`❌ ${provider.name} требует API ключ, но он не предоставлен`);
      return null;
    }
  }
  
  try {
    // Подготовка запроса
    const requestData = provider.prepareRequest(message);
    
    // Подготовка заголовков с учетом API ключа
    let headers;
    if (provider.needsKey && typeof provider.headers === 'function') {
      const apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY;
      headers = provider.headers(apiKey);
    } else {
      headers = provider.headers || { 'Content-Type': 'application/json' };
    }
    
    // Выполнение запроса
    const response = await fetch(provider.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });
    
    // Проверка успешности запроса
    if (!response.ok) {
      throw new Error(`Статус ответа: ${response.status} ${response.statusText}`);
    }
    
    // Извлечение ответа
    const responseText = await provider.extractResponse(response);
    
    // Проверка на пустой или некорректный ответ
    if (!responseText || responseText.trim() === '') {
      throw new Error('Получен пустой ответ');
    }
    
    // Успешный ответ
    console.log(`✅ ${provider.name} успешно ответил`);
    return {
      response: responseText,
      provider: provider.name,
      model: provider.name === 'Perplexity' ? 'llama-3.1-sonar' : 'external-api'
    };
  } catch (error) {
    console.error(`❌ ${provider.name} не отвечает:`, error.message);
    return null; // Возвращаем null в случае ошибки
  }
}

// Основная функция для получения ответа от конкретного провайдера
async function getProviderResponse(providerKey, message) {
  // Если запрошен демо-режим, возвращаем предустановленный ответ
  if (providerKey === 'DEMO' || !AI_PROVIDERS[providerKey]) {
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  const provider = AI_PROVIDERS[providerKey];
  console.log(`Отправка запроса к провайдеру ${provider.name}...`);
  
  try {
    // Используем улучшенную функцию tryProvider
    const result = await tryProvider(providerKey, message);
    
    if (result) {
      return result;
    }
    
    // Если результат не получен, выбрасываем ошибку
    throw new Error(`Не удалось получить ответ от ${provider.name}`);
  } catch (error) {
    console.error(`Ошибка при обращении к провайдеру ${provider.name}:`, error.message);
    throw error;
  }
}

// Функция для каскадного перебора провайдеров
async function getChatResponse(message, options = {}) {
  const { specificProvider = null, timeout = 10000 } = options;
  
  // Если запрошен демо-режим, сразу возвращаем демо-ответ
  if (specificProvider === 'DEMO') {
    console.log('Использую демо-режим по запросу');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Проверка конкретного запрошенного провайдера
  if (specificProvider && AI_PROVIDERS[specificProvider] && specificProvider !== 'DEMO') {
    console.log(`Пробуем получить ответ от указанного провайдера ${specificProvider}...`);
    try {
      // Для Yew-Bot провайдера, который часто недоступен, сокращаем таймаут
      const providerTimeout = specificProvider === 'YOU' ? Math.min(5000, timeout) : timeout;
      
      // Используем tryProvider с таймаутом для конкретного провайдера
      const result = await Promise.race([
        tryProvider(specificProvider, message, options),
        new Promise((resolve) => setTimeout(() => resolve(null), providerTimeout))
      ]);
      
      if (result) {
        console.log(`✅ Успешно получен ответ от ${result.provider}`);
        return result;
      }
      
      console.log(`❌ Указанный провайдер ${specificProvider} не ответил в течение ${providerTimeout}мс`);
      // Продолжаем со следующими провайдерами
    } catch (error) {
      console.log(`❌ Указанный провайдер ${specificProvider} недоступен:`, error.message);
      // Продолжаем со следующими провайдерами
    }
  }
  
  // Проверяем, хотим ли мы сразу использовать демо-режим (для тестирования)
  if (options.forceDemo === true) {
    console.log('Использую демо-режим по запросу (forceDemo=true)');
    return {
      response: getDemoResponse(message),
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Специальная обработка для демо-провайдера (избегаем сетевых запросов)
  const demoResponse = {
    response: getDemoResponse(message),
    provider: 'BOOOMERANGS-Demo',
    model: 'demo-mode'
  };
  
  // Попытка использовать "You" провайдер с коротким таймаутом
  console.log('Пробуем получить ответ от провайдера YOU...');
  try {
    const youResult = await Promise.race([
      tryProvider('YOU', message, options),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000)) // Короткий таймаут для YOU
    ]);
    
    if (youResult) {
      console.log(`✅ Успешно получен ответ от ${youResult.provider}`);
      return youResult;
    }
    
    console.log('❌ Провайдер YOU не ответил в течение 5000мс');
  } catch (error) {
    console.log('❌ Ошибка при использовании провайдера YOU:', error.message);
  }
  
  // Если все провайдеры недоступны, возвращаем демо-ответ
  console.log('⚠️ Все провайдеры недоступны, используем демо-режим');
  return demoResponse;
}

// Экспортируем функции для использования
module.exports = {
  getChatResponse,
  getDemoResponse,
  tryProvider,
  AI_PROVIDERS
};