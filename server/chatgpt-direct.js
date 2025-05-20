// Прямое подключение к ChatGPT с использованием ACCESS_TOKEN
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обработчик для запросов к ChatGPT
export async function handleChatGPTRequest(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    console.log(`Запрос к ChatGPT: сообщение=${userMessage.substring(0, 30)}...`);
    
    // Получаем модель из запроса или используем gpt-3.5-turbo по умолчанию
    const model = req.body.model || "gpt-3.5-turbo";
    console.log(`Используемая модель: ${model}`);
    
    // Получаем ACCESS_TOKEN из переменных окружения
    const accessToken = process.env.ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({ 
        error: "Отсутствует ACCESS_TOKEN", 
        message: "Для работы с ChatGPT необходим действующий ACCESS_TOKEN" 
      });
    }
    
    // Формируем запрос к API ChatGPT
    const response = await fetchChatGPTResponse(userMessage, model, accessToken);
    
    console.log("Ответ от ChatGPT получен:", response.substring(0, 30) + "...");
    
    // Отправляем ответ клиенту
    res.json({ response });
  } catch (error) {
    console.error("Ошибка при обработке запроса к ChatGPT:", error);
    res.status(500).json({ 
      error: "Ошибка при обработке запроса", 
      message: error.message 
    });
  }
}

// Функция для получения ответа от ChatGPT через API
async function fetchChatGPTResponse(message, model, accessToken) {
  try {
    // Определяем, какой URL использовать в зависимости от модели
    const baseUrl = 'https://chat.openai.com/backend-api/conversation';
    
    // Формируем тело запроса
    const body = {
      action: "next",
      messages: [
        {
          id: generateUUID(),
          author: { role: "user" },
          content: { content_type: "text", parts: [message] }
        }
      ],
      model: model,
      parent_message_id: generateUUID(),
      timezone_offset_min: -180,
      suggestions: [],
      history_and_training_disabled: false,
      arkose_token: null
    };
    
    // Отправляем запрос к API ChatGPT
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Ошибка API ChatGPT: ${response.status} ${response.statusText}. ${errorData}`);
    }
    
    // Получаем ответ в формате text/event-stream
    const responseText = await response.text();
    
    // Парсим ответ и извлекаем текст
    const content = parseSSEResponse(responseText);
    
    return content || "Не удалось получить ответ от ChatGPT";
  } catch (error) {
    console.error("Ошибка при запросе к API ChatGPT:", error);
    throw error;
  }
}

// Функция для генерации UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Функция для парсинга SSE ответа
function parseSSEResponse(responseText) {
  let lastMessage = '';
  
  // Разбиваем ответ на строки
  const lines = responseText.trim().split('\n');
  
  for (const line of lines) {
    // Пропускаем пустые строки
    if (!line || line.trim() === '') continue;
    
    // Проверяем, начинается ли строка с "data: "
    if (line.startsWith('data: ')) {
      // Извлекаем JSON часть
      const jsonData = line.substring(6);
      
      // Пропускаем завершающее сообщение
      if (jsonData === '[DONE]') continue;
      
      try {
        // Парсим JSON
        const data = JSON.parse(jsonData);
        
        // Извлекаем текстовую часть ответа
        if (data.message && data.message.content && data.message.content.parts) {
          const parts = data.message.content.parts;
          if (parts.length > 0) {
            lastMessage = parts[0];
          }
        }
      } catch (error) {
        console.warn('Не удалось распарсить JSON из SSE:', error);
      }
    }
  }
  
  return lastMessage;
}

// Обработчик для страницы ChatGPT
export function chatGPTPage(req, res) {
  res.sendFile(path.join(process.cwd(), "chatgpt-direct.html"));
}