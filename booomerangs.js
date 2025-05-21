// BOOOMERANGS-сервер на Express
const express = require('express');
const app = express();
const port = 8080; // Изменяем порт на 8080

// Поддержка JSON
app.use(express.json());

// Статические файлы
app.use(express.static('./'));

// Главная страница - наше приложение
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Эндпоинт для генерации изображения
app.post('/generate-image', (req, res) => {
  const prompt = req.body.prompt || 'landscape';
  const width = 800;
  const height = 600;
  const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodeURIComponent(prompt)}`;
  
  res.json({ success: true, imageUrl });
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${port}`);
});