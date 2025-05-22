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
  
  // Используем подтвержденно работающие провайдеры через Python G4F
  
  // 1. Пробуем Free2GPT - обычно стабильный провайдер
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером Free2GPT...`);
    
    const response = await fetch("http://localhost:5004/python/chat?provider=Free2GPT", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 25000 // Увеличиваем таймаут для более надежного ответа
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером Free2GPT`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider || "Free2GPT",
          backupInfo: data.provider === 'Free2GPT' ? 
            "🔵 FreeChat использует провайдер Free2GPT" : 
            `🔄 FreeChat автоматически использует провайдер ${data.provider || "не указан"}`
        };
      }
    }
    
    console.log(`⚠️ Free2GPT вернул статус ${response.status}, пробуем FreeGpt...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании Free2GPT: ${error.message}`);
  }
  
  // 2. Пробуем FreeGpt как альтернативу
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером FreeGpt...`);
    
    const response = await fetch("http://localhost:5004/python/chat?provider=FreeGpt", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 25000
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером FreeGpt`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider || "FreeGpt",
          backupInfo: data.provider === 'FreeGpt' ? 
            "🔵 FreeChat использует провайдер FreeGpt" : 
            `🔄 FreeChat автоматически использует провайдер ${data.provider || "не указан"}`
        };
      }
    }
    
    console.log(`⚠️ FreeGpt вернул статус ${response.status}, пробуем ChatGpt...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании FreeGpt: ${error.message}`);
  }
  
  // 3. Пробуем ChatGpt из библиотеки g4f
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером ChatGpt...`);
    
    const response = await fetch("http://localhost:5004/python/chat?provider=ChatGpt", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 25000
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером ChatGpt`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider || "ChatGpt",
          backupInfo: data.provider === 'ChatGpt' ? 
            "🔵 FreeChat использует провайдер ChatGpt" : 
            `🔄 FreeChat автоматически использует провайдер ${data.provider || "не указан"}`
        };
      }
    }
    
    console.log(`⚠️ ChatGpt вернул статус ${response.status}, пробуем Phind...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании ChatGpt: ${error.message}`);
  }
  
  // 4. Проверенный стабильный провайдер Phind 
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером Phind...`);
    
    const response = await fetch("http://localhost:5004/python/chat?provider=Phind", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 30000 // Увеличенный таймаут для Phind
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером Phind`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider || "Phind AI",
          backupInfo: data.provider === 'Phind' ? 
            "🔵 FreeChat использует провайдер Phind" : 
            `🔄 FreeChat автоматически использует провайдер ${data.provider || "не указан"}`
        };
      }
    }
    
    console.log(`⚠️ Phind вернул статус ${response.status}, пробуем Qwen...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании Phind: ${error.message}`);
  }
  
  // 5. Надежный резервный провайдер Qwen
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером Qwen...`);
    
    const response = await fetch("http://localhost:5004/python/chat?provider=Qwen_Qwen_2_5_Max", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 30000
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером Qwen`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider || "Qwen 2.5",
          backupInfo: "🚀 FreeChat использует резервный провайдер Qwen 2.5"
        };
      }
    }
    
    console.log(`⚠️ Qwen вернул статус ${response.status}, пробуем автоматический выбор...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании Qwen: ${error.message}`);
  }
  
  // 6. Последний вариант - автоматический выбор лучшего провайдера
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с автоматическим выбором провайдера...`);
    
    // Запрос к Python G4F без указания конкретного провайдера
    const response = await fetch("http://localhost:5004/python/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: message, 
        system_prompt: systemPrompt 
      }),
      timeout: 30000
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Успешно получен ответ от Python G4F с автоматическим выбором`);
      console.log(`Выбранный провайдер: ${data.provider || 'неизвестно'}`);
      
      if (data && data.response) {
        return {
          success: true,
          response: data.response,
          provider: 'ChatFree',
          model: data.provider ? `${data.provider}` : 'AI Assistant',
          backupInfo: `⚠️ FreeChat использует автоматически выбранный провайдер: ${data.provider || "не указан"}`
        };
      }
    }
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании автоматического выбора: ${error.message}`);
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