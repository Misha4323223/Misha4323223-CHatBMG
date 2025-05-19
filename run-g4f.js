// Отдельный скрипт для запуска G4F прокси независимо от основного приложения
import { exec, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверяем, запущен ли уже G4F прокси на порту 3334
const checkProxy = async () => {
  try {
    // Проверяем, есть ли процесс на порту 3334
    const response = await fetch('http://localhost:3334/status').catch(() => null);
    if (response && response.ok) {
      console.log('G4F прокси-сервер уже запущен');
      return true;
    }
  } catch (error) {
    // Прокси не запущен, будем запускать
    return false;
  }
  return false;
};

// Запускаем G4F прокси в отдельном процессе
const startProxyServer = () => {
  console.log('Запуск G4F прокси-сервера...');
  
  // Используем spawn для долговременных процессов
  const g4fProcess = spawn('node', ['--es-module-specifier-resolution=node', 'g4f-proxy.js'], {
    cwd: __dirname,
    detached: true, // Запускаем в фоновом режиме
    stdio: 'pipe' // Редиректим вывод
  });
  
  // Выводим информацию о запущенном процессе
  console.log(`G4F прокси-сервер запущен, PID: ${g4fProcess.pid}`);
  
  // Обрабатываем вывод
  g4fProcess.stdout.on('data', (data) => {
    console.log(`G4F прокси: ${data.toString().trim()}`);
  });
  
  g4fProcess.stderr.on('data', (data) => {
    console.error(`G4F прокси ошибка: ${data.toString().trim()}`);
  });
  
  // Отцепляем процесс, чтобы он продолжал работать независимо
  g4fProcess.unref();
  
  // Сохраняем PID для возможного завершения
  fs.writeFileSync('g4f-proxy.pid', g4fProcess.pid.toString());
};

// Запускаем прокси
checkProxy().then(isRunning => {
  if (!isRunning) {
    startProxyServer();
  }
});