// Простой и надежный стриминг для BOOOMERANGS
const express = require('express');
const router = express.Router();

console.log('🔥 SIMPLE-STREAMING.JS ЗАГРУЖЕН!');

// Простой стриминг маршрут
router.get('/chat', async (req, res) => {
  try {
    console.log('🚀 СТРИМИНГ ЗАПРОС ПОЛУЧЕН!');
    const { message } = req.query;
    
    if (!message) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }
    
    console.log('📝 Сообщение для стриминга:', message);
    
    // Настраиваем SSE заголовки
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Получаем ответ через умную маршрутизацию
    const smartRouter = require('./smart-router');
    const response = await smartRouter.getSmartResponse(message, {});
    
    if (response.success) {
      const fullText = response.response;
      console.log('✅ Получен ответ, начинаем стриминг:', fullText.substring(0, 50) + '...');
      
      // Отправляем текст по частям
      const chunkSize = 3;
      let currentIndex = 0;
      
      const sendNextChunk = () => {
        if (currentIndex < fullText.length) {
          const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);
          console.log(`📤 Отправляем chunk: "${chunk}"`);
          
          res.write(`data: ${JSON.stringify({ 
            type: 'chunk', 
            content: chunk,
            provider: response.provider 
          })}\n\n`);
          
          currentIndex += chunkSize;
          setTimeout(sendNextChunk, 50);
        } else {
          console.log('✅ Стриминг завершен');
          res.write(`data: ${JSON.stringify({ 
            type: 'complete',
            provider: response.provider,
            category: response.category || 'general'
          })}\n\n`);
          res.end();
        }
      };
      
      sendNextChunk();
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка получения ответа' })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('❌ Ошибка стриминга:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка сервера' })}\n\n`);
    res.end();
  }
});

module.exports = router;