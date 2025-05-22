/**
 * Улучшенная интеграция FreeChat с несколькими провайдерами
 * Использует ChatFree в качестве основного провайдера с резервированием через Phind и Qwen
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;

// Импортируем дополнительные провайдеры для резервирования
const g4fProvider = require('./g4f-provider');
const pythonProviderRoutes = require('./python_provider_routes');

// Настройки API для ChatFree
const CHATFREE_API_URL = 'https://chatfree.org/api/chat/completions';
const BACKUP_URLS = [
  'https://chat-app-free.org/api/chat/completions',
  'https://free-api.cgs.dev/api/completions'
];

// Получение случайного пользовательского агента
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Задержка выполнения на указанное количество миллисекунд
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Получение ответа от ChatFree с улучшенной обработкой ошибок
 * @param {string} message - Текст запроса пользователя
 * @param {Object} options - Дополнительные опции
 * @returns {Promise<Object>} - Ответ от API
 */
async function getChatFreeEnhancedResponse(message, options = {}) {
  const model = options.model || 'gpt-3.5-turbo';
  const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте точно и по существу.';
  const temperature = options.temperature || 0.7;
  
  // Создаем запрос в формате ChatFree
  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    temperature: temperature,
    max_tokens: 1000,
    stream: false
  };
  
  // 1. Пробуем использовать основной ChatFree API
  try {
    console.log(`FreeChat Enhanced: Отправка запроса к основному API...`);
    
    const response = await fetch(CHATFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent()
      },
      body: JSON.stringify(requestBody),
      timeout: 15000 // 15 секунд таймаут
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.choices && data.choices.length && data.choices[0].message) {
        console.log(`✅ Успешно получен ответ от основного ChatFree API`);
        return {
          success: true,
          response: data.choices[0].message.content,
          provider: 'ChatFree',
          model: model
        };
      }
    }
    
    console.log(`⚠️ Основной ChatFree API вернул статус ${response.status}, пробуем резервные URL...`);
  } catch (error) {
    console.log(`⚠️ Ошибка основного ChatFree API: ${error.message}, пробуем резервные URL...`);
  }
  
  // 2. Пробуем использовать резервные URL для ChatFree
  for (const backupUrl of BACKUP_URLS) {
    try {
      console.log(`FreeChat Enhanced: Отправка запроса к резервному URL ${backupUrl}...`);
      
      const response = await fetch(backupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': getRandomUserAgent()
        },
        body: JSON.stringify(requestBody),
        timeout: 15000 // 15 секунд таймаут
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.choices && data.choices.length && data.choices[0].message) {
          console.log(`✅ Успешно получен ответ от резервного URL ${backupUrl}`);
          return {
            success: true,
            response: data.choices[0].message.content,
            provider: 'ChatFree',
            model: model
          };
        }
      }
      
      console.log(`⚠️ Резервный URL ${backupUrl} вернул статус ${response.status}`);
    } catch (error) {
      console.log(`⚠️ Ошибка резервного URL ${backupUrl}: ${error.message}`);
    }
    
    // Добавляем паузу перед следующей попыткой
    await delay(1000);
  }
  
  // 3. Если ChatFree и резервные URL недоступны, пробуем Phind через Python G4F
  try {
    console.log(`FreeChat Enhanced: Переключение на Phind через Python G4F...`);
    
    const phindResponse = await pythonProviderRoutes.callPythonAI(message, 'Phind');
    
    if (phindResponse) {
      console.log(`✅ Успешно получен ответ от Phind через Python G4F`);
      return {
        success: true,
        response: phindResponse,
        provider: 'Phind',
        model: 'Phind AI'
      };
    }
  } catch (phindError) {
    console.log(`⚠️ Ошибка при использовании Phind: ${phindError.message}`);
  }
  
  // 4. Если Phind недоступен, пробуем Qwen через Python G4F
  try {
    console.log(`FreeChat Enhanced: Переключение на Qwen через Python G4F...`);
    
    const qwenResponse = await pythonProviderRoutes.callPythonAI(message, 'Qwen_Qwen_2_5_Max');
    
    if (qwenResponse) {
      console.log(`✅ Успешно получен ответ от Qwen через Python G4F`);
      return {
        success: true,
        response: qwenResponse,
        provider: 'Qwen',
        model: 'Qwen-2.5-Max'
      };
    }
  } catch (qwenError) {
    console.log(`⚠️ Ошибка при использовании Qwen: ${qwenError.message}`);
  }
  
  // 5. Как последний вариант, используем G4F с автоматическим выбором провайдера
  try {
    console.log(`FreeChat Enhanced: Использование G4F с автоматическим выбором провайдера...`);
    
    const g4fResponse = await g4fProvider.getResponse(message);
    
    if (g4fResponse && g4fResponse.response) {
      console.log(`✅ Успешно получен ответ от G4F с провайдером ${g4fResponse.provider || 'Unknown'}`);
      return {
        success: true,
        response: g4fResponse.response,
        provider: g4fResponse.provider || 'G4F',
        model: g4fResponse.model || 'Unknown'
      };
    }
  } catch (g4fError) {
    console.log(`⚠️ Ошибка при использовании G4F: ${g4fError.message}`);
  }
  
  // Если все методы не сработали, возвращаем ошибку
  return {
    success: false,
    error: 'Не удалось получить ответ от всех доступных провайдеров',
    provider: 'FreeChat Enhanced',
    model: model
  };
}

// API маршрут
router.post('/chat', async (req, res) => {
  const { message, systemPrompt, model, temperature } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getChatFreeEnhancedResponse(message, {
      systemPrompt,
      model,
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

// Проверка доступности ChatFree API
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await checkChatFreeAvailability();
    
    res.json({
      success: true,
      status: isAvailable ? 'available' : 'unavailable'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Функция для проверки доступности ChatFree API
async function checkChatFreeAvailability() {
  try {
    const response = await fetch(CHATFREE_API_URL, {
      method: 'GET',
      headers: {
        'User-Agent': getRandomUserAgent()
      },
      timeout: 5000
    });
    
    return response.status < 500; // Считаем API доступным, если не возвращает ошибку сервера
  } catch (error) {
    console.error(`Ошибка проверки ChatFree API: ${error.message}`);
    return false;
  }
}

module.exports = router;
module.exports.getChatFreeEnhancedResponse = getChatFreeEnhancedResponse;
module.exports.checkChatFreeAvailability = checkChatFreeAvailability;