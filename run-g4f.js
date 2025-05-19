// Отдельный скрипт для запуска G4F прокси независимо от основного приложения
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Запускаем G4F прокси-сервер
console.log('Запуск G4F прокси-сервера...');

// Запускаем с поддержкой модулей ES
const child = exec('node --es-module-specifier-resolution=node g4f-proxy.js', {
  cwd: __dirname
});

child.stdout.on('data', (data) => {
  console.log(data.trim());
});

child.stderr.on('data', (data) => {
  console.error(`Ошибка: ${data.trim()}`);
});

child.on('close', (code) => {
  console.log(`G4F прокси-сервер завершил работу с кодом ${code}`);
});