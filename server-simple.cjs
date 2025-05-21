// Простой BOOOMERANGS сервер без внешних зависимостей
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5000;

// Словарь MIME-типов
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Провайдеры для G4F
const PROVIDERS = ['Qwen', 'Dify', 'AIChat', 'DeepAI'];

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Обработка API запросов
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    handleChatRequest(req, res);
    return;
  }
  
  if (pathname === '/api/ai/image' && req.method === 'POST') {
    handleImageRequest(req, res);
    return;
  }
  
  if (pathname === '/api/ai/providers' && req.method === 'GET') {
    handleProvidersRequest(req, res);
    return;
  }
  
  // Обработка статических файлов
  let filePath = '.' + pathname;
  if (pathname === '/') {
    filePath = './index.html';
  }
  
  // Проверяем существование файла
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // Файл не найден, отправляем index.html для SPA роутинга
      filePath = './index.html';
    } else if (stats.isDirectory()) {
      // Если указана директория, ищем в ней index.html
      filePath = path.join(filePath, 'index.html');
    }
    
    // Определяем тип файла
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Отправляем файл
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Ошибка сервера: ${err.code}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
  });
});

// Обработчик для чат-запросов
function handleChatRequest(req, res) {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', async () => {
    try {
      const body = JSON.parse(data);
      const { message } = body;
      
      if (!message) {
        sendJsonResponse(res, 400, { 
          success: false, 
          error: 'Сообщение не может быть пустым' 
        });
        return;
      }
      
      console.log(`Получен запрос: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      
      // Имитируем задержку
      await sleep(1000);
      
      // В реальном приложении здесь был бы вызов G4F провайдеров
      // Но для демонстрации мы используем заглушку с имитацией реального ответа
      
      // Генерируем ответ
      let response;
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
        response = 'Привет! Чем я могу помочь вам сегодня?';
      } else if (lowerMessage.includes('как дела') || lowerMessage.includes('как ты')) {
        response = 'У меня всё отлично, спасибо что спросили! Я всегда готов помочь.';
      } else if (lowerMessage.includes('изображени') || lowerMessage.includes('картинк')) {
        response = 'Если вы хотите создать изображение, перейдите на вкладку "Генератор Изображений" в верхней части страницы. Там вы сможете описать желаемое изображение и создать его.';
      } else if (lowerMessage.includes('svg')) {
        response = 'SVG (Scalable Vector Graphics) - это формат векторной графики, который масштабируется без потери качества. На вкладке "Генератор Изображений" вы можете конвертировать созданное изображение в SVG.';
      } else if (lowerMessage.includes('booomerangs')) {
        response = 'BOOOMERANGS - это мультимодальный AI-сервис, который позволяет вести диалоги и создавать изображения. Мы стремимся обеспечить доступ к технологиям искусственного интеллекта для всех.';
      } else {
        // Для демонстрации G4F возможностей (хотя это заглушка, но имитируем реальный ответ)
        response = generateFakeAIResponse(message);
      }
      
      // Имитируем выбор провайдера
      const provider = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
      const model = provider === 'Qwen' ? 'qwen-2.5-ultra-preview' : 
                    provider === 'Dify' ? 'dify-gguf' : 
                    provider === 'AIChat' ? 'gpt-3.5-turbo' : 'text-generator';
      
      sendJsonResponse(res, 200, {
        success: true,
        response: response,
        provider: provider,
        model: model
      });
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      sendJsonResponse(res, 500, { 
        success: false, 
        error: 'Ошибка при обработке запроса: ' + error.message 
      });
    }
  });
}

// Обработчик для запросов изображений
function handleImageRequest(req, res) {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    try {
      const body = JSON.parse(data);
      const { prompt } = body;
      
      if (!prompt) {
        sendJsonResponse(res, 400, { 
          success: false, 
          error: 'Описание изображения не может быть пустым' 
        });
        return;
      }
      
      // Генерируем URL для изображения с Unsplash
      const width = 800;
      const height = 600;
      const randomSeed = Math.floor(Math.random() * 10000);
      const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodeURIComponent(prompt)}&sig=${randomSeed}`;
      
      sendJsonResponse(res, 200, {
        success: true,
        imageUrl,
        provider: 'Unsplash'
      });
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      sendJsonResponse(res, 500, { 
        success: false, 
        error: 'Ошибка при генерации изображения: ' + error.message 
      });
    }
  });
}

// Обработчик для запроса провайдеров
function handleProvidersRequest(req, res) {
  sendJsonResponse(res, 200, {
    success: true,
    providers: PROVIDERS
  });
}

// Вспомогательная функция для ответа в формате JSON
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Функция для имитации задержки
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Генерация псевдоответа AI (для демонстрации)
function generateFakeAIResponse(message) {
  const responses = [
    `Спасибо за ваш вопрос о "${message.substring(0, 20)}...". Это интересная тема, которая затрагивает множество аспектов. Исходя из доступной информации, можно отметить следующие ключевые моменты...`,
    `Ваш запрос "${message.substring(0, 15)}..." требует анализа разных источников. Согласно имеющимся данным, существует несколько подходов к решению этого вопроса. Во-первых, важно понимать контекст...`,
    `Интересный вопрос! Тема "${message.substring(0, 25)}..." активно обсуждается в различных источниках. Если обобщить доступную информацию, можно прийти к следующим выводам...`,
    `По вашему запросу о "${message.substring(0, 18)}..." можно предоставить несколько ключевых фактов. Важно отметить, что существуют разные точки зрения на этот вопрос, но основываясь на проверенной информации...`,
    `Отвечая на ваш вопрос "${message.substring(0, 22)}...", следует учитывать различные факторы. На основе актуальных данных и исследований можно сказать, что...`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Запускаем сервер
server.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
  console.log(`Доступные провайдеры: ${PROVIDERS.join(', ')}`);
});