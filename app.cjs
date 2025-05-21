const express = require('express');
const app = express();
const PORT = 3000;

// Обслуживание статических файлов из текущей директории
app.use(express.static('./'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});