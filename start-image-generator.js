import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Запуск сервера генерации изображений...');

// Запускаем сервер на порту 3000
const server = spawn('node', [path.join(__dirname, 'image-generator-server.js')], {
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Ошибка запуска сервера:', err);
});

console.log('Сервер запущен! Откройте браузер и перейдите по адресу:');
console.log('http://localhost:3000');