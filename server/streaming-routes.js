// Маршруты для стриминга от провайдеров AI, которые поддерживают stream=True
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { getDemoResponse } = require('./direct-ai-provider');

// Импортируем функции для работы с чатом
const chatHistory = require('./chat-history');

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
      timeout = 30000, // 30 секунд таймаут по умолчанию
      sessionId
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`Запрос к стриминг API: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Создаем сессию, если её нет
    let currentSessionId = sessionId;
    console.log(`🔍 Получен sessionId: ${sessionId}, currentSessionId: ${currentSessionId}`);
    
    if (!currentSessionId && message) {
      console.log('💬 Создаем новую сессию для стриминга...');
      const newSession = await chatHistory.createChatSession(1, message.substring(0, 50));
      currentSessionId = newSession.id;
      console.log(`✅ Создана новая стриминговая сессия: ${currentSessionId}`);
    } else {
      console.log(`📌 Используем существующую сессию: ${currentSessionId}`);
    }
    
    // Сохраняем сообщение пользователя
    if (currentSessionId && message) {
      console.log('💾 Сохраняем сообщение пользователя в стриминге...');
      await chatHistory.saveMessage({
        sessionId: currentSessionId,
        sender: 'user',
        content: message,
        provider: null
      });
      console.log('✅ Сообщение пользователя сохранено в стриминге');
    }
    
    // Настраиваем заголовки для SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Получаем демо-ответ на случай ошибки
    const demoResponse = getDemoResponse(message);
    
    // Переменная для сбора полного ответа AI
    let fullAiResponse = '';
    let usedProvider = 'BOOOMERANGS';
    
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
    
    // Запускаем Python скрипт с включенным стримингом
    const pythonProcess = spawn('python', [
      'server/g4f_python_provider.py',
      message,
      actualProvider,
      'stream' // Ключевой параметр для активации стриминга
    ]);
    
    // Создаем флаг для отслеживания завершения
    let isCompleted = false;
    
    // Обрабатываем вывод от скрипта
    pythonProcess.stdout.on('data', (data) => {
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
                // Собираем полный ответ
                fullAiResponse += jsonData.chunk;
                usedProvider = jsonData.provider || 'BOOOMERANGS';
                
                // Отправляем чанк текста
                sendEvent('update', {
                  chunk: jsonData.chunk,
                  done: false,
                  provider: jsonData.provider,
                  model: jsonData.model
                });
              } else if (jsonData.complete) {
                // Сохраняем полный ответ AI в базу данных
                if (currentSessionId && fullAiResponse.trim()) {
                  console.log('💾 Сохраняем стриминговый ответ AI...');
                  chatHistory.saveMessage({
                    sessionId: currentSessionId,
                    sender: 'ai',
                    content: fullAiResponse.trim(),
                    provider: usedProvider
                  }).then(() => {
                    console.log(`✅ Стриминговый ответ сохранен (${usedProvider})`);
                  }).catch(err => {
                    console.error('Ошибка сохранения стримингового ответа:', err);
                  });
                }
                
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
                // Сохраняем полный ответ сразу
                fullAiResponse = jsonData.response;
                usedProvider = jsonData.provider || 'BOOOMERANGS';
                
                const words = jsonData.response.split(' ');
                let position = 0;
                
                // Отправляем слова порциями для имитации стриминга
                const interval = setInterval(async () => {
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
                      
                      // Сохраняем полный ответ AI в базу данных
                      if (currentSessionId && fullAiResponse.trim()) {
                        console.log('💾 Сохраняем ответ AI (обычный режим)...');
                        await chatHistory.saveMessage({
                          sessionId: currentSessionId,
                          sender: 'ai',
                          content: fullAiResponse.trim(),
                          provider: usedProvider
                        });
                        console.log(`✅ Ответ AI сохранен (${usedProvider})`);
                      }
                      
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