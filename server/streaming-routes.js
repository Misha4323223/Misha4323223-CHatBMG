const { analyzeMessage } = require('./smart-router'); // Импортируем в начале файла
const { generateImage } = require('./ai-image-generator');
const { getConversation } = require('./conversation-memory');

const demoDelay = 1500;

module.exports = async function apiChatStream(req, res) {
  try {
    // Получаем sessionId из тела запроса (или заголовков, если нужно)
    const { sessionId } = req.body || {};
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*', // CORS-заголовок для запросов из браузера
      'X-Accel-Buffering': 'no'
    });

    res.flushHeaders();

    // Обрабатываем анализ сообщения
    const messageAnalysis = analyzeMessage(req.body);
    console.log('🔍 [STREAMING] Анализ сообщения:', messageAnalysis);
    console.log('📝 [STREAMING] Категория:', messageAnalysis.category);
    console.log('📝 [STREAMING] Промпт:', messageAnalysis.prompt);

    // Ищем предыдущее изображение, если запрос — редактирование картинки
    let previousImage = null;
    if (messageAnalysis.category === 'image_edit') {
      const userId = `session_${sessionId}`;
      console.log('🔍 [STREAMING] Ищем предыдущее изображение для userId:', userId);
      const conversation = getConversation(userId);
      console.log('💬 [STREAMING] Получена беседа, сообщений в памяти:', conversation?.messages?.length || 0);
      previousImage = conversation.getLastImageInfo();
      console.log('🔄 [STREAMING] Найдено предыдущее изображение для редактирования:', previousImage);
      
      if (previousImage) {
        console.log('✅ [STREAMING] Будем редактировать изображение:', previousImage.url);
      } else {
        console.log('❌ [STREAMING] Предыдущее изображение не найдено, будет создано новое');
      }
    }

    // Генерируем изображение, если нужно
    if (messageAnalysis.category === 'image_create' || messageAnalysis.category === 'image_edit') {
      try {
        const imageUrl = await generateImage({
          prompt: messageAnalysis.prompt,
          previousImage
        });
        res.write(`event: image\n`);
        res.write(`data: ${JSON.stringify({ imageUrl })}\n\n`);
      } catch (imageError) {
        console.error('Ошибка генерации изображения:', imageError);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ error: 'Ошибка генерации изображения' })}\n\n`);
      }
      res.end();
      return; // Заканчиваем работу, если это была генерация изображения
    }

    // Запускаем Python-процесс (например, для анализа или генерации текста)
    const pythonProcess = startPythonProcess(req.body);

    let isCompleted = false;
    let demoSent = false;

    // Таймаут для отправки демо-ответа, если Python долго не отвечает
    const demoTimeout = setTimeout(() => {
      if (!isCompleted && !demoSent) {
        demoSent = true;
        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify({
          role: 'assistant',
          content: 'Демо-ответ: ваш запрос обрабатывается, пожалуйста, подождите...'
        })}\n\n`);
      }
    }, demoDelay);

    pythonProcess.stdout.on('data', (chunk) => {
      try {
        const outputText = chunk.toString();
        console.log('Получен фрагмент от Python:', outputText);

        // Ищем все JSON-объекты на отдельной строке
        const lines = outputText.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);

            // Проверяем, не завершен ли ответ
            if (json.done) {
              isCompleted = true;
              clearTimeout(demoTimeout);
              res.write(`event: done\n`);
              res.write(`data: {}\n\n`);
              if (!res.writableEnded) res.end();
              return;
            }

            // Отправляем данные клиенту
            res.write(`event: message\n`);
            res.write(`data: ${JSON.stringify(json)}\n\n`);
          } catch (parseErr) {
            console.warn('Ошибка парсинга JSON из строки:', line);
          }
        }
      } catch (err) {
        console.error('Ошибка обработки данных Python:', err);
      }
    });

    pythonProcess.on('close', (code) => {
      isCompleted = true;
      clearTimeout(demoTimeout);
      if (!res.writableEnded) {
        res.write(`event: done\n`);
        res.write(`data: {}\n\n`);
        res.end();
      }
      console.log(`Python-процесс завершился с кодом ${code}`);
    });

    req.on('close', () => {
      console.log('Клиент закрыл соединение');
      if (!res.writableEnded) res.end();
      pythonProcess.kill();
    });

  } catch (error) {
    console.error('Ошибка в apiChatStream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    } else if (!res.writableEnded) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: 'Внутренняя ошибка сервера' })}\n\n`);
      res.end();
    }
  }
};


// Заглушка функции запуска Python-процесса
function startPythonProcess(body) {
  // Здесь запускается python process, например через child_process.spawn
  // Пример:
  // const { spawn } = require('child_process');
  // const py = spawn('python3', ['script.py']);
  // py.stdin.write(JSON.stringify(body));
  // py.stdin.end();
  // return py;

  // Для примера вернем EventEmitter заглушку (замени на реальный процесс)
  const { EventEmitter } = require('events');
  const emitter = new EventEmitter();

  // Через 2 секунды отправим "завершение"
  setTimeout(() => {
    emitter.emit('close', 0);
  }, 2000);

  // Имитация данных — отправим JSON-строки через setTimeout
  setTimeout(() => {
    emitter.emit('data', Buffer.from(JSON.stringify({ role: 'assistant', content: 'Привет от Python!' }) + '\n'));
  }, 500);

  return emitter;
}