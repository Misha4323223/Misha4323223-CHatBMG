// BOOOMERANGS - простой сервер
const express = require('express');
const app = express();

// Обслуживаем статические файлы из корневой директории
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Запуск сервера на порту, который Replit сможет распознать
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});