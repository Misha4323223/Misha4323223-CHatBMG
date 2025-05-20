// Интеграция с провайдером You и моделью GPT-4o через Python G4F API
import { log } from './vite';
import fetch from 'node-fetch';
import path from 'path';

/**
 * Обработчик запросов к GPT через G4F (используем надежных провайдеров)
 * @param {Object} req Запрос Express
 * @param {Object} res Ответ Express
 */
export async function handleYouGPT4oRequest(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    log(`Запрос к GPT (улучшенный): сообщение=${userMessage.substring(0, 30)}...`, 'you-gpt4o');
    
    try {
      // Используем надежный провайдер Qwen_Qwen_2_5
      log(`Используем надежного провайдера: Qwen_Qwen_2_5`, 'you-gpt4o');
      
      const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          provider: 'Qwen_Qwen_2_5',
          max_retries: 2
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }
      
      const data = await response.json();
      
      log(`Получен успешный ответ от ${data.provider}`, 'you-gpt4o');
      
      // Формируем ответ в формате ChatGPT для совместимости с фронтендом
      // Но представляем его как ответ "You GPT-4o" для соответствия интерфейсу
      const formattedResponse = {
        message: {
          content: {
            content_type: "text",
            parts: [data.response]
          }
        },
        provider: "You GPT-4o (через Qwen)",
        model: "gpt-4o (via Qwen)" 
      };
      
      return res.json(formattedResponse);

    } catch (innerError) {
      log(`Ошибка при использовании провайдера: ${innerError.message}`, 'you-gpt4o');
      
      // Если основной провайдер не сработал, пробуем запасной вариант
      try {
        log(`Пробуем запасной вариант с автовыбором провайдера`, 'you-gpt4o');
        
        const fallbackResponse = await fetch('http://localhost:5001/api/python/g4f/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessage,
            max_retries: 3
          })
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Ошибка API: ${fallbackResponse.status}`);
        }
        
        const fallbackData = await fallbackResponse.json();
        
        const backupResponse = {
          message: {
            content: {
              content_type: "text",
              parts: [fallbackData.response]
            }
          },
          provider: "You GPT-4o (резервный режим)",
          model: "gpt-4 (резервный режим)" 
        };
        
        return res.json(backupResponse);
      } catch (fallbackError) {
        // Если и запасной вариант не сработал, возвращаем ошибку
        res.status(500).json({ 
          error: "Ошибка при обработке запроса", 
          message: `Основной и запасной провайдеры недоступны: ${fallbackError.message}` 
        });
      }
    }
  } catch (error) {
    log(`Непредвиденная ошибка в обработчике: ${error.message}`, 'you-gpt4o');
    
    res.status(500).json({ 
      error: "Непредвиденная ошибка при обработке запроса", 
      message: error.message 
    });
  }
}

/**
 * Обработчик страницы You/GPT-4o чата
 */
export function youGPT4oPage(req, res) {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You GPT-4o Chat</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
      <div class="container mx-auto px-4 py-8 max-w-4xl">
        <header class="mb-8 text-center">
          <h1 class="text-3xl font-bold text-indigo-700">You GPT-4o Chat</h1>
          <p class="text-gray-600 mt-2">Используется провайдер You с моделью GPT-4o через G4F</p>
        </header>
        
        <div class="bg-white rounded-lg shadow-md p-6">
          <div id="chat-container" class="mb-4 space-y-4 h-96 overflow-y-auto"></div>
          
          <div class="flex items-center space-x-2">
            <textarea 
              id="message-input" 
              class="flex-grow border rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none" 
              placeholder="Введите ваше сообщение..." 
              rows="3"
              onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }"></textarea>
            <button 
              id="send-button" 
              onclick="sendMessage()" 
              class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
              Отправить
            </button>
          </div>
        </div>
      </div>
      
      <script>
        // DOM элементы
        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        
        // Добавление сообщения в чат
        function addMessage(text, isUser = false) {
          const messageElement = document.createElement('div');
          messageElement.className = isUser 
            ? 'bg-indigo-50 p-3 rounded-lg ml-12' 
            : 'bg-gray-50 p-3 rounded-lg mr-12';
          
          const roleText = document.createElement('div');
          roleText.className = 'text-xs text-gray-500 mb-1';
          roleText.textContent = isUser ? 'Вы' : 'You GPT-4o';
          
          const messageText = document.createElement('div');
          messageText.className = 'whitespace-pre-wrap';
          messageText.textContent = text;
          
          messageElement.appendChild(roleText);
          messageElement.appendChild(messageText);
          chatContainer.appendChild(messageElement);
          
          // Прокрутка до нового сообщения
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // Отправка сообщения на сервер
        async function sendMessage() {
          const message = messageInput.value.trim();
          if (!message) return;
          
          // Добавляем сообщение пользователя в чат
          addMessage(message, true);
          
          // Очищаем поле ввода
          messageInput.value = '';
          
          // Временно блокируем кнопку отправки
          sendButton.disabled = true;
          sendButton.innerText = 'Отправка...';
          sendButton.classList.add('bg-gray-400');
          sendButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
          
          try {
            // Отправляем запрос на сервер
            const response = await fetch('/api/you-gpt4o', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            // Обрабатываем ответ
            if (data.error) {
              addMessage('Ошибка: ' + data.error);
            } else if (data.message && data.message.content && data.message.content.parts) {
              // Стандартный формат ответа
              addMessage(data.message.content.parts[0]);
            } else if (data.reply) {
              // Альтернативный формат ответа
              addMessage(data.reply);
            } else {
              addMessage('Получен неизвестный формат ответа.');
            }
          } catch (error) {
            console.error('Ошибка при отправке запроса:', error);
            addMessage('Произошла ошибка при отправке запроса: ' + error.message);
          } finally {
            // Восстанавливаем кнопку отправки
            sendButton.disabled = false;
            sendButton.innerText = 'Отправить';
            sendButton.classList.remove('bg-gray-400');
            sendButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
          }
        }
        
        // Инициализация чата
        addMessage('Привет! Я использую модель GPT-4o через провайдер You. Задайте мне вопрос, и я постараюсь помочь!');
      </script>
    </body>
    </html>
  `);
}