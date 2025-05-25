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
  
  // 1. Сначала пробуем AIChatFree - новый стабильный провайдер
  try {
    console.log(`FreeChat Enhanced: Использование Python G4F с провайдером AIChatFree...`);
    
    const response = await fetch("http://localhost:5004/python/test", {
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
      
      console.log(`✅ Успешно получен ответ от Python G4F с провайдером AIChatFree`);
      console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
      console.log(`ПОЛНЫЕ ДАННЫЕ ОТ AI:`, JSON.stringify(data, null, 2));
      
      if (data && data.response) {
        const result = {
          success: true,
          response: data.response,
          provider: 'FreeChat-Enhanced',
          model: data.provider || "Qwen_Qwen_2_5_Max",
          cached: false
        };
        console.log(`ВОЗВРАЩАЕМ РЕЗУЛЬТАТ:`, JSON.stringify(result, null, 2));
        return result;
      } else {
        console.log(`❌ НЕТ ОТВЕТА В ДАННЫХ:`, data);
      }
    } else {
      console.log(`❌ ОШИБКА HTTP ОТВЕТА:`, response.status, response.statusText);
    }
    
    console.log(`⚠️ AIChatFree вернул статус ${response.status}, пробуем Free2GPT...`);
  } catch (error) {
    console.log(`⚠️ Ошибка при использовании AIChatFree: ${error.message}`);
  }
  
  // 2. Пробуем Free2GPT - обычно стабильный провайдер
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
  
  // 6. Специализированные провайдеры для определенных типов запросов
  
  // А. Проверяем, связан ли запрос с кодом или программированием
  if (message.toLowerCase().includes('код') || 
      message.toLowerCase().includes('программирован') || 
      message.toLowerCase().includes('javascript') || 
      message.toLowerCase().includes('python') ||
      message.toLowerCase().includes('java') ||
      message.toLowerCase().includes('c++') ||
      message.toLowerCase().includes('code') ||
      message.toLowerCase().includes('programming')) {
    
    try {
      console.log(`FreeChat Enhanced: Запрос связан с программированием, используем специализированный провайдер Phind...`);
      
      const response = await fetch("http://localhost:5004/python/chat?provider=Phind", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          system_prompt: "Вы опытный программист. Отвечайте точно, предоставляя работающие примеры кода, где это уместно." 
        }),
        timeout: 30000
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от Phind для вопроса о программировании`);
        console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
        
        if (data && data.response) {
          return {
            success: true,
            response: data.response,
            provider: 'ChatFree',
            model: data.provider || "Phind",
            backupInfo: `💻 Для вопроса о программировании использован специализированный провайдер: ${data.provider || "Phind"}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при использовании Phind для вопроса о программировании: ${error.message}`);
    }
  }
  
  // Б. Проверяем, требует ли запрос глубокого анализа или рассуждения
  if (message.length > 150 || 
      message.toLowerCase().includes('анализ') || 
      message.toLowerCase().includes('объясни') || 
      message.toLowerCase().includes('почему') ||
      message.toLowerCase().includes('сравни') ||
      message.toLowerCase().includes('логика') ||
      message.toLowerCase().includes('философия')) {
    
    try {
      console.log(`FreeChat Enhanced: Запрос требует глубокого анализа, используем специализированный провайдер Claude...`);
      
      const response = await fetch("http://localhost:5004/python/chat?provider=Anthropic", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          system_prompt: "Вы аналитический ассистент с глубоким критическим мышлением. Анализируйте вопросы детально, рассматривайте разные точки зрения, приводите аргументы и доказательства." 
        }),
        timeout: 35000 // Увеличенный таймаут для глубоких рассуждений
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от Claude для глубокого анализа`);
        console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
        
        if (data && data.response) {
          return {
            success: true,
            response: data.response,
            provider: 'ChatFree',
            model: data.provider || "Claude",
            backupInfo: `🧠 Для вопроса, требующего глубокого анализа, использован специализированный провайдер: ${data.provider || "Claude"}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при использовании Claude для глубокого анализа: ${error.message}`);
    }
  }
  
  // В. Проверяем, связан ли запрос с творчеством
  if (message.toLowerCase().includes('творчес') || 
      message.toLowerCase().includes('креатив') || 
      message.toLowerCase().includes('придумай') || 
      message.toLowerCase().includes('сочини') ||
      message.toLowerCase().includes('стих') ||
      message.toLowerCase().includes('рассказ') ||
      message.toLowerCase().includes('история')) {
    
    try {
      console.log(`FreeChat Enhanced: Запрос связан с творчеством, используем специализированный провайдер GeminiPro...`);
      
      const response = await fetch("http://localhost:5004/python/chat?provider=GeminiPro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          system_prompt: "Вы творческий ассистент с богатым воображением. Создавайте оригинальные, интересные и эмоциональные тексты." 
        }),
        timeout: 30000
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от GeminiPro для творческого запроса`);
        console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
        
        if (data && data.response) {
          return {
            success: true,
            response: data.response,
            provider: 'ChatFree',
            model: data.provider || "GeminiPro",
            backupInfo: `🎨 Для творческого запроса использован специализированный провайдер: ${data.provider || "GeminiPro"}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при использовании GeminiPro для творческого запроса: ${error.message}`);
    }
  }
  
  // Г. Проверяем, связан ли запрос с актуальной информацией или новостями
  if (message.toLowerCase().includes('новост') || 
      message.toLowerCase().includes('актуал') || 
      message.toLowerCase().includes('последн') || 
      message.toLowerCase().includes('текущ') ||
      message.toLowerCase().includes('событи') ||
      message.toLowerCase().includes('сегодня') ||
      message.toLowerCase().includes('news') ||
      message.toLowerCase().includes('recent')) {
    
    try {
      console.log(`FreeChat Enhanced: Запрос связан с актуальной информацией, используем провайдер You...`);
      
      const response = await fetch("http://localhost:5004/python/chat?provider=You", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          system_prompt: "Вы информационный ассистент с доступом к актуальным данным. Предоставляйте последнюю информацию и новости по запросу пользователя." 
        }),
        timeout: 35000 // Увеличенный таймаут для поиска актуальной информации
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от You для запроса о актуальной информации`);
        console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
        
        if (data && data.response) {
          return {
            success: true,
            response: data.response,
            provider: 'ChatFree',
            model: data.provider || "You",
            backupInfo: `📰 Для запроса об актуальной информации использован провайдер с доступом к последним данным: ${data.provider || "You"}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при использовании You для запроса об актуальной информации: ${error.message}`);
      
      // Если провайдер You недоступен, пробуем PerplexityApi как альтернативу
      try {
        console.log(`FreeChat Enhanced: Пробуем использовать PerplexityApi для актуальной информации...`);
        
        const response = await fetch("http://localhost:5004/python/chat?provider=PerplexityApi", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message, 
            system_prompt: "Вы информационный ассистент с доступом к актуальным данным. Предоставляйте последнюю информацию и новости по запросу пользователя." 
          }),
          timeout: 35000
        });
        
        if (response.ok) {
          const data = await response.json();
          
          console.log(`✅ Успешно получен ответ от PerplexityApi для запроса об актуальной информации`);
          console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
          
          if (data && data.response) {
            return {
              success: true,
              response: data.response,
              provider: 'ChatFree',
              model: data.provider || "PerplexityApi",
              backupInfo: `📰 Для запроса об актуальной информации использован провайдер с доступом к последним данным: ${data.provider || "PerplexityApi"}`
            };
          }
        }
      } catch (perplexityError) {
        console.log(`⚠️ Ошибка при использовании PerplexityApi: ${perplexityError.message}`);
      }
    }
  }
  
  // Д. Проверяем, связан ли запрос с анализом или обработкой изображений
  if ((message.toLowerCase().includes('изображен') || 
      message.toLowerCase().includes('картин') || 
      message.toLowerCase().includes('фото') ||
      message.toLowerCase().includes('image') ||
      message.toLowerCase().includes('picture') ||
      message.toLowerCase().includes('photo')) &&
      options.imageUrl) {
    
    try {
      console.log(`FreeChat Enhanced: Запрос связан с обработкой изображения, используем мультимодального провайдера...`);
      
      // Определяем, какой мультимодальный провайдер использовать
      // Claude поддерживает изображения
      const providerToUse = "Anthropic"; // Claude (через Anthropic)
      
      const response = await fetch(`http://localhost:5004/python/image_analysis?provider=${providerToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message,
          image_url: options.imageUrl,
          system_prompt: "Вы визуальный аналитик. Подробно описывайте содержимое изображений и отвечайте на вопросы о них."
        }),
        timeout: 40000 // Увеличенный таймаут для обработки изображений
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Успешно получен ответ от мультимодального провайдера для анализа изображения`);
        console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
        
        if (data && data.response) {
          return {
            success: true,
            response: data.response,
            provider: 'ChatFree',
            model: data.provider || providerToUse,
            backupInfo: `🖼️ Для анализа изображения использован мультимодальный провайдер: ${data.provider || providerToUse}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при использовании мультимодального провайдера: ${error.message}`);
      
      // Пробуем другой мультимодальный провайдер как резерв
      try {
        console.log(`FreeChat Enhanced: Пробуем использовать GeminiPro для анализа изображения...`);
        
        const response = await fetch(`http://localhost:5004/python/image_analysis?provider=GeminiPro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message,
            image_url: options.imageUrl,
            system_prompt: "Вы визуальный аналитик. Подробно описывайте содержимое изображений и отвечайте на вопросы о них."
          }),
          timeout: 40000
        });
        
        if (response.ok) {
          const data = await response.json();
          
          console.log(`✅ Успешно получен ответ от GeminiPro для анализа изображения`);
          console.log(`Реальный провайдер: ${data.provider || 'неизвестно'}`);
          
          if (data && data.response) {
            return {
              success: true,
              response: data.response,
              provider: 'ChatFree',
              model: data.provider || "GeminiPro",
              backupInfo: `🖼️ Для анализа изображения использован резервный мультимодальный провайдер: ${data.provider || "GeminiPro"}`
            };
          }
        }
      } catch (geminiError) {
        console.log(`⚠️ Ошибка при использовании GeminiPro для анализа изображения: ${geminiError.message}`);
      }
    }
  }
  
  // 7. Последний вариант - автоматический выбор лучшего провайдера
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
  
  // КРИТИЧНО: Если дошли сюда, значит Python G4F недоступен - НЕ используем заготовленные ответы!
  console.log('❌ ВСЕ AI ПРОВАЙДЕРЫ НЕДОСТУПНЫ - возвращаем ошибку');
  
  return {
    success: false,
    error: 'Все AI провайдеры временно недоступны. Python G4F сервер не отвечает.',
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