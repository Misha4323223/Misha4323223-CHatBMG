/**
 * Прямое подключение к Python G4F без промежуточных провайдеров
 * Только живые ответы от настоящих AI моделей
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Прямое подключение к Python G4F с живыми ответами
 */
async function getPythonG4FResponse(message, provider = 'Qwen_Qwen_2_5_Max') {
  try {
    console.log(`🎯 Прямой запрос к Python G4F: ${message.substring(0, 50)}...`);
    
    const response = await axios.post('http://localhost:5004/python/chat', {
      message: message,
      provider: provider
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    if (response.data && response.data.response) {
      console.log(`✅ Python G4F ответил: ${response.data.provider}`);
      
      return {
        success: true,
        response: response.data.response,
        provider: response.data.provider || 'G4F-Auto',
        model: response.data.model || 'gpt-3.5-turbo',
        elapsed: response.data.elapsed || 0
      };
    }

    throw new Error('Пустой ответ от Python G4F');
    
  } catch (error) {
    console.log(`❌ Python G4F недоступен: ${error.message}`);
    
    return {
      success: false,
      error: `Python G4F недоступен: ${error.message}`,
      provider: 'Python-G4F'
    };
  }
}

// API маршрут для чата
router.post('/chat', async (req, res) => {
  const { message, provider } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Сообщение не может быть пустым'
    });
  }
  
  try {
    const result = await getPythonG4FResponse(message, provider);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Ошибка: ${error.message}`
    });
  }
});

// Проверка статуса Python G4F
router.get('/status', async (req, res) => {
  try {
    const testResponse = await getPythonG4FResponse('test');
    
    res.json({
      success: true,
      status: testResponse.success ? 'available' : 'unavailable',
      provider: 'Python-G4F'
    });
  } catch (error) {
    res.json({
      success: false,
      status: 'unavailable',
      error: error.message
    });
  }
});

module.exports = router;
module.exports.getPythonG4FResponse = getPythonG4FResponse;