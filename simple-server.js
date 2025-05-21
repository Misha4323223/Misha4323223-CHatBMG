// Простой сервер для статических файлов
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);
  
  // Обработка корневого пути
  let filePath = req.url === '/' ? './index.html' : '.' + req.url;
  
  // Получаем расширение файла
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname.substr(1)] || 'application/octet-stream';
  
  // Проверяем существование файла
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Файл не найден
        fs.readFile('./index.html', (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Ошибка сервера: ' + err.code);
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        // Другая ошибка сервера
        res.writeHead(500);
        res.end('Ошибка сервера: ' + err.code);
      }
    } else {
      // Успешно, отправляем содержимое файла
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});