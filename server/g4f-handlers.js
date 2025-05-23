const express = require('express');
const router = express.Router();

// Импорт провайдеров
const g4fProvider = require('./g4f-provider');
const freeChatProvider = require('./freechat-enhanced');
const deepspeekProvider = require('./deepspeek-fixed');

// Функция поиска демо-ответа
function findDemoResponse(message) {
  const responses = [
    "Отличный вопрос! Я готов помочь вам разобраться с этой темой.",
    "Интересная задача! Давайте решим её пошагово.",
    "Это важная тема. Вот что я могу предложить по вашему вопросу.",
    "Хороший запрос! Я предоставлю вам подробную информацию.",
    "Понимаю ваш интерес к этой теме. Вот мой анализ."
  ];
  
  const hash = message.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return responses[Math.abs(hash) % responses.length];
}

// Основной обработчик чата
router.post('/chat', async (req, res) => {
  try {
    const { message, provider = 'auto', messages = [] } = req.body;
    
    if (!message && (!messages || messages.length === 0)) {
      return res.status(400).json({
        error: 'Сообщение не может быть пустым'
      });
    }

    const userMessageText = message || (messages.length > 0 ? 
      messages.filter(m => m.role === 'user').pop()?.content : '');

    console.log(`Запрос к G4F: провайдер=${provider}, сообщение="${userMessageText?.substring(0, 50)}..."`);

    // Пробуем FreeChat Enhanced (самый стабильный)
    try {
      console.log('🚀 Пробуем FreeChat Enhanced...');
      const freeChatResponse = await freeChatProvider.getChatFreeEnhancedResponse(userMessageText);
      
      if (freeChatResponse && freeChatResponse.success && freeChatResponse.response) {
        console.log('✅ FreeChat Enhanced ответил успешно!');
        return res.json({
          response: freeChatResponse.response,
          provider: freeChatResponse.provider || 'FreeChat Enhanced',
          model: freeChatResponse.model || 'Qwen_Qwen_2_5_Max'
        });
      }
    } catch (error) {
      console.log('⚠️ FreeChat Enhanced не сработал:', error.message);
    }

    // Резервный вариант - демо ответы
    const demoResponse = findDemoResponse(userMessageText);
    return res.json({
      response: demoResponse,
      provider: 'booomerangs-demo',
      model: 'demo-mode'
    });

  } catch (error) {
    console.error('Ошибка G4F API:', error);
    
    const demoResponse = findDemoResponse(req.body.message || 'общий вопрос');
    return res.json({
      response: demoResponse,
      provider: 'booomerangs-demo',
      model: 'demo-mode'
    });
  }
});

// Получение списка провайдеров
router.get('/providers', async (req, res) => {
  try {
    const providers = {
      'freechat': 'FreeChat Enhanced',
      'deepspeek': 'DeepSpeek',
      'demo': 'Demo Mode'
    };
    
    res.json({
      success: true,
      providers: providers,
      available: Object.keys(providers)
    });
  } catch (error) {
    console.error('Ошибка получения провайдеров:', error);
    res.status(500).json({
      error: 'Ошибка получения списка провайдеров'
    });
  }
});

module.exports = router;