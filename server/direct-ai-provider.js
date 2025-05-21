// Прямая интеграция с AI API (без использования g4f пакета)
const fetch = require('node-fetch').default;

// Набор рабочих API-провайдеров
const AI_PROVIDERS = {
  // You.com API
  YOU: {
    name: 'You.com', 
    url: 'https://you.com/api/streamingSearch',
    needsKey: false,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    prepareRequest: (message) => {
      return {
        q: message,
        page: 1,
        count: 10,
        safeSearch: 'Off',
        onShoppingPage: false,
        mkt: '',
        responseFilter: 'WebPages,Translations,TimeZone,Computation,RelatedSearches',
        domain: 'youchat',
        queryTraceId: null,
        chat: { messages: [] },
        chatId: null,
        options: []
      };
    },
    extractResponse: async (response) => {
      const jsonResponse = await response.json();
      if (jsonResponse && jsonResponse.youChatToken && jsonResponse.youChatToken.length > 0) {
        return jsonResponse.youChatToken.join('');
      }
      throw new Error('Некорректный ответ от You.com');
    }
  },
  
  // Интеграция с Bing через Устар
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
    // Подготовка запроса
    const requestData = provider.prepareRequest(message);
    
    // Выполнение запроса
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    // Извлечение ответа
    const responseText = await provider.extractResponse(response);
    
    // Возвращаем результат
    return {
      response: responseText,
      provider: provider.name,
      model: 'external-api'
    };
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
      return await getProviderResponseWithTimeout(specificProvider, message, timeout);
    } catch (error) {
      console.log(`Указанный провайдер ${specificProvider} недоступен:`, error.message);
      // В случае ошибки используем демо-режим
      return {
        response: getDemoResponse(message),
        provider: 'BOOOMERANGS-Demo',
        model: 'demo-mode',
        error: error.message
      };
    }
  }
  
  // Порядок перебора провайдеров (от более надежных к менее)
  const providerPriority = ['YOU', 'BING'];
  
  // Перебираем все провайдеры до первого успешного
  let lastError = null;
  
  for (const providerKey of providerPriority) {
    try {
      console.log(`Пробуем получить ответ от провайдера ${providerKey}...`);
      const result = await getProviderResponseWithTimeout(providerKey, message, timeout);
      console.log(`Успешно получен ответ от ${result.provider}`);
      return result;
    } catch (error) {
      console.error(`Ошибка при использовании провайдера ${providerKey}:`, error.message);
      lastError = error;
      // Продолжаем со следующим провайдером
    }
  }
  
  // Если все провайдеры не ответили, возвращаем демо-ответ
  console.log('Все провайдеры недоступны, используем демо-режим');
  return {
    response: getDemoResponse(message),
    provider: 'BOOOMERANGS-Demo',
    model: 'demo-mode',
    error: lastError ? lastError.message : 'Все провайдеры недоступны'
  };
}

// Экспортируем функции для использования
module.exports = {
  getChatResponse,
  getDemoResponse,
  AI_PROVIDERS
};