/**
 * Простая интеграция с ChatFree - провайдер для получения ответов от бесплатного AI
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch').default;

// Настройки API
const API_URL = 'https://chatfree.org/api/chat/completions';

/**
 * Получение ответа от ChatFree
 * @param {string} message - Текст запроса пользователя
 * @param {Object} options - Дополнительные опции
 * @returns {Promise<Object>} - Ответ от API
 */
async function getChatFreeResponse(message, options = {}) {
  const model = options.model || 'gpt-3.5-turbo';
  const systemPrompt = options.systemPrompt || 'Вы полезный ассистент. Отвечайте точно и по существу.';
  const temperature = options.temperature || 0.7;
  
  try {
    console.log(`ChatFree: Отправка запроса к API...`);
    
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: temperature,
      max_tokens: 1000,
      stream: false
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatFree API вернул ошибку ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices.length || !data.choices[0].message) {
      throw new Error('Неверный формат ответа от ChatFree API');
    }
    
    return {
      success: true,
      response: data.choices[0].message.content,
      provider: 'ChatFree',
      model: model
    };
  } catch (error) {
    console.error(`ChatFree Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      provider: 'ChatFree',
      model: model
    };
  }
}

// API маршрут
router.post('/chat', async (req, res) => {
  const { message, systemPrompt, model, temperature } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо указать сообщение'
    });
  }
  
  try {
    const response = await getChatFreeResponse(message, {
      systemPrompt,
      model,
      temperature
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
module.exports.getChatFreeResponse = getChatFreeResponse;