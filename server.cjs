// Простой сервер для BOOOMERANGS
const express = require('express');
const app = express();
const port = 3000;

// Поддержка JSON
app.use(express.json());

// Статические файлы
app.use(express.static(__dirname));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Эндпоинт для генерации изображения
app.post('/generate-image', (req, res) => {
  const prompt = req.body.prompt || 'landscape';
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Используем Unsplash для получения изображения (без API ключа)
  const imageUrl = `https://source.unsplash.com/random/800x600/?${encodedPrompt}`;
  
  res.json({ success: true, imageUrl });
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${port}`);
  console.log(`Откройте http://localhost:${port} в вашем браузере`);
});