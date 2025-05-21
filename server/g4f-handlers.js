// Обработчики API для G4F
const express = require('express');
const router = express.Router();
const g4fProvider = require('./g4f-provider');

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
    
    // Подготовка формата сообщений для API
    let chatMessages;
    if (messages) {
      // Если передан массив сообщений, используем его
      chatMessages = messages;
      console.log(`Запрос к G4F: провайдер=${provider || 'auto'}, ${messages.length} сообщений в истории`);
    } else {
      // Иначе создаем новое сообщение
      chatMessages = [{ role: 'user', content: message }];
      console.log(`Запрос к G4F: провайдер=${provider || 'auto'}, сообщение="${message.substring(0, 50)}..."`);
    }
    
    // Если указан конкретный провайдер, проверяем модель
    let selectedModel = model;
    if (provider && !model) {
      // Если модель не указана, получаем модель по умолчанию для данного провайдера
      selectedModel = g4fProvider.getModelForProvider(provider, model);
      console.log(`Для провайдера ${provider} выбрана модель: ${selectedModel}`);
    }
    
    // Выполняем запрос к провайдеру(ам)
    const response = await g4fProvider.getResponse(message, {
      provider,
      model: selectedModel,
      temperature,
      maxTokens,
      maxRetries: max_retries,
      messages: chatMessages
    });
    
    // Добавляем информацию о проверенных провайдерах
    if (response.successfulProviders) {
      console.log(`Успешный ответ от провайдера: ${response.provider} (модель: ${response.model})`);
    }
    
    // Если есть цитаты (например, от Perplexity), они будут включены в ответ
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
  res.json({
    status: 'ok',
    message: 'G4F API работает',
    availableProviders: g4fProvider.getProviders()
  });
});

module.exports = router;