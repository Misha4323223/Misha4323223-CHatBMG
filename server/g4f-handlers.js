// Обработчики API для G4F
const express = require('express');
const router = express.Router();
const g4fProvider = require('./g4f-provider');

// Набор демо-ответов для BOOOMERANGS для случаев, когда провайдеры недоступны
const DEMO_RESPONSES = [
  {
    prompt: "привет",
    response: "Привет! 🪃 Я BOOOMERANGS AI ассистент. Рад вас видеть! Чем могу помочь вам сегодня?"
  },
  {
    prompt: "как дела",
    response: "У меня всё отлично! 😊 Готов помочь вам с любыми вопросами. Что вас интересует?"
  },
  {
    prompt: "кто тебя создал",
    response: "Меня создали разработчики BOOOMERANGS - команда энтузиастов AI технологий! Мы стремимся сделать искусственный интеллект доступным для всех без платных подписок. 🚀"
  },
  {
    prompt: "расскажи о booomerangs",
    response: "BOOOMERANGS - это революционная платформа для работы с AI! 🎯\n\n✨ Основные возможности:\n• Бесплатный AI чат (аналог ChatGPT)\n• Генерация изображений (аналог DALL-E)\n• Командный чат для команды\n• Работа без API ключей\n• Современный адаптивный интерфейс\n\nМы делаем AI доступным для всех! 💫"
  },
  {
    prompt: "что ты умеешь",
    response: "У меня много крутых возможностей! 🎪\n\n🧠 Интеллектуальные функции:\n• Отвечаю на любые вопросы\n• Помогаю с решением задач\n• Генерирую идеи и контент\n• Объясняю сложные темы простыми словами\n\n🎨 В BOOOMERANGS также доступно:\n• Создание изображений по описанию\n• Конвертация в SVG формат\n• Командная работа в чате\n\nДавайте что-нибудь попробуем! 🚀"
  },
  {
    prompt: "как генерировать изображения",
    response: "Генерация изображений в BOOOMERANGS очень простая! 🎨\n\n📋 Пошаговая инструкция:\n1. Нажмите на вкладку '🎨 Генератор'\n2. Опишите изображение детально\n3. Нажмите 'Создать изображение'\n4. Готово! Изображение появится ниже\n\n💡 Секреты крутых результатов:\n• Добавляйте детали: цвета, стиль, настроение\n• Указывайте техники: 'фотореализм', 'акварель', 'digital art'\n• Описывайте композицию: 'крупный план', 'панорама'\n\nПопробуйте прямо сейчас! 🚀"
  },
  {
    prompt: "команда",
    response: "Командный чат - это супер функция для совместной работы! 👥\n\n🔥 Возможности:\n• Общение в реальном времени\n• Обмен идеями с коллегами\n• Совместное планирование проектов\n• История всех сообщений\n\nПерейдите на вкладку '👥 Команда' и начните общение! 💬"
  },
  {
    prompt: "технологии",
    response: "BOOOMERANGS построен на современном стеке технологий! 🛠️\n\n⚡ Технический стек:\n• Frontend: React + TypeScript + Tailwind CSS\n• Backend: Node.js + Express\n• База данных: PostgreSQL + Drizzle ORM\n• AI провайдеры: G4F + множество бесплатных API\n• Генерация изображений: Pollinations.ai, EMG-API\n\n🎯 Особенности:\n• Без API ключей\n• Автоматическое переключение провайдеров\n• Адаптивный дизайн\n• WebSocket для реального времени"
  },
  {
    prompt: "помощь",
    response: "Конечно помогу! 🤝 Вот что я могу для вас сделать:\n\n💬 В чате:\n• Отвечу на любые вопросы\n• Помогу с решением задач\n• Объясню сложные концепции\n• Сгенерирую идеи\n\n🎨 В генераторе:\n• Создам изображения по описанию\n• Подскажу как улучшить промпты\n\n👥 В командном чате:\n• Покажу как общаться с командой\n\nПросто спросите что вас интересует! 😊"
  }
];

// Функция для получения наиболее подходящего демо-ответа
function findDemoResponse(message) {
  // Приводим запрос к нижнему регистру для лучшего сравнения
  const normalizedMessage = message.toLowerCase();
  
  // Проверяем наличие ключевых слов в запросе
  for (const demo of DEMO_RESPONSES) {
    if (normalizedMessage.includes(demo.prompt)) {
      return demo.response;
    }
  }
  
  // Возвращаем базовый ответ, если ничего не найдено
  return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!";
}

// API endpoint для чата с моделями G4F
router.post('/chat', async (req, res) => {
  try {
    const { 
      message, 
      messages = null,
      provider = null, // Если null, будет перебор по приоритету
      model = null, 
      temperature = 0.7, 
      maxTokens = 800, 
      max_retries = 3 
    } = req.body;
    
    // Проверяем, что есть хотя бы одно сообщение
    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({ 
        error: 'Отсутствует сообщение',
        response: 'Пожалуйста, укажите сообщение или историю сообщений для обработки'
      });
    }
    
    // Извлекаем текст последнего пользовательского сообщения для логирования и демо-режима
    const userMessageText = messages ? 
      messages.filter(m => m.role === 'user').pop()?.content || message : 
      message;
    
    console.log(`Запрос к G4F: провайдер=${provider || 'auto'}, сообщение="${userMessageText.substring(0, 50)}..."`);
    
    // Пробуем сначала Python G4F провайдер, затем JavaScript провайдеры
    try {
      console.log('🐍 Пробуем Python G4F провайдер...');
      
      // Сначала пробуем Python G4F провайдер
      try {
        const pythonResponse = await fetch('http://localhost:5000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            provider: provider || 'auto',
            model: model || null,
            temperature: temperature || 0.7,
            use_stream: false
          }),
          timeout: 8000
        });

        if (pythonResponse.ok) {
          const pythonResult = await pythonResponse.json();
          if (pythonResult.success && pythonResult.response) {
            console.log('✅ Python G4F провайдер ответил успешно');
            return res.json({
              response: pythonResult.response,
              provider: pythonResult.provider || 'Python-G4F',
              model: pythonResult.model || 'auto',
              cached: false
            });
          }
        }
      } catch (pythonError) {
        console.log('⚠️ Python G4F недоступен, пробуем JavaScript провайдеры...');
      }
      
      // Если Python провайдер не работает, пробуем JavaScript провайдеры
      console.log('🔧 Пробуем JavaScript G4F провайдеры...');
      
      // Подготовка формата сообщений для API
      let chatMessages;
      if (messages) {
        // Если передан массив сообщений, используем его
        chatMessages = messages;
      } else {
        // Иначе создаем новое сообщение
        chatMessages = [{ role: 'user', content: message }];
      }
      
      // Если указан конкретный провайдер, проверяем модель
      let selectedModel = model;
      if (provider && !model) {
        // Если модель не указана, получаем модель по умолчанию для данного провайдера
        selectedModel = g4fProvider.getModelForProvider(provider, model);
        console.log(`Для провайдера ${provider} выбрана модель: ${selectedModel}`);
      }
      
      // Выполняем запрос к провайдеру(ам) с уменьшенным timeout
      const response = await Promise.race([
        g4fProvider.getResponse(message, {
          provider,
          model: selectedModel,
          temperature,
          maxTokens,
          maxRetries: max_retries,
          messages: chatMessages
        }),
        // Если провайдеры не отвечают в течение 5 секунд, переходим к демо-режиму
        new Promise((_, reject) => setTimeout(() => 
          reject(new Error('Timeout: провайдеры не отвечают')), 5000))
      ]);
      
      // Если успешно получили ответ от провайдера
      console.log(`Успешный ответ от провайдера: ${response.provider} (модель: ${response.model})`);
      return res.json(response);
      
    } catch (error) {
      console.log('Не удалось получить ответ от провайдеров, переключаемся на демо-режим:', error.message);
      
      // Если не удалось получить ответ от провайдеров, используем демо-ответы
      const demoResponse = findDemoResponse(userMessageText);
      
      return res.json({
        response: demoResponse,
        provider: 'booomerangs-demo',
        model: 'demo-mode',
        message: 'Используется демо-режим из-за недоступности внешних провайдеров'
      });
    }
    
  } catch (error) {
    console.error('Ошибка G4F API:', error);
    
    // Используем демо-ответы в случае ошибки
    let demoResponse;
    try {
      // Извлекаем текст сообщения пользователя
      const userMessage = message || 
        (messages && messages.length > 0 ? 
          messages.filter(m => m.role === 'user').pop()?.content : "");
      
      demoResponse = userMessage ? findDemoResponse(userMessage) : 
        "Извините, произошла ошибка, но я все равно готов помочь!";
    } catch (e) {
      demoResponse = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз или попробуйте другой вопрос.";
    }
    
    // Возвращаем демо-ответ клиенту
    return res.json({
      response: demoResponse,
      provider: 'booomerangs-demo',
      model: 'demo-mode',
      message: 'Используется демо-режим из-за внутренней ошибки'
    });
  }
});

// Получение списка доступных провайдеров
router.get('/providers', async (req, res) => {
  try {
    const providers = g4fProvider.getProviders();
    const models = g4fProvider.PROVIDER_MODELS;
    
    // Получаем информацию о доступности каждого провайдера
    const availabilityPromises = providers.map(async (provider) => {
      const available = await g4fProvider.checkProviderAvailability(provider);
      return {
        name: provider,
        available,
        model: models[provider] || null
      };
    });
    
    const providersInfo = await Promise.all(availabilityPromises);
    
    return res.json({
      providers: providersInfo,
      default: null // Автоматический выбор провайдера
    });
  } catch (error) {
    console.error('Ошибка при получении списка провайдеров:', error);
    return res.status(500).json({
      error: 'Не удалось получить список провайдеров',
      message: error.message
    });
  }
});

// API для проверки доступности конкретного провайдера
router.get('/check/:providerName', async (req, res) => {
  try {
    const { providerName } = req.params;
    
    if (!providerName) {
      return res.status(400).json({ error: 'Укажите имя провайдера' });
    }
    
    const available = await g4fProvider.checkProviderAvailability(providerName);
    
    return res.json({
      provider: providerName,
      available
    });
  } catch (error) {
    console.error(`Ошибка при проверке провайдера ${req.params.providerName}:`, error);
    return res.status(500).json({
      error: 'Не удалось проверить доступность провайдера',
      message: error.message
    });
  }
});

// API для простого тестирования
router.get('/test', (req, res) => {
  // Получаем только бесплатные провайдеры, не требующие API ключей
  const allProviders = g4fProvider.getProviders();
  const keyRequiredProviders = g4fProvider.KEY_REQUIRED_PROVIDERS;
  
  // Фильтруем провайдеры, исключая требующие API ключей
  const freeProviders = allProviders.filter(
    provider => !keyRequiredProviders.includes(provider)
  );
  
  res.json({
    status: 'ok',
    message: 'G4F API работает',
    availableProviders: freeProviders,
    note: 'Показаны только бесплатные провайдеры, не требующие API ключей'
  });
});

module.exports = router;