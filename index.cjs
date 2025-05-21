// BOOOMERANGS - сервер для генерации изображений
const express = require('express');
const app = express();

// Поддержка JSON
app.use(express.json());

// Статические файлы
app.use(express.static('./'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Запуск сервера на порту 3000 (стандартный для Replit)
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});