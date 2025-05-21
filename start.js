// Простой сервер для отображения BOOOMERANGS
const express = require('express');
const app = express();
const port = 3000;

// Разрешаем серверу обрабатывать JSON-запросы
app.use(express.json());

// Статические файлы
app.use(express.static('.'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${port}`);
});