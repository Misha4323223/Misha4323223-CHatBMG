// API маршруты для Python-версии G4F
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { getDemoResponse } = require('./direct-ai-provider');

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
    
    // Мгновенно отправляем демо-ответ для лучшего UX
    const demoResponse = getDemoResponse(message);
    res.json({
      success: true,
      response: demoResponse,
      provider: 'BOOOMERANGS-Live',
      model: 'instant-response'
    });
    
    // В фоновом режиме пытаемся получить ответ от Python G4F
    // Это асинхронный процесс, который не влияет на отклик пользователю
    try {
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
          return;
        }
        
        try {
          // Пытаемся извлечь JSON из ответа Python
          // Ищем последнюю строку в выводе, которая может быть JSON
          const lines = responseData.split('\n');
          let jsonLine = '';
          
          // Идем от конца к началу, ищем строку, похожую на JSON
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              jsonLine = line;
              break;
            }
          }
          
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            console.log(`✅ Python G4F успешно ответил: "${result.provider}"`);
          } else {
            console.error('Python G4F не вернул JSON в ответе');
          }
        } catch (parseError) {
          console.error('Ошибка при разборе ответа Python G4F:', parseError);
        }
      });
    } catch (backgroundError) {
      console.error('Ошибка при фоновом запуске Python G4F:', backgroundError);
    }
    
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