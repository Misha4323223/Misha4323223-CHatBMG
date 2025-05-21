// Простой имитатор BOOOMERANGS AI для стабильной работы без внешних зависимостей
const express = require('express');
const cors = require('cors');
const path = require('path');

// Создаем приложение Express
const app = express();
const PORT = process.env.PORT || 5001;

// Настраиваем middleware
app.use(express.json());
app.use(cors());
app.use(express.static('./'));

// Коллекция ответов для разных тем
const AI_RESPONSES = {
  // Приветствия
  greetings: [
    'Привет! Я BOOOMERANGS AI-ассистент. Чем могу помочь сегодня?',
    'Здравствуйте! Я ваш AI-помощник BOOOMERANGS. Готов ответить на ваши вопросы!',
    'Добрый день! BOOOMERANGS AI на связи. Как я могу вам помочь?'
  ],
  
  // О BOOOMERANGS
  about: [
    'BOOOMERANGS - это инновационный AI-сервис для генерации текста и изображений без необходимости платных API ключей. Наше приложение позволяет бесплатно использовать возможности AI для различных задач.',
    'BOOOMERANGS предоставляет доступ к AI функциям через браузер, включая генерацию текста и создание изображений. Всё это бесплатно и не требует API ключей.',
    'BOOOMERANGS - это мультимодальная AI-платформа, которая работает в браузере и позволяет генерировать тексты и изображения без платных подписок.'
  ],
  
  // О генерации изображений
  images: [
    'Для создания изображения в BOOOMERANGS перейдите на вкладку "Генератор изображений", введите подробное описание желаемого изображения и нажмите кнопку "Создать". Через несколько секунд вы получите результат, который можно скачать или преобразовать в SVG.',
    'Генератор изображений BOOOMERANGS позволяет создавать изображения на основе текстового описания. Просто опишите, что вы хотите увидеть, выберите стиль, и нажмите кнопку генерации. Результат можно скачать в формате JPG или преобразовать в векторный SVG.',
    'BOOOMERANGS позволяет создавать изображения из текстовых описаний. Для лучших результатов: 1) Будьте конкретны в описании; 2) Указывайте стиль и атмосферу; 3) Используйте детальные прилагательные.'
  ],
  
  // О технологиях
  tech: [
    'BOOOMERANGS использует различные бесплатные AI-провайдеры, работающие через JavaScript и Python интерфейсы. Для генерации изображений применяются свободные API, а для получения текстов - различные LLM модели.',
    'В основе BOOOMERANGS лежат современные AI-технологии, доступные без API ключей. Мы обеспечиваем стабильную работу благодаря системе автоматического переключения между провайдерами и резервному режиму с подготовленными ответами.',
    'BOOOMERANGS построен на технологии G4F (GPT for Free) с дополнительными улучшениями для стабильности. Мы также используем генерацию изображений через свободные API и преобразование растровых изображений в SVG.'
  ],
  
  // Общие возможности
  capabilities: [
    'Я могу отвечать на вопросы, генерировать тексты и помогать с созданием изображений. Просто скажите, что вам нужно, и я постараюсь помочь!',
    'Мои возможности включают: ответы на вопросы, генерацию текстов на различные темы, помощь с описанием для создания изображений, и предоставление информации о BOOOMERANGS.',
    'Я могу помочь с различными текстовыми задачами: ответить на вопросы, сгенерировать идеи, объяснить концепции. Также могу подсказать, как создать изображение с помощью генератора BOOOMERANGS.'
  ],
  
  // Неизвестные запросы
  unknown: [
    'Интересный вопрос! Я работаю в демо-режиме и могу отвечать на общие вопросы о BOOOMERANGS, генерации изображений и возможностях AI.',
    'Я работаю в ограниченном режиме и лучше всего могу рассказать о BOOOMERANGS, его функциях и возможностях генерации изображений.',
    'В данный момент я могу предоставить информацию о BOOOMERANGS, генерации изображений и основных функциях сервиса. Для более сложных запросов мне нужно будет подключение к расширенным моделям.'
  ]
};

// Функция для выбора случайного ответа из категории
function getRandomResponse(category) {
  const responses = AI_RESPONSES[category] || AI_RESPONSES.unknown;
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Функция для определения категории запроса
function categorizeRequest(message) {
  const lowerText = message.toLowerCase();
  
  // Приветствия
  if (lowerText.match(/привет|здравствуй|добрый день|хай|хелло|hello|hi/i)) {
    return 'greetings';
  }
  
  // О BOOOMERANGS
  if (lowerText.match(/что такое booomerangs|расскажи о booomerangs|booomerangs это|о сервисе|о приложении|о проекте|что умеет booomerangs/i)) {
    return 'about';
  }
  
  // О генерации изображений
  if (lowerText.match(/генер.*изображен|созда.*картин|картинк|изображен|рисун|рисов|генер.*рисун|как создать изображение|как нарисовать|svg|вектор/i)) {
    return 'images';
  }
  
  // О технологиях
  if (lowerText.match(/технолог|как работает|api|llm|gpt|модел|нейросет|g4f|провайдер/i)) {
    return 'tech';
  }
  
  // О возможностях
  if (lowerText.match(/что ты умеешь|возможност|способност|функц|что ты можешь|помоги|помощь/i)) {
    return 'capabilities';
  }
  
  return 'unknown';
}

// API маршрут для чата
app.post('/api/ai/chat', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }
    
    console.log(`Получен запрос: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Определяем категорию и получаем ответ
    const category = categorizeRequest(message);
    const response = getRandomResponse(category);
    
    console.log(`Категория: ${category}. Отправляю ответ.`);
    
    // Добавляем небольшую случайную задержку для реалистичности (300-800ms)
    setTimeout(() => {
      res.json({
        success: true,
        response: response,
        provider: 'BOOOMERANGS-AI',
        model: 'simple-chat'
      });
    }, 300 + Math.floor(Math.random() * 500));
    
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    
    res.status(500).json({
      success: false,
      error: 'Ошибка при обработке запроса',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// API маршрут для генерации изображений (используем Unsplash для демонстрации)
app.post('/api/ai/image', (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Описание изображения не может быть пустым'
      });
    }
    
    console.log(`Получен запрос на изображение: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    // Генерируем URL для изображения с Unsplash
    const width = 800;
    const height = 600;
    const randomSeed = Math.floor(Math.random() * 10000);
    const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodeURIComponent(prompt)}&sig=${randomSeed}`;
    
    // Добавляем небольшую задержку для реалистичности (800-1500ms)
    setTimeout(() => {
      res.json({
        success: true,
        imageUrl,
        provider: 'BOOOMERANGS-SimpleGen',
        model: 'unsplash-search'
      });
    }, 800 + Math.floor(Math.random() * 700));
    
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    
    res.status(500).json({
      success: false,
      error: 'Ошибка при генерации изображения',
      message: error.message || 'Неизвестная ошибка'
    });
  }
});

// Маршрут для доступа к BOOOMERANGS приложению
app.get('/booom', (req, res) => {
  res.sendFile(path.join(__dirname, 'booomerangs-app.html'));
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS Simple AI сервер запущен на порту ${PORT}`);
});