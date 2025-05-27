// Маршруты для стриминга от провайдеров AI, которые поддерживают stream=True
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { getDemoResponse } = require('./direct-ai-provider');

// Провайдеры, которые поддерживают стриминг
const STREAMING_PROVIDERS = [
  'Qwen_Max',
  'Qwen_3',
  'DeepInfra',
  'Gemini',
  'GeminiPro',
  'You'
];

// API endpoint для стриминга через SSE (Server-Sent Events)
router.post('/chat', async (req, res) => {
  try {
    const { 
      message, 
      provider = 'Qwen_Max', // По умолчанию используем Qwen_Max, который хорошо поддерживает стриминг
      timeout = 30000 // 30 секунд таймаут по умолчанию
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`🔥 [DEBUG-STREAM] Запрос к стриминг API: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    console.log(`🔥 [DEBUG-STREAM] Полное сообщение: "${message}"`);
    
    // Проверяем умный роутер - нужен ли генератор изображений
    console.log(`🔥 [DEBUG-STREAM] Загружаем умный роутер...`);
    const { analyzeMessage } = require('./smart-router');
    console.log(`🔥 [DEBUG-STREAM] Анализируем сообщение через умный роутер...`);
    const messageAnalysis = analyzeMessage(message);
    console.log(`🔥 [DEBUG-STREAM] Результат анализа получен!`);
    
    console.log(`🧠 [STREAMING] Сообщение для анализа: "${message}"`);
    console.log(`🧠 [STREAMING] Анализ сообщения:`, messageAnalysis);
    console.log(`🧠 [STREAMING] Категория: ${messageAnalysis.category}`);
    console.log(`🧠 [STREAMING] Нужен ли генератор изображений?`, 
      messageAnalysis.category === 'image_generation' || messageAnalysis.category === 'image_edit');
    
    // Если это запрос на генерацию или редактирование изображения
    if (messageAnalysis.category === 'image_generation' || messageAnalysis.category === 'image_edit') {
      console.log('🎨 [STREAMING] Обнаружен запрос на изображения - переключаемся на генератор!');
      
      // Если это редактирование, получаем контекст предыдущего изображения
      let previousImage = null;
      if (messageAnalysis.category === 'image_edit') {
        const { getConversation } = require('./conversation-memory');
        const userId = `session_${sessionId}`;
        const conversation = getConversation(userId);
        previousImage = conversation.getLastImageInfo();
        console.log('🔄 [STREAMING] Найдено предыдущее изображение для редактирования:', previousImage);
      }
      
      // Импортируем генератор изображений
      const { generateImage } = require('./ai-image-generator');
      
      // Отправляем сообщение что начинаем генерацию
      res.write(`data: ${JSON.stringify({
        text: "🎨 Создаю изображение для вас...",
        provider: "AI_Image_Generator"
      })}\n\n`);
      
      // Получаем информацию о предыдущем изображении из памяти разговора
      const conversationMemory = require('./conversation-memory');
      const conversation = conversationMemory.getConversation(sessionId || 'anonymous');
      const lastImageInfo = conversation.getLastImageInfo();
      
      console.log('🔍 [STREAM] Информация о последнем изображении:', lastImageInfo ? 'Найдено' : 'Не найдено');
      if (lastImageInfo) {
        console.log('🖼️ [STREAM] URL последнего изображения:', lastImageInfo.url);
        console.log('📝 [STREAM] Описание последнего изображения:', lastImageInfo.description);
      }
      
      // Запускаем генерацию асинхронно
      setTimeout(() => {
        generateImage(message, 'realistic', lastImageInfo)
          .then(result => {
            if (result.success) {
              res.write(`data: ${JSON.stringify({
                text: `![Generated Image](${result.imageUrl})`,
                provider: "AI_Image_Generator",
                finished: true
              })}\n\n`);
            } else {
              res.write(`data: ${JSON.stringify({
                text: `❌ Ошибка: ${result.error}`,
                provider: "AI_Image_Generator",
                finished: true
              })}\n\n`);
            }
            res.end();
          })
          .catch(error => {
            res.write(`data: ${JSON.stringify({
              text: `❌ Произошла ошибка при генерации`,
              provider: "AI_Image_Generator",
              finished: true
            })}\n\n`);
            res.end();
          });
      }, 100);
      return;
    }
    
    // Настраиваем заголовки для SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // ДОБАВЛЯЕМ РЕАЛЬНЫЙ ВЕБ-ПОИСК ПЕРЕД AI
    console.log('🔥🔥🔥 [STREAMING-DEBUG] НАЧАЛО ПРОВЕРКИ ПОИСКА');
    console.log('🔍 [STREAMING] Проверяем, нужен ли веб-поиск для:', message);
    let enrichedMessage = message;
    
    // Проверяем keywords для поиска
    const searchKeywords = ['магазин', 'ресторан', 'кафе', 'где', 'адрес', 'найди', 'одежда', 'торговый', 'аптека', 'банк', 'салон', 'центр'];
    const needsSearch = searchKeywords.some(keyword => message.toLowerCase().includes(keyword));
    
    console.log('🔥🔥🔥 [DEBUG] needsSearch =', needsSearch);
    console.log('🔥🔥🔥 [DEBUG] searchKeywords найдены:', searchKeywords.filter(keyword => message.toLowerCase().includes(keyword)));
    
    if (needsSearch) {
      console.log('🔥🔥🔥 [STREAMING] ЗАПУСКАЕМ ВЕБ-ПОИСК!!!');
      try {
        const { searchRealTimeInfo } = require('./free-web-search');
        console.log('🔥🔥🔥 [DEBUG] searchRealTimeInfo загружен');
        const searchResults = await searchRealTimeInfo(message);
        console.log('🔥🔥🔥 [STREAMING] Результаты поиска получены:', searchResults ? searchResults.length : 'null');
        
        if (searchResults && searchResults.length > 0) {
          let searchInfo = '\n\n🔍 **АКТУАЛЬНАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА:**\n\n';
          searchResults.forEach((result, index) => {
            searchInfo += `${index + 1}. **${result.title}** (${result.source})\n`;
            searchInfo += `   ${result.snippet}\n`;
            searchInfo += `   🔗 ${result.url}\n\n`;
          });
          searchInfo += 'Используйте эту актуальную информацию для ответа пользователю.\n\n';
          enrichedMessage = searchInfo + message;
          console.log('🔍 [STREAMING] Сообщение обогащено поисковыми данными');
        }
      } catch (error) {
        console.log('🔍 [STREAMING] Ошибка веб-поиска:', error.message);
      }
    }
    
    // Получаем демо-ответ на случай ошибки
    const demoResponse = getDemoResponse(enrichedMessage);
    
    // Функция для отправки SSE событий
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Проверяем, поддерживает ли выбранный провайдер стриминг
    const supportsStreaming = STREAMING_PROVIDERS.includes(provider);
    if (!supportsStreaming) {
      console.log(`Провайдер ${provider} не поддерживает стриминг, переключаемся на Qwen_Max`);
      sendEvent('info', { 
        message: `Провайдер ${provider} не поддерживает стриминг, переключаемся на Qwen_Max`,
        provider: 'BOOOMERANGS'
      });
    }
    
    // Используем провайдер, который поддерживает стриминг
    const actualProvider = supportsStreaming ? provider : 'Qwen_Max';
    
    // Используем уже запущенный Python G4F сервер через HTTP API
    // ОТКЛЮЧЕНО: const pythonProcess = spawn('python', [
    //   'server/g4f_python_provider.py',
    //   message,
    //   actualProvider,
    //   'stream' // Ключевой параметр для активации стриминга
    // ])
    
    // Отправляем запрос к уже запущенному серверу через HTTP API
    const http = require('http');
    
    const requestData = JSON.stringify({
      message: enrichedMessage,
      provider: actualProvider
    });
    
    const options = {
      hostname: 'localhost',
      port: 5004,
      path: '/python/chat/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    // Создаем флаг для отслеживания завершения
    let isCompleted = false;
    
    const req = http.request(options, (httpRes) => {
      // Обрабатываем потоковые данные от HTTP API
      httpRes.on('data', (data) => {
      if (isCompleted) return;
      
      const outputText = data.toString();
      console.log(`Python streaming: ${outputText.substring(0, 50)}${outputText.length > 50 ? '...' : ''}`);
      
      // Ищем все JSON объекты в выводе
      const jsonObjects = outputText.match(/{[^{}]*}/g);
      
      if (jsonObjects) {
        for (const jsonStr of jsonObjects) {
          try {
            const jsonData = JSON.parse(jsonStr);
            
            // Обрабатываем разные типы данных стриминга
            if (jsonData.streaming) {
              if (jsonData.starting) {
                // Начало стриминга
                sendEvent('info', {
                  message: `Начинаем стриминг от ${jsonData.provider || 'AI'}`,
                  provider: jsonData.provider,
                  model: jsonData.model
                });
              } else if (jsonData.chunk) {
                // Отправляем чанк текста
                sendEvent('update', {
                  chunk: jsonData.chunk,
                  done: false,
                  provider: jsonData.provider,
                  model: jsonData.model
                });
              } else if (jsonData.complete) {
                // Завершение стриминга
                sendEvent('complete', {
                  message: 'Генерация текста завершена',
                  provider: jsonData.provider,
                  model: jsonData.model
                });
                
                // Устанавливаем флаг завершения
                isCompleted = true;
              } else if (jsonData.error) {
                // Ошибка в процессе стриминга
                sendEvent('error', {
                  message: jsonData.error,
                  provider: jsonData.provider || 'BOOOMERANGS'
                });
              }
            } else {
              // Обычный ответ (не от стриминга) - разбиваем на куски
              if (jsonData.response) {
                const words = jsonData.response.split(' ');
                let position = 0;
                
                // Отправляем слова порциями для имитации стриминга
                const interval = setInterval(() => {
                  if (position < words.length) {
                    const chunk = words.slice(position, position + 3).join(' ');
                    position += 3;
                    
                    sendEvent('update', {
                      chunk,
                      done: position >= words.length,
                      provider: jsonData.provider || 'BOOOMERANGS',
                      model: jsonData.model || 'fallback'
                    });
                    
                    if (position >= words.length) {
                      clearInterval(interval);
                      
                      // Отправляем событие завершения
                      sendEvent('complete', {
                        message: 'Генерация завершена',
                        provider: jsonData.provider || 'BOOOMERANGS',
                        model: jsonData.model || 'fallback'
                      });
                      
                      isCompleted = true;
                    }
                  } else {
                    clearInterval(interval);
                  }
                }, 100);
              }
            }
          } catch (parseError) {
            console.error('Ошибка при обработке JSON:', parseError);
            sendEvent('log', { message: jsonStr });
          }
        }
      } else {
        // Отправляем сырой вывод как лог
        sendEvent('log', { message: outputText });
      }
    });
    
    // Обрабатываем ошибки
    pythonProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      console.error(`Streaming Python ошибка: ${errorText}`);
      
      // Отправляем ошибку клиенту
      if (!isCompleted) {
        sendEvent('error', { message: errorText });
      }
    });
    
    // Устанавливаем таймаут для демо-ответа
    const demoDelay = Math.min(5000, timeout / 4);
    const demoTimeout = setTimeout(() => {
      if (!isCompleted) {
        console.log(`Запуск демо-ответа через ${demoDelay}мс`);
        
        // Отправляем уведомление о переключении на демо-режим
        sendEvent('info', {
          message: 'AI провайдер не отвечает, переключаемся на демо-режим',
          provider: 'BOOOMERANGS-Live'
        });
        
        // Отправляем демо-ответ по частям
        const demoWords = demoResponse.split(' ');
        let sentWords = 0;
        
        const demoInterval = setInterval(() => {
          if (sentWords < demoWords.length && !isCompleted) {
            const chunk = demoWords.slice(sentWords, sentWords + 3).join(' ');
            sentWords += 3;
            
            sendEvent('update', {
              chunk,
              done: sentWords >= demoWords.length,
              provider: 'BOOOMERANGS-Live',
              model: 'demo-mode'
            });
            
            if (sentWords >= demoWords.length) {
              clearInterval(demoInterval);
              
              // Отправляем событие завершения
              sendEvent('complete', {
                message: 'Демо-режим завершен',
                provider: 'BOOOMERANGS-Live',
                model: 'demo-mode'
              });
              
              isCompleted = true;
            }
          } else {
            clearInterval(demoInterval);
          }
        }, 100);
      }
    }, demoDelay);
    
    // Обрабатываем завершение процесса
    pythonProcess.on('close', (code) => {
      clearTimeout(demoTimeout);
      
      if (!isCompleted) {
        if (code !== 0) {
          console.error(`Python стриминг процесс завершился с кодом ${code}`);
          
          // Отправляем информацию об ошибке
          sendEvent('error', { 
            message: `Python процесс завершился с кодом ${code}` 
          });
          
          // Отправляем демо-ответ после ошибки
          sendEvent('update', {
            chunk: demoResponse,
            done: true,
            provider: 'BOOOMERANGS-Fallback',
            model: 'error-recovery'
          });
          
          // Отправляем событие завершения
          sendEvent('complete', {
            message: 'Генерация завершена (после ошибки)',
            provider: 'BOOOMERANGS-Fallback',
            model: 'error-recovery'
          });
        } else {
          // Процесс завершился успешно, но мы не получили complete событие
          sendEvent('complete', {
            message: 'Генерация завершена',
            provider: 'BOOOMERANGS',
            model: 'streaming-complete'
          });
        }
        
        isCompleted = true;
      }
    });
    
    // Обрабатываем закрытие соединения клиентом
    req.on('close', () => {
      // Убиваем процесс Python, если он еще запущен
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      
      // Очищаем таймер демо-ответа
      clearTimeout(demoTimeout);
      
      console.log('Клиент отключился');
    });
    
  } catch (error) {
    console.error('Ошибка при обработке запроса стриминга:', error);
    
    // Если соединение еще не начато, отправляем обычный JSON ответ с ошибкой
    if (!res.headersSent) {
      return res.status(500).json({
        success: false, 
        error: 'Ошибка при обработке запроса',
        message: error.message
      });
    }
  }
});

module.exports = router;