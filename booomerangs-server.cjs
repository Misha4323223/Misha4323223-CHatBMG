// BOOOMERANGS Express сервер для превью в Replit
const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

// Обслуживаем статические файлы
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});