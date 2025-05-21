// API маршруты для Python-версии G4F
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

// API endpoint для чата с Python G4F
router.post('/chat', async (req, res) => {
  try {
    const { 
      message, 
      provider = null
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`Запрос к Python G4F: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Вызываем Python скрипт с сообщением и опциональным провайдером
    const args = [
      'server/g4f_python_provider.py',
      message
    ];
    
    // Если указан провайдер, добавляем его в аргументы
    if (provider) {
      args.push(provider);
    }
    
    // Вызываем скрипт как дочерний процесс
    const pythonProcess = spawn('python', args);
    
    let responseData = '';
    let errorData = '';
    
    // Обрабатываем вывод скрипта
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    // Обрабатываем ошибки скрипта
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Ошибка Python G4F: ${data.toString()}`);
    });
    
    // Обрабатываем завершение работы скрипта
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python G4F завершился с кодом ${code}: ${errorData}`);
        return res.status(500).json({ 
          success: false, 
          error: errorData || 'Ошибка при выполнении Python скрипта',
          code
        });
      }
      
      try {
        // Парсим JSON-ответ от Python
        const result = JSON.parse(responseData);
        
        // Возвращаем успешный результат
        res.json({
          success: true,
          response: result.response,
          provider: result.provider,
          model: result.model
        });
      } catch (parseError) {
        console.error('Ошибка при разборе ответа Python G4F:', parseError);
        
        // Возвращаем ответ как есть, если его не удалось распарсить
        res.json({
          success: true,
          response: responseData,
          provider: 'BOOOMERANGS-Python-Raw',
          model: 'unknown',
          parseError: parseError.message
        });
      }
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    
    res.status(500).json({
      success: false, 
      error: 'Ошибка при обработке запроса',
      message: error.message
    });
  }
});

module.exports = router;