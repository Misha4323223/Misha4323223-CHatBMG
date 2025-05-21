/**
 * Скрипт для запуска стримингового Python-сервера Flask
 * и проксирования запросов к нему из основного приложения
 */
const { spawn } = require('child_process');
const http = require('http');
const express = require('express');

// Создаем сервер прокси для перенаправления запросов к Python серверу
const app = express();
const PORT = 5002;

// Порт Python сервера Flask
const PYTHON_SERVER_PORT = 5001;

let pythonProcess = null;

// Запускаем Python сервер Flask
function startPythonServer() {
  console.log('Запуск Flask сервера для стриминга...');
  
  // Запускаем Python процесс
  pythonProcess = spawn('python', ['server/stream_server.py']);
  
  // Обрабатываем вывод из стандартного потока
  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data.toString().trim()}`);
  });
  
  // Обрабатываем ошибки
  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Flask Error] ${data.toString().trim()}`);
  });
  
  // Обрабатываем завершение процесса
  pythonProcess.on('close', (code) => {
    console.log(`[Flask] Сервер остановлен с кодом ${code}`);
    
    // Перезапускаем сервер, если он завершился с ошибкой
    if (code !== 0) {
      console.log('[Flask] Перезапуск сервера...');
      startPythonServer();
    }
  });
}

// Проверка доступности Python сервера
function checkPythonServer() {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: PYTHON_SERVER_PORT,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Настройка прокси для перенаправления запросов к Python серверу
app.use('/api/stream', async (req, res) => {
  // Проверяем, запущен ли Python сервер
  const isServerRunning = await checkPythonServer();
  
  if (!isServerRunning) {
    console.log('[Proxy] Python сервер не запущен, перезапускаем...');
    startPythonServer();
    
    // Даем серверу время на запуск
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Создаем опции для запроса к Python серверу
  const options = {
    hostname: 'localhost',
    port: PYTHON_SERVER_PORT,
    path: '/stream',
    method: req.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Собираем тело запроса
  let body = [];
  req.on('data', (chunk) => {
    body.push(chunk);
  });
  
  req.on('end', () => {
    body = Buffer.concat(body).toString();
    
    // Создаем запрос к Python серверу
    const proxyReq = http.request(options, (proxyRes) => {
      // Устанавливаем статус и заголовки ответа
      res.statusCode = proxyRes.statusCode;
      res.statusMessage = proxyRes.statusMessage;
      
      Object.keys(proxyRes.headers).forEach((key) => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Пересылаем данные от Python сервера клиенту
      proxyRes.pipe(res);
    });
    
    // Обработка ошибок
    proxyReq.on('error', (error) => {
      console.error('[Proxy] Ошибка при обращении к Python серверу:', error.message);
      
      // Возвращаем ошибку клиенту
      res.statusCode = 502;
      res.end(JSON.stringify({ 
        error: 'Ошибка прокси', 
        message: 'Не удалось подключиться к серверу стриминга' 
      }));
    });
    
    // Отправляем тело запроса
    proxyReq.write(body);
    proxyReq.end();
  });
});

// Запускаем сервер прокси
app.listen(PORT, () => {
  console.log(`[Proxy] Сервер запущен на порту ${PORT}`);
  
  // Запускаем Python сервер
  startPythonServer();
});

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('Завершение работы...');
  
  if (pythonProcess) {
    console.log('Остановка Python сервера...');
    pythonProcess.kill();
  }
  
  process.exit();
});