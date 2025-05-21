// Простой сервер для проверки G4F без зависимостей
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// Простое API для тестирования
app.post('/api/chat', async (req, res) => {
  try {
    const { message, provider = 'qwen' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Отсутствует сообщение' });
    }
    
    console.log(`Получен запрос: ${message.substring(0, 50)}...`);
    
    // Получаем ответ от Qwen API (наиболее стабильный)
    const response = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        model: 'qwen-2.5-ultra-preview',
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API вернул ошибку: ${response.status} - ${errorText}`);
      return res.status(500).json({ 
        error: 'Ошибка API', 
        message: `Статус: ${response.status}` 
      });
    }
    
    const data = await response.json();
    const answer = data.choices[0].message.content;
    
    console.log(`Получен ответ от API: ${answer.substring(0, 50)}...`);
    
    return res.json({
      response: answer,
      provider: 'Qwen',
      model: data.model || 'qwen-2.5-ultra-preview'
    });
    
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: error.message
    });
  }
});

// Тестовый маршрут
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Тестовый сервер работает' });
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Тестовый сервер запущен на порту ${PORT}`);
});