// API маршруты для Python-версии G4F
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const { getDemoResponse } = require('./direct-ai-provider');

// Хранилище для активных SSE клиентов
const sseClients = new Map();

// API endpoint для чата с Python G4F
// Эндпоинт для стриминга ответов с использованием Server-Sent Events (SSE)
router.post('/chat/stream', (req, res) => {
  try {
    const { 
      message, 
      provider = null,
      clientId = Date.now().toString(), // Уникальный ID для клиента
      timeout = 20000 // Таймаут по умолчанию - 20 секунд
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Сообщение не может быть пустым' 
      });
    }
    
    console.log(`Запрос к Python G4F (стриминг): ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Настраиваем заголовки для SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Получаем демо-ответ на случай ошибки
    const demoResponse = getDemoResponse(message);
    
    // Отправляем начальное сообщение клиенту
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Добавляем клиента в хранилище
    sseClients.set(clientId, { res, sendEvent });
    
    // Отправляем первое сообщение с подтверждением подключения
    sendEvent('connected', { 
      message: 'Соединение установлено',
      clientId
    });
    
    // Вызываем Python скрипт с сообщением и опциональным провайдером
    const args = [
      'server/g4f_python_provider.py',
      message
    ];
    
    // Если указан провайдер, добавляем его в аргументы
    if (provider) {
      args.push(provider);
    }
    
    // Создаем флаг для отслеживания завершения
    let isCompleted = false;
    
    // Запускаем демо-ответ через задержку, если Python не ответит быстро
    // Используем переданный таймаут или значение по умолчанию
    const demoDelay = Math.min(5000, timeout / 4); // Не больше 5 секунд, но не меньше 1/4 от общего таймаута
    console.log(`⏱️ Настроен таймаут для демо-ответа: ${demoDelay}мс, общий таймаут: ${timeout}мс`);
    
    const demoTimeout = setTimeout(() => {
      if (!isCompleted) {
        console.log(`Запуск демо-ответа после ${demoDelay}мс ожидания...`);
        
        // Отправляем уведомление о переключении на демо-режим
        sendEvent('info', {
          message: 'AI провайдер отвечает дольше обычного, начинаем отображать демо-ответ',
          provider: 'BOOOMERANGS-Live'
        });
        
        // Отправляем демо-ответ по частям для имитации стриминга
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
              model: 'streaming-demo'
            });
            
            if (sentWords >= demoWords.length) {
              clearInterval(demoInterval);
              
              // Отправляем событие завершения
              sendEvent('complete', {
                message: 'Генерация завершена',
                provider: 'BOOOMERANGS-Live',
                model: 'streaming-demo'
              });
              
              // Удаляем клиента из хранилища
              isCompleted = true;
              sseClients.delete(clientId);
            }
          } else {
            clearInterval(demoInterval);
          }
        }, 100); // Отправляем каждые 100мс для имитации печати
      }
    }, demoDelay);
    
    // Вызываем скрипт как дочерний процесс
    const pythonProcess = spawn('python', args);
    
    // Обрабатываем частичные ответы от скрипта
    pythonProcess.stdout.on('data', (data) => {
      // Если соединение уже закрыто, прерываем обработку
      if (isCompleted) return;
      
      const outputText = data.toString();
      
      // Проверяем, содержит ли вывод JSON
      if (outputText.includes('{') && outputText.includes('}')) {
        try {
          // Пытаемся найти JSON в выводе
          const jsonMatch = outputText.match(/{.*}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            // Отправляем полный ответ
            clearTimeout(demoTimeout);
            isCompleted = true;
            
            // Отправляем ответ по словам для имитации стриминга
            const responseWords = jsonData.response.split(' ');
            let sentWords = 0;
            
            const streamInterval = setInterval(() => {
              if (sentWords < responseWords.length) {
                const chunk = responseWords.slice(sentWords, sentWords + 3).join(' ');
                sentWords += 3;
                
                sendEvent('update', {
                  chunk,
                  done: sentWords >= responseWords.length,
                  provider: jsonData.provider || 'Python-G4F',
                  model: jsonData.model || 'g4f-python'
                });
                
                if (sentWords >= responseWords.length) {
                  clearInterval(streamInterval);
                  
                  // Отправляем событие завершения
                  sendEvent('complete', {
                    message: 'Генерация завершена',
                    provider: jsonData.provider || 'Python-G4F',
                    model: jsonData.model || 'g4f-python'
                  });
                  
                  // Удаляем клиента из хранилища
                  sseClients.delete(clientId);
                }
              } else {
                clearInterval(streamInterval);
              }
            }, 100); // Отправляем небольшими кусками каждые 100мс
          } else {
            // Если JSON не найден, отправляем сырой вывод как обновление
            sendEvent('log', { message: outputText });
          }
        } catch (jsonError) {
          console.error('Ошибка при обработке JSON из Python:', jsonError);
          sendEvent('log', { message: outputText });
        }
      } else {
        // Отправляем любой другой вывод как лог
        sendEvent('log', { message: outputText });
      }
    });
    
    // Обрабатываем ошибки
    pythonProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      console.error(`Ошибка Python G4F: ${errorText}`);
      
      // Отправляем ошибку клиенту
      if (!isCompleted) {
        sendEvent('error', { message: errorText });
      }
    });
    
    // Обрабатываем завершение процесса
    pythonProcess.on('close', (code) => {
      if (code !== 0 && !isCompleted) {
        console.error(`Python G4F завершился с кодом ${code}`);
        
        // Если процесс завершился с ошибкой и ещё не был отправлен ответ
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
      }
      
      // Закрываем соединение, если оно ещё открыто
      if (!isCompleted) {
        isCompleted = true;
        sseClients.delete(clientId);
      }
    });
    
    // Обрабатываем закрытие соединения клиентом
    req.on('close', () => {
      isCompleted = true;
      clearTimeout(demoTimeout);
      
      // Убиваем процесс Python, если он ещё запущен
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      
      // Удаляем клиента из хранилища
      sseClients.delete(clientId);
      console.log(`Клиент ${clientId} отключился`);
    });
    
  } catch (error) {
    console.error('Ошибка при обработке запроса стриминга:', error);
    
    // Если соединение ещё открыто, отправляем ошибку
    if (!res.headersSent) {
      res.status(500).json({
        success: false, 
        error: 'Ошибка при обработке запроса',
        message: error.message
      });
    }
  }
});

// Обычный API endpoint для чата с Python G4F
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
    
    // Сейчас изменим поведение - будем ждать настоящий ответ от Python провайдера
    // и только при таймауте или ошибке вернем демо-ответ
    const demoResponse = getDemoResponse(message);
    
    // Устанавливаем таймаут для ответа, но теперь больше времени (20 сек)
    const timeoutMs = 20000; // 20 секунд на получение ответа (Qwen может работать медленно)
    let responseTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log('⏱️ Таймаут при ожидании ответа от Python G4F, отправляем демо-ответ');
        res.json({
          success: true,
          response: demoResponse,
          provider: 'BOOOMERANGS-Live',
          model: 'instant-response (timeout)'
        });
      }
    }, timeoutMs);
    
    // Пытаемся получить реальный ответ от Python G4F
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
        // Очищаем таймаут, чтобы избежать отправки демо-ответа
        clearTimeout(responseTimeout);
        
        if (code !== 0) {
          console.error(`Python G4F завершился с кодом ${code}: ${errorData}`);
          if (!res.headersSent) {
            res.json({
              success: true,
              response: demoResponse,
              provider: 'BOOOMERANGS-Live',
              model: 'instant-response (python error)'
            });
          }
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
            
            // Если у нас есть ответ и заголовки еще не отправлены
            if (!res.headersSent) {
              res.json({
                success: true,
                response: result.response || responseData,
                provider: result.provider || 'Python-G4F',
                model: result.model || 'unknown'
              });
            }
          } else if (responseData.trim()) {
            // Если JSON не найден, но есть текстовый ответ
            console.log('Python G4F вернул текстовый ответ');
            if (!res.headersSent) {
              res.json({
                success: true,
                response: responseData.trim(),
                provider: 'Python-G4F',
                model: 'direct-response'
              });
            }
          } else {
            console.error('Python G4F не вернул JSON в ответе');
            if (!res.headersSent) {
              res.json({
                success: true,
                response: demoResponse,
                provider: 'BOOOMERANGS-Live',
                model: 'instant-response (empty python response)'
              });
            }
          }
        } catch (parseError) {
          console.error('Ошибка при разборе ответа Python G4F:', parseError);
          if (!res.headersSent) {
            res.json({
              success: true,
              response: demoResponse,
              provider: 'BOOOMERANGS-Live',
              model: 'instant-response (parse error)'
            });
          }
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

// Новый API эндпоинт для мгновенного отправления первого доступного ответа без стриминга
router.post('/chat/quick', async (req, res) => {
  try {
    const {
      message,
      provider = null,
      timeout = 20000
    } = req.body;
    
    // Проверяем, что сообщение присутствует
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }
    
    console.log(`Запрос к Python G4F (quick): ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Получаем демо-ответ на случай ошибки
    const demoResponse = getDemoResponse(message);
    
    // Вызываем Python скрипт с сообщением и опциональным провайдером
    const args = [
      'server/g4f_python_provider.py',
      message
    ];
    
    // Если указан провайдер, добавляем его в аргументы
    if (provider) {
      args.push(provider);
    }
    
    // Создаем флаг для отслеживания завершения
    let isCompleted = false;
    
    // Устанавливаем таймер для демо-ответа
    const demoTimer = setTimeout(() => {
      if (!isCompleted) {
        console.log(`⏱️ Таймаут (${timeout}ms), отправляем демо-ответ`);
        isCompleted = true;
        
        return res.json({
          success: true,
          response: demoResponse,
          provider: 'BOOOMERANGS-Live',
          model: 'timeout-fallback'
        });
      }
    }, timeout);
    
    try {
      // Вызываем скрипт как дочерний процесс
      const pythonProcess = require('child_process').spawn('python', args);
      
      let output = '';
      
      // Обрабатываем вывод stdout
      pythonProcess.stdout.on('data', (data) => {
        if (isCompleted) return;
        
        output += data.toString();
      });
      
      // Обрабатываем ошибки stderr
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python G4F ошибка: ${data.toString()}`);
      });
      
      // Обрабатываем завершение процесса
      pythonProcess.on('close', (code) => {
        // Если ответ уже был отправлен, не делаем ничего
        if (isCompleted) return;
        
        clearTimeout(demoTimer);
        isCompleted = true;
        
        if (code !== 0) {
          console.error(`Python G4F завершился с кодом ${code}`);
          
          return res.json({
            success: true,
            response: demoResponse,
            provider: 'BOOOMERANGS-Fallback',
            model: 'error-recovery'
          });
        }
        
        try {
          // Пытаемся найти JSON в выводе
          const jsonMatch = output.match(/{.*}/s);
          
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            return res.json({
              success: true,
              response: jsonData.response,
              provider: jsonData.provider || 'Python-G4F',
              model: jsonData.model || 'g4f-python'
            });
          } else {
            console.error('Не удалось найти JSON в выводе Python:', output);
            
            return res.json({
              success: true,
              response: demoResponse,
              provider: 'BOOOMERANGS-Fallback',
              model: 'parse-error'
            });
          }
        } catch (parseError) {
          console.error('Ошибка при парсинге вывода Python:', parseError);
          
          return res.json({
            success: true,
            response: demoResponse,
            provider: 'BOOOMERANGS-Fallback',
            model: 'json-error'
          });
        }
      });
    } catch (processError) {
      // Если произошла ошибка при запуске процесса
      clearTimeout(demoTimer);
      
      if (!isCompleted) {
        isCompleted = true;
        console.error('Ошибка при запуске Python процесса:', processError);
        
        return res.json({
          success: true,
          response: demoResponse,
          provider: 'BOOOMERANGS-Fallback',
          model: 'process-error'
        });
      }
    }
  } catch (error) {
    console.error('Ошибка при обработке /chat/quick:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message
    });
  }
});

module.exports = router;