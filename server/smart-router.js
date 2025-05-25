/**
 * Упрощенный интеллектуальный маршрутизатор - использует только g4f-provider.js
 */

const express = require('express');
const router = express.Router();

// Используем только g4f-provider.js с настроенными Qwen, Phind, Gemini
const g4fProvider = require('./g4f-provider');

/**
 * Анализирует сообщение и возвращает ответ от подходящего провайдера
 */
async function analyzeMessage(message, options = {}) {
  try {
    console.log('🧠 Умный анализ сообщения:', message.substring(0, 50) + '...');
    
    // Используем g4f-provider для получения ответа
    const response = await g4fProvider.getResponse(message, { 
      provider: 'auto',
      ...options 
    });
    
    if (response && response.response) {
      return {
        success: true,
        response: response.response,
        provider: response.provider || 'G4F',
        category: 'general'
      };
    } else {
      throw new Error('Не удалось получить ответ от провайдера');
    }
  } catch (error) {
    console.error('❌ Ошибка умного роутера:', error);
    return {
      success: false,
      error: error.message,
      response: 'Извините, произошла ошибка при обработке вашего запроса.'
    };
  }
}

// API роут для умного анализа
router.post('/analyze', async (req, res) => {
  try {
    const { message, options = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }
    
    const result = await analyzeMessage(message, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Ошибка API умного роутера:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;
module.exports.analyzeMessage = analyzeMessage;