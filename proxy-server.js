import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch"; // если fetch не работает, установи: npm install node-fetch
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔐 Проверка наличия access_token
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.warn("Предупреждение: ACCESS_TOKEN не задан в .env");
}

// 📡 Прокси-маршрут для OpenAI API
app.post("/api/chat", async (req, res) => {
  try {
    // Получаем токен из переменной окружения или из заголовка запроса
    const token = ACCESS_TOKEN || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Не предоставлен токен доступа" });
    }
    
    // Получаем сообщение от пользователя
    const userMessage = req.body.message || 
                       (req.body.messages && req.body.messages.find(m => m.role === 'user')?.content) || 
                       "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    // Формируем запрос к ChatGPT API в правильном формате
    const response = await fetch("https://chat.openai.com/backend-api/conversation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: crypto.randomUUID(),
            author: { role: "user" },
            content: { content_type: "text", parts: [userMessage] }
          }
        ],
        model: "text-davinci-002-render-sha",
        parent_message_id: crypto.randomUUID()
      }),
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

// Простой маршрут для проверки работы сервера
app.get("/", (req, res) => {
  res.send("Сервер работает 🔥");
});

// 🚀 Старт сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Прокси-сервер работает на http://localhost:${PORT}`);
  console.log(`Откройте в браузере чтобы начать работу`);
});