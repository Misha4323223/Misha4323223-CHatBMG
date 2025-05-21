// Прямая интеграция с AI API (без использования g4f пакета)
const fetch = require('node-fetch').default;

// Набор рабочих API-провайдеров
const AI_PROVIDERS = {
  // You.com API - более простой и стабильный вариант через yew-bot
  YOU: {
    name: 'Yew-Bot', 
    url: 'https://api.yewbot.app/v1/chat/completions',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        model: "yew-llama3:8b",
        messages: [{ role: "user", content: message }],
        temperature: 0.7
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.choices && jsonResponse.choices.length > 0) {
        return jsonResponse.choices[0].message.content;
      }
      throw new Error('Некорректный ответ от Yew-Bot');
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
        search_domain_filter: [],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "month",
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
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
  
  // Интеграция с Bing 
  BING: {
    name: 'Bing',
    url: 'https://www.bing.com/turing/conversation/create',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.bing.com/search?q=Bing+AI'
    },
    prepareRequest: (message) => {
      return {
        messages: [
          {
            author: 'user',
            content: message
          }
        ],
        invocationId: '1',
        conversationSignature: '',
        participant: { id: '' },
        conversationId: ''
      };
    },
    extractResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Ошибка Bing API: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      // Извлечение ответа из текста (может потребоваться адаптация)
      const match = text.match(/"text":"([^"]+)"/);
      if (match && match[1]) {
        return match[1].replace(/\\n/g, '\n');
      }
      throw new Error('Не удалось получить ответ от Bing');
    }
  },
  
  // Альтернативный сервис для демо-режима
  DEMO: {
    name: 'BOOOMERANGS-Demo',
    url: 'internal',
    needsKey: false,
    prepareRequest: (message) => message,
    extractResponse: async (response) => {
      return response;
    }
  }
};

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
  
  // Если указан конкретный провайдер, используем только его
  if (specificProvider && AI_PROVIDERS[specificProvider]) {
    try {
      // Используем tryProvider вместо getProviderResponseWithTimeout для надежности
      const result = await Promise.race([
        tryProvider(specificProvider, message),
        new Promise((resolve) => setTimeout(() => resolve(null), timeout))
      ]);
      
      if (result) {
        console.log(`Успешно получен ответ от указанного провайдера ${specificProvider}`);
        return result;
      }
      
      console.log(`Указанный провайдер ${specificProvider} не ответил в течение ${timeout}мс`);
      // Продолжаем выполнение и пробуем другие провайдеры
    } catch (error) {
      console.log(`Указанный провайдер ${specificProvider} недоступен:`, error.message);
      // Продолжаем выполнение и пробуем другие провайдеры
    }
  }
  
  // Порядок перебора провайдеров (от более надежных к менее)
  const providerPriority = ['YOU', 'DEMO'];
  
  // Перебираем все провайдеры до первого успешного
  for (const providerKey of providerPriority) {
    console.log(`Пробуем получить ответ от провайдера ${providerKey}...`);
    
    // Используем tryProvider с таймаутом
    const result = await Promise.race([
      tryProvider(providerKey, message),
      new Promise((resolve) => setTimeout(() => resolve(null), timeout))
    ]);
    
    if (result) {
      console.log(`✅ Успешно получен ответ от ${result.provider}`);
      return result;
    }
    
    console.log(`❌ Провайдер ${providerKey} не ответил в течение ${timeout}мс`);
    // Продолжаем со следующим провайдером
  }
  
  // Если все провайдеры не ответили, возвращаем демо-ответ
  console.log('⚠️ Все провайдеры недоступны, используем демо-режим');
  return {
    response: getDemoResponse(message),
    provider: 'BOOOMERANGS-Demo',
    model: 'demo-mode',
    error: 'Все провайдеры недоступны или не ответили в срок'
  };
}

// Экспортируем функции для использования
module.exports = {
  getChatResponse,
  getDemoResponse,
  AI_PROVIDERS
};