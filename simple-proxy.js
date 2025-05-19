// Простой прокси-сервер для ChatGPT
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Настройка приложения
const app = express();
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Маршрут для статус-страницы
app.get('/status', (req, res) => {
  res.json({
    status: "ok",
    message: "Прокси-сервер для ChatGPT работает",
    hasAccessToken: !!process.env.ACCESS_TOKEN
  });
});

// Основной маршрут для запросов к ChatGPT
app.post('/api/chat', async (req, res) => {
  try {
    // Получаем токен из переменной окружения или заголовка запроса
    const token = process.env.ACCESS_TOKEN || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Не предоставлен токен доступа" });
    }
    
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    // Генерируем уникальные идентификаторы для сообщения и сессии
    const messageId = crypto.randomUUID();
    const parentMessageId = crypto.randomUUID();
    
    // Отправляем запрос к ChatGPT API
    const response = await fetch("https://chat.openai.com/backend-api/conversation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: messageId,
            author: { role: "user" },
            content: { content_type: "text", parts: [userMessage] }
          }
        ],
        model: "text-davinci-002-render-sha",
        parent_message_id: parentMessageId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("ChatGPT API error:", errorText);
      
      return res.status(response.status).json({ 
        error: `OpenAI error ${response.status}`,
        message: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error("Ошибка прокси:", error);
    res.status(500).json({ 
      error: "Ошибка прокси-сервера", 
      message: error.message 
    });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Прокси-сервер работает на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT}/ в браузере`);
});