/**
 * DeepInfra Provider - интеграция с высококачественными моделями через DeepInfra
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Модели DeepInfra
const DEEPINFRA_MODELS = {
  mistral: "mistral-7b-instruct",
  mixtral: "mixtral-8x7b-instruct",
  llama: "llama-2-70b-chat",
  qwen: "qwen-14b-chat",
  codellama: "codellama-34b-instruct"
};

/**
 * Получение ответа от DeepInfra через Python G4F
 * @param {string} message - Запрос пользователя
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} - Ответ от DeepInfra
 */
async function getDeepInfraResponse(message, options = {}) {
  const model = options.model || "mixtral";
  const modelName = DEEPINFRA_MODELS[model] || DEEPINFRA_MODELS.mixtral;
  const promptType = options.promptType || 'general';
  
  // Выбираем системный промпт в зависимости от типа запроса
  let systemPrompt = "Вы полезный AI-ассистент. Отвечайте точно и информативно.";
  
  if (promptType === 'technical') {
    systemPrompt = "Вы технический эксперт. Предоставляйте детальные технические ответы с примерами кода, где это уместно.";
  } else if (promptType === 'creative') {
    systemPrompt = "Вы творческий ассистент. Помогайте с оригинальными идеями и креативными решениями.";
  }
  
  try {
    console.log(`DeepInfra: Запрос к модели ${modelName}...`);
    
    // Используем прямой вызов API для DeepInfra
    const response = await fetch('http://localhost:5004/python/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        provider: 'DeepInfra',
        model: modelName,
        systemPrompt,
        timeout: 25000  // Увеличенный таймаут для DeepInfra
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Проверяем ответ от сервера
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.response || data.response.trim() === '') {
      throw new Error('DeepInfra вернул пустой ответ');
    }
    
    console.log(`DeepInfra: Успешно получен ответ от модели ${modelName}`);
    
    return {
      success: true,
      response: data.response,
      provider: 'DeepInfra',
      model: modelName
    };
  } catch (error) {
    console.error(`DeepInfra Error: ${error.message}`);
    
    // Пробуем получить ответ через fallback систему
    try {
      console.log(`DeepInfra: Попытка получить ответ через fallback...`);
      
      // Используем общую систему с автопереключением
      const fallbackResponse = await fetch('http://localhost:5004/python/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          provider: 'DeepInfra_Mistral',  // Начинаем с Mixtral
          timeout: 15000
        }),
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.error) {
        throw new Error(fallbackData.error);
      }
      
      console.log(`DeepInfra: Успешно получен ответ через fallback`);
      
      return {
        success: true,
        response: fallbackData.response,
        provider: fallbackData.provider || 'DeepInfra-Fallback',
        model: fallbackData.model || modelName
      };
    } catch (fallbackError) {
      console.error(`DeepInfra Fallback Error: ${fallbackError.message}`);
      
      return {
        success: false,
        error: `Ошибка DeepInfra: ${error.message}`,
        provider: 'DeepInfra',
        model: modelName
      };
    }
  }
}

/**
 * Проверка доступности DeepInfra
 * @returns {Promise<boolean>} Доступен ли DeepInfra
 */
async function checkDeepInfraAvailability() {
  try {
    const testResult = await getDeepInfraResponse('Привет, это тестовый запрос.');
    return testResult.success;
  } catch (error) {
    console.error(`Ошибка при проверке DeepInfra: ${error.message}`);
    return false;
  }
}

// Маршрут для проверки статуса провайдера
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await checkDeepInfraAvailability();
    
    res.json({
      success: true,
      available: isAvailable,
      timestamp: new Date().toISOString(),
      message: isAvailable ? 'DeepInfra доступен' : 'DeepInfra недоступен'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: `Ошибка при проверке DeepInfra: ${error.message}`
    });
  }
});

// Маршрут для получения доступных моделей
router.get('/models', (req, res) => {
  res.json({
    success: true,
    models: DEEPINFRA_MODELS,
    defaultModel: 'mixtral'
  });
});

// API маршрут для отправки запроса к DeepInfra
router.post('/chat', async (req, res) => {
  const { message, model, promptType } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getDeepInfraResponse(message, {
      model,
      promptType
    });
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка обработки запроса: ${error.message}`
    });
  }
});

module.exports = router;
module.exports.getDeepInfraResponse = getDeepInfraResponse;
module.exports.checkDeepInfraAvailability = checkDeepInfraAvailability;