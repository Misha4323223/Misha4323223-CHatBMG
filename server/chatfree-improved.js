/**
 * Улучшенная версия ChatFree провайдера с дополнительными возможностями
 * и улучшенной обработкой ошибок
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;
const https = require('https');

// Настройки ChatFree
const CHATFREE_CONFIG = {
  // Основной API URL
  apiUrl: 'https://chatfree.org/api/chat/completions',
  
  // Резервные URL на случай, если основной недоступен
  backupUrls: [
    'https://chatfree.one/api/chat/completions',
    'https://chat-free.onrender.com/api/chat/completions'
  ],
  
  // Поддерживаемые модели
  models: {
    default: 'gpt-3.5-turbo',
    gpt35: 'gpt-3.5-turbo',
    gpt4: 'gpt-4',
    gpt4o: 'gpt-4o'
  },
  
  // Настройки запросов
  requestConfig: {
    timeout: 25000, // 25 секунд
    retries: 3,
    retryDelay: 1000, // 1 секунда между повторами
    maxRetryDelay: 5000, // максимальная задержка между повторами
    agent: new https.Agent({
      rejectUnauthorized: false, // Для обхода проблем с SSL в некоторых случаях
      timeout: 20000
    })
  },
  
  // Пользовательские агенты для имитации браузера
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
  ]
};

/**
 * Получение случайного пользовательского агента
 * @returns {string} - Случайный User-Agent заголовок
 */
function getRandomUserAgent() {
  const agents = CHATFREE_CONFIG.userAgents;
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Задержка выполнения на указанное количество миллисекунд
 * @param {number} ms - Миллисекунды для задержки
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Создает заголовки для имитации браузера
 * @returns {Object} Заголовки HTTP запроса
 */
function getBrowserLikeHeaders() {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Content-Type': 'application/json',
    'User-Agent': getRandomUserAgent(),
    'Origin': 'https://chatfree.org',
    'Referer': 'https://chatfree.org/',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  };
}

/**
 * Основная функция для получения ответа от ChatFree с обработкой ошибок и повторами
 * @param {string} message - Текст запроса пользователя
 * @param {Object} options - Дополнительные опции
 * @returns {Promise<Object>} - Ответ от API
 */
async function getChatFreeResponse(message, options = {}) {
  const model = options.model || CHATFREE_CONFIG.models.default;
  const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте точно и по существу.';
  const temperature = options.temperature || 0.7;
  
  // Создаем тело запроса
  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    temperature: temperature,
    max_tokens: 2048,
    stream: false
  };
  
  let lastError = null;
  let attemptCount = 0;
  const maxAttempts = CHATFREE_CONFIG.requestConfig.retries;
  
  // Пробуем все доступные URL
  const allUrls = [CHATFREE_CONFIG.apiUrl, ...CHATFREE_CONFIG.backupUrls];
  
  for (const apiUrl of allUrls) {
    attemptCount = 0;
    
    while (attemptCount < maxAttempts) {
      try {
        console.log(`ChatFree: Попытка #${attemptCount + 1} отправки запроса к ${apiUrl}...`);
        
        // Увеличиваем задержку с каждой попыткой (экспоненциальная задержка)
        if (attemptCount > 0) {
          const retryDelay = Math.min(
            CHATFREE_CONFIG.requestConfig.retryDelay * Math.pow(2, attemptCount - 1),
            CHATFREE_CONFIG.requestConfig.maxRetryDelay
          );
          console.log(`ChatFree: Ждем ${retryDelay}мс перед повторной попыткой...`);
          await delay(retryDelay);
        }
        
        // Отправляем запрос с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CHATFREE_CONFIG.requestConfig.timeout);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: getBrowserLikeHeaders(),
          body: JSON.stringify(requestBody),
          agent: CHATFREE_CONFIG.requestConfig.agent,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Статус ответа: ${response.status} ${response.statusText}`);
        }
        
        // Парсим ответ
        const data = await response.json();
        
        // Проверяем структуру ответа
        if (!data.choices || !data.choices.length || !data.choices[0].message) {
          throw new Error('Некорректный формат ответа от API');
        }
        
        const content = data.choices[0].message.content;
        console.log(`ChatFree: Успешно получен ответ от ${apiUrl} (${content.length} символов)`);
        
        return {
          success: true,
          response: content,
          provider: "ChatFree",
          model: model
        };
      } catch (error) {
        console.error(`ChatFree Error (${apiUrl}, попытка #${attemptCount + 1}): ${error.message}`);
        lastError = error;
        attemptCount++;
      }
    }
  }
  
  // Если все попытки не удались, возвращаем ошибку
  return {
    success: false,
    error: lastError ? `Ошибка ChatFree: ${lastError.message}` : 'Не удалось получить ответ от ChatFree',
    provider: "ChatFree",
    model: model
  };
}

/**
 * Проверка доступности ChatFree API
 * @returns {Promise<boolean>} Доступен ли API
 */
async function checkChatFreeAvailability() {
  try {
    const simplePrompt = "Привет!";
    const response = await getChatFreeResponse(simplePrompt, { 
      temperature: 0.3,
      max_tokens: 50
    });
    
    return response.success;
  } catch (error) {
    console.error(`Ошибка при проверке доступности ChatFree: ${error.message}`);
    return false;
  }
}

// API маршрут для проверки состояния ChatFree
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await checkChatFreeAvailability();
    
    res.json({
      success: true,
      available: isAvailable,
      timestamp: new Date().toISOString(),
      message: isAvailable ? 'ChatFree доступен' : 'ChatFree недоступен'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: `Ошибка при проверке ChatFree: ${error.message}`
    });
  }
});

// API маршрут для взаимодействия с ChatFree
router.post('/chat', async (req, res) => {
  const { message, model, systemPrompt, temperature } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getChatFreeResponse(message, {
      model: model || CHATFREE_CONFIG.models.default,
      systemPrompt,
      temperature
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка обработки запроса: ${error.message}`
    });
  }
});

// API маршрут для получения доступных моделей
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: CHATFREE_CONFIG.models
  });
});

module.exports = router;
module.exports.getChatFreeResponse = getChatFreeResponse;
module.exports.checkChatFreeAvailability = checkChatFreeAvailability;