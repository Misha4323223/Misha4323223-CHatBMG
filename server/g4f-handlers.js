// Обработчики API для G4F
const express = require('express');
const router = express.Router();
const g4fProvider = require('./g4f-provider');

// API endpoint для чата с моделями G4F
router.post('/chat', async (req, res) => {
  try {
    const { message, provider = 'qwen', model = null, temperature = 0.7, maxTokens = 800, max_retries = 3 } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Отсутствует параметр message',
        response: 'Пожалуйста, укажите сообщение для обработки'
      });
    }
    
    console.log(`Запрос к G4F: провайдер=${provider}, сообщение="${message.substring(0, 50)}..."`);
    
    const response = await g4fProvider.getResponse(message, {
      provider,
      model,
      temperature,
      maxTokens,
      maxRetries: max_retries
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка G4F API:', error);
    
    // Возвращаем понятную ошибку клиенту
    return res.status(500).json({
      error: 'Ошибка при обработке запроса',
      message: error.message,
      response: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте другого провайдера или повторите попытку позже.',
      provider: 'error',
      model: 'none'
    });
  }
});

// Получение списка доступных провайдеров
router.get('/providers', async (req, res) => {
  try {
    const providers = g4fProvider.getProviders();
    
    // Получаем информацию о доступности каждого провайдера
    const availabilityPromises = providers.map(async (provider) => {
      const available = await g4fProvider.checkProviderAvailability(provider);
      return {
        name: provider,
        available
      };
    });
    
    const providersInfo = await Promise.all(availabilityPromises);
    
    return res.json({
      providers: providersInfo,
      default: 'qwen'
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
  res.json({
    status: 'ok',
    message: 'G4F API работает',
    availableProviders: g4fProvider.getProviders()
  });
});

module.exports = router;