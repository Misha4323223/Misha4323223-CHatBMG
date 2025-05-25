/**
 * Утилита для проверки доступности AI провайдеров
 */

const express = require('express');
const router = express.Router();

// Импортируем провайдеры
const simpleChatFree = require('./simple-chatfree');
const deepspeek = require('./deepspeek-fixed');
// FastDirectAI удален - используем только настоящие AI провайдеры
const pythonProviderRoutes = require('./python_provider_routes');

// Маршрут для проверки состояния всех провайдеров
router.get('/status', async (req, res) => {
  // Устанавливаем заголовок для явного указания типа контента
  res.setHeader('Content-Type', 'application/json');
  const results = {
    timestamp: new Date().toISOString(),
    providers: {}
  };
  
  // Проверка ChatFree
  try {
    const chatFreeResponse = await simpleChatFree.getChatFreeResponse("Привет, как дела?");
    results.providers.chatFree = {
      available: chatFreeResponse.success,
      status: chatFreeResponse.success ? 'working' : 'error',
      error: chatFreeResponse.error || null
    };
  } catch (error) {
    results.providers.chatFree = {
      available: false,
      status: 'error',
      error: error.message
    };
  }
  
  // Проверка DeepSpeek
  try {
    const deepSpeekResponse = await deepspeek.getDeepSpeekResponse("Что такое JavaScript?");
    results.providers.deepSpeek = {
      available: deepSpeekResponse.success,
      status: deepSpeekResponse.response.includes('BOOOMERANGS') ? 'demo_mode' : 'working',
      error: null
    };
  } catch (error) {
    results.providers.deepSpeek = {
      available: false,
      status: 'error',
      error: error.message
    };
  }
  
  // Проверка Python G4F
  try {
    const pythonAvailable = await pythonProviderRoutes.checkPythonProvider();
    if (pythonAvailable) {
      const pythonResponse = await pythonProviderRoutes.callPythonAI("Привет, как дела?");
      results.providers.pythonG4F = {
        available: true,
        status: 'working',
        error: null
      };
    } else {
      results.providers.pythonG4F = {
        available: false,
        status: 'not_available',
        error: 'Python G4F сервер не отвечает'
      };
    }
  } catch (error) {
    results.providers.pythonG4F = {
      available: false,
      status: 'error',
      error: error.message
    };
  }
  
  // Проверка Direct AI Provider
  try {
    const directResponse = await directAiProvider.getChatResponse("Привет, как дела?");
    results.providers.directAi = {
      available: directResponse.success !== false,
      status: directResponse.success !== false ? 'working' : 'error',
      error: directResponse.error || null,
      provider: directResponse.provider || null
    };
  } catch (error) {
    results.providers.directAi = {
      available: false,
      status: 'error',
      error: error.message
    };
  }
  
  // Добавляем общее состояние
  results.overall = {
    anyProviderAvailable: Object.values(results.providers).some(p => p.available),
    recommendedProvider: null
  };
  
  // Определяем рекомендуемый провайдер
  if (results.providers.pythonG4F?.available) {
    results.overall.recommendedProvider = 'pythonG4F';
  } else if (results.providers.directAi?.available) {
    results.overall.recommendedProvider = 'directAi';
  } else if (results.providers.chatFree?.available) {
    results.overall.recommendedProvider = 'chatFree';
  } else if (results.providers.deepSpeek?.available) {
    results.overall.recommendedProvider = 'deepSpeek';
  }
  
  res.json(results);
});

// Маршрут для получения списка поддерживаемых провайдеров
router.get('/list', (req, res) => {
  const providers = [];
  
  // Добавляем стандартные провайдеры
  providers.push({
    id: 'chatfree',
    name: 'ChatFree',
    type: 'standard',
    description: 'Бесплатный доступ к GPT без API ключа'
  });
  
  providers.push({
    id: 'deepspeek',
    name: 'DeepSpeek',
    type: 'technical',
    description: 'Специализированный AI для технических вопросов'
  });
  
  providers.push({
    id: 'python',
    name: 'Python G4F',
    type: 'standard',
    description: 'Доступ к различным AI моделям через Python G4F'
  });
  
  // Динамически добавляем провайдеры из direct-ai-provider
  try {
    const { AI_PROVIDERS } = directAiProvider;
    if (AI_PROVIDERS && Array.isArray(AI_PROVIDERS)) {
      AI_PROVIDERS.forEach(providerName => {
        providers.push({
          id: providerName.toLowerCase(),
          name: providerName,
          type: 'direct',
          description: `Прямой доступ к провайдеру ${providerName}`
        });
      });
    }
  } catch (error) {
    console.error('Ошибка получения провайдеров:', error);
  }
  
  res.json({
    count: providers.length,
    providers
  });
});

module.exports = router;