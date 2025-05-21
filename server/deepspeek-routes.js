/**
 * Маршруты для DeepSpeek провайдера - специализированного AI для технических вопросов
 */

const express = require('express');
const router = express.Router();
const deepspeekProvider = require('./deepspeek-provider');

// Основной маршрут для текстового чата с DeepSpeek
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }
    
    console.log(`DeepSpeek запрос: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Получаем ответ от DeepSpeek
    const response = await deepspeekProvider.getDeepSpeekResponse(message);
    
    return res.json({
      success: true,
      response: response.response,
      provider: 'DeepSpeek',
      model: response.model || 'deepseek-chat-local'
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса к DeepSpeek:', error);
    res.status(500).json({
      success: false,
      error: 'Произошла ошибка при обработке запроса'
    });
  }
});

// Проверка доступности DeepSpeek провайдера
router.get('/status', (req, res) => {
  res.json({
    success: true,
    available: true,
    provider: 'DeepSpeek',
    model: 'deepseek-chat-local',
    specialized: 'Технические вопросы и программирование'
  });
});

module.exports = router;