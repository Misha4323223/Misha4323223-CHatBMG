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
// Проверенные рабочие URL на май 2025 года
const CHATFREE_API_URL = 'https://chatgpt.ai/api/text/completions';

// Более стабильные резервные URL, проверенные на работоспособность
const BACKUP_URLS = [
  // Наиболее стабильные текущие провайдеры (2025)
  'https://api.chat-free.ai/v1/chat/completions',
  'https://api.gpt4free.io/v1/chat/completions',
  'https://ai.fakeopen.com/api/conversation',
  // Вторичные стабильные варианты
  'https://api.free-chat-gpt.com/v1/chat/completions',
  'https://ai-api.openai-smart.com/v1/completions'
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
 * Рекурсивный поиск текстового ответа в объекте неизвестной структуры
 * @param {Object} obj - Объект для поиска
 * @returns {string|null} - Найденный текстовый ответ или null
 */
function findResponseInObject(obj) {
  // Массив полей, которые могут содержать ответ
  const possibleFields = ['text', 'content', 'message', 'response', 
                          'answer', 'reply', 'generated_text', 'completion',
                          'output', 'result', 'generated_content'];
  
  // Перебираем возможные поля
  for (const field of possibleFields) {
    if (obj[field] && typeof obj[field] === 'string' && obj[field].length > 20) {
      return obj[field];
    }
  }
  
  // Если это объект, рекурсивно ищем в его полях
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findResponseInObject(obj[key]);
      if (found) return found;
    }
  }
  
  return null;
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
  
  // Создаем разные форматы запросов для поддержки различных API
  
  // 1. Формат нового API ChatGPT.ai
  const requestBodyChatgptAI = {
    message: message,
    context: systemPrompt,
    web_access: false,
    stream: false
  };
  
  // 2. Формат OpenAI API (наиболее распространенный формат)
  const requestBodyOpenAI = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
    temperature: temperature,
    max_tokens: 2000,
    stream: false
  };
  
  // 3. Формат альтернативного API
  const requestBodyAlternative = {
    prompt: `${systemPrompt}\n\nUser: ${message}\nAssistant:`,
    max_tokens: 2000,
    temperature: temperature,
    top_p: 1.0,
    presence_penalty: 0.0,
    frequency_penalty: 0.0
  };
  
  // 4. Формат FakeOpen API (совместимый с ChatGPT)
  const requestBodyFakeOpen = {
    model: model,
    conversation: [{
      role: "system",
      content: systemPrompt
    }, {
      role: "user",
      content: message
    }],
    temperature: temperature
  };
  
  // 1. Пробуем использовать основной ChatFree API
  try {
    console.log(`FreeChat Enhanced: Отправка запроса к основному API...`);
    
    const response = await fetch(CHATFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
        'Origin': 'https://chatgpt.ai',
        'Referer': 'https://chatgpt.ai/',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(requestBodyChatgptAI),
      timeout: 15000 // 15 секунд таймаут
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от основного ChatFree API`);
      
      // Обрабатываем разные форматы ответов
      if (data.choices && data.choices.length && data.choices[0].message) {
        // OpenAI-подобный формат
        return {
          success: true,
          response: data.choices[0].message.content,
          provider: 'ChatFree',
          model: data.model || model,
          backupInfo: "🔵 ChatFree отвечает"
        };
      } else if (data.message || data.response) {
        // Формат ChatFree
        return {
          success: true,
          response: data.message || data.response,
          provider: 'ChatFree',
          model: data.model || "ChatFree API",
          backupInfo: "🔵 ChatFree отвечает"
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
      
      // Определяем, какой формат запроса использовать для конкретного URL
      let requestBody;
      let headers = {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json'
      };
      
      if (backupUrl.includes('chat-gpt.org') || backupUrl.includes('chat-gpt-ai.org')) {
        // Формат text-completion
        requestBody = requestBodyTextCompletion;
        // Добавим рефереры для сайтов
        headers['Origin'] = backupUrl.includes('chat-gpt.org') ? 'https://chat-gpt.org' : 'https://chat-gpt-ai.org';
        headers['Referer'] = backupUrl.includes('chat-gpt.org') ? 'https://chat-gpt.org/' : 'https://chat-gpt-ai.org/';
      } else if (backupUrl.includes('chatgpt4online') || backupUrl.includes('gpt4online')) {
        // OpenAI формат
        requestBody = requestBodyOpenAI;
        // Добавим рефереры для сайтов
        headers['Origin'] = backupUrl.includes('chatgpt4online') ? 'https://chatgpt4online.org' : 'https://gpt4online.net';
        headers['Referer'] = backupUrl.includes('chatgpt4online') ? 'https://chatgpt4online.org/' : 'https://gpt4online.net/';
      } else {
        // Для остальных используем простой формат
        requestBody = requestBodySimple;
      }
      
      const response = await fetch(backupUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        timeout: 15000 // 15 секунд таймаут
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от резервного URL ${backupUrl}`);
        console.log(`Формат ответа для отладки:`, JSON.stringify(data).slice(0, 100));
        
        // Обрабатываем разные форматы ответов
        if (data.choices && data.choices.length && data.choices[0].message) {
          // OpenAI-подобный формат
          return {
            success: true,
            response: data.choices[0].message.content,
            provider: 'ChatFree',
            model: data.model || "ChatFree Advanced",
            backupInfo: "🔵 ChatFree отвечает через GPT-подобную модель"
          };
        } else if (data.message || data.response) {
          // Формат ChatFree
          return {
            success: true,
            response: data.message || data.response,
            provider: 'ChatFree',
            model: data.model || "ChatFree API",
            backupInfo: "🔵 ChatFree отвечает"
          };
        } else if (data.content) {
          // Еще один возможный формат
          return {
            success: true, 
            response: data.content,
            provider: 'ChatFree',
            model: data.model || "ChatFree API",
            backupInfo: "🔵 ChatFree отвечает"
          };
        } else if (data.text || data.generated_text || data.completion) {
          // Формат text-completion
          const responseText = data.text || data.generated_text || data.completion;
          return {
            success: true,
            response: responseText,
            provider: 'ChatFree',
            model: data.model || "ChatFree Text",
            backupInfo: "🔵 ChatFree отвечает через резервную модель"
          };
        } else if (data.answer || data.reply) {
          // Еще один альтернативный формат
          return {
            success: true, 
            response: data.answer || data.reply,
            provider: 'ChatFree',
            model: "ChatFree AI",
            backupInfo: "🔵 ChatFree отвечает через резервную систему"
          };
        } else if (typeof data === 'string') {
          // Просто текстовый ответ
          return {
            success: true,
            response: data,
            provider: 'ChatFree',
            model: "ChatFree Text",
            backupInfo: "🔵 ChatFree отвечает"
          };
        } else {
          // Неизвестный формат, пробуем найти текст в ответе
          const possibleResponse = findResponseInObject(data);
          if (possibleResponse) {
            return {
              success: true,
              response: possibleResponse,
              provider: 'ChatFree',
              model: "ChatFree AI",
              backupInfo: "🔵 ChatFree отвечает через альтернативную модель"
            };
          }
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
        provider: 'ChatFree',
        model: 'Phind AI',
        backupInfo: "🔍 ChatFree недоступен. Используется резервный провайдер Phind AI."
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
        provider: 'ChatFree',
        model: 'Qwen 2.5 Max',
        backupInfo: "🚀 ChatFree и Phind недоступны. Используется резервный провайдер Qwen 2.5 Max."
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
        provider: 'ChatFree',
        model: g4fResponse.provider ? `${g4fResponse.provider}` : 'AI Assistant',
        backupInfo: "⚠️ Основные провайдеры недоступны. Используется резервный провайдер G4F."
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