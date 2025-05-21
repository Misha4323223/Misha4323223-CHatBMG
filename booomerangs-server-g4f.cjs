// BOOOMERANGS сервер с корректной G4F интеграцией
const express = require('express');
const path = require('path');
const { getResponseFromG4F, getAvailableProviders } = require('./g4f-chat-correct.cjs');

const app = express();
const PORT = 5000;

// Поддержка JSON и статических файлов
app.use(express.json());
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API маршрут для чата с G4F
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`Получен запрос: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Получаем ответ от G4F
    const result = await getResponseFromG4F(message, {
      temperature: 0.7
    });
    
    console.log(`Ответ получен от провайдера: ${result.provider}`);
    
    res.json({
      success: true,
      response: result.response,
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    
    // Если все провайдеры не ответили, используем локальный ответ
    const backupResponse = generateBackupResponse(req.body.message);
    
    res.json({
      success: true,
      response: backupResponse.response,
      provider: backupResponse.provider,
      model: backupResponse.model,
      isBackup: true
    });
  }
});

// API маршрут для получения списка провайдеров
app.get('/api/ai/providers', (req, res) => {
  try {
    const providers = getAvailableProviders();
    res.json({
      success: true,
      providers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Произошла ошибка при получении списка провайдеров'
    });
  }
});

// API маршрут для генерации изображений
app.post('/api/ai/image', (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Описание изображения не может быть пустым'
      });
    }
    
    // Генерируем URL для изображения с Unsplash
    const width = 800;
    const height = 600;
    const randomSeed = Math.floor(Math.random() * 10000);
    const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodeURIComponent(prompt)}&sig=${randomSeed}`;
    
    res.json({
      success: true,
      imageUrl,
      provider: 'Unsplash'
    });
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Произошла ошибка при генерации изображения'
    });
  }
});

// Функция для генерации резервного ответа, если все провайдеры не ответили
function generateBackupResponse(message) {
  const lowerMessage = message.toLowerCase();
  let response;
  
  if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
    response = 'Привет! Я ассистент BOOOMERANGS. Чем могу помочь?';
  } else if (lowerMessage.includes('как дела') || lowerMessage.includes('как ты')) {
    response = 'У меня всё отлично! А как ваши дела?';
  } else if (lowerMessage.includes('изображени') || lowerMessage.includes('картинк')) {
    response = 'Если вы хотите создать изображение, перейдите на вкладку "Генератор Изображений" в верхней части страницы.';
  } else if (lowerMessage.includes('booomerangs')) {
    response = 'BOOOMERANGS - это мультимодальный AI-сервис для общения и создания изображений без API-ключей.';
  } else {
    const backupResponses = [
      `Спасибо за ваш вопрос! К сожалению, сейчас все провайдеры AI недоступны. Не могли бы вы повторить запрос чуть позже?`,
      `Интересный вопрос! Извините, но сейчас у меня проблемы с получением данных от AI провайдеров. Попробуйте задать вопрос позже.`,
      `В данный момент я не могу подключиться к AI провайдерам. Пожалуйста, повторите ваш запрос через несколько минут.`
    ];
    response = backupResponses[Math.floor(Math.random() * backupResponses.length)];
  }
  
  return {
    response,
    provider: 'Локальный резерв',
    model: 'Резервный режим'
  };
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
  console.log(`Доступные G4F провайдеры:`, getAvailableProviders().map(p => p.name).join(', '));
});