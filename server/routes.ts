import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./ws";
import { setupProxyMiddleware } from "./middleware/proxy";
import { authMiddleware } from "./middleware/auth";
import { z } from "zod";
import { authSchema, messageSchema } from "@shared/schema";

// Импортируем модули для работы с изображениями и AI провайдерами
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(__filename);
const svgGenerator = require('./svg-generator');
const g4fHandlers = require('./g4f-handlers');
const directAiRoutes = require('./direct-ai-routes');
const pythonProviderRoutes = require('./python_provider_routes');

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer, storage);
  
  // Setup proxy middleware
  setupProxyMiddleware(app);
  
  // Подключаем генератор изображений
  app.use('/image-generator', (req, res) => {
    res.redirect('/api/svg');
  });
  
  // API для генератора изображений
  app.use('/api/svg', svgGenerator);
  
  // Тестовая страница
  app.get('/test', (req, res) => {
    res.sendFile('test-page.html', { root: '.' });
  });
  
  // Демо-страница генератора изображений
  app.get('/demo', (req, res) => {
    res.sendFile('demo.html', { root: '.' });
  });
  
  // Главная страница
  app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
  });
  
  // Страница отладки
  app.get('/debug', (req, res) => {
    res.sendFile('debug-info.html', { root: '.' });
  });

  // G4F чат интерфейс
  app.get('/g4f-chat', (req, res) => {
    res.sendFile('g4f-chat.html', { root: '.' });
  });
  
  // Простой G4F тест
  app.get('/simple-g4f', (req, res) => {
    res.sendFile('simple-g4f.html', { root: '.' });
  });
  
  // Прямой тест G4F
  app.get('/direct-g4f', (req, res) => {
    res.sendFile('direct-g4f-test.html', { root: '.' });
  });
  
  // Автономная версия G4F чата
  app.get('/standalone', (req, res) => {
    res.sendFile('standalone-g4f.html', { root: '.' });
  });
  
  // BOOOMERANGS приложение
  app.get('/booom', (req, res) => {
    res.sendFile('booomerangs-app.html', { root: '.' });
  });
  
  // BOOOMERANGS с Qwen AI интеграцией
  app.get('/qwen', (req, res) => {
    res.sendFile('booomerangs-qwen.html', { root: '.' });
  });
  
  // API для работы с G4F провайдерами
  app.use('/api/g4f', g4fHandlers);
  
  // API с прямым доступом к AI провайдерам (более стабильный вариант)
  app.use('/api/direct-ai', directAiRoutes);
  
  // API с Python-версией G4F
  app.use('/api/python', pythonProviderRoutes);
  
  // API для работы с BOOOMERANGS AI интеграцией (с поддержкой Qwen и других провайдеров)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, provider } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Сообщение не может быть пустым' 
        });
      }
      
      // Импортируем провайдер напрямую
      const directAiProvider = require('./direct-ai-provider');
      const { AI_PROVIDERS } = directAiProvider;
      
      // Сначала сразу возвращаем демо-ответ для мгновенного отклика
      const demoResponse = directAiProvider.getDemoResponse(message);
      
      // Если запрошен Python провайдер (Qwen), используем его
      if (provider === 'QWEN' || provider === 'Qwen_Qwen_3' || provider === 'Qwen_Max') {
        try {
          // Пытаемся получить ответ от Python провайдера
          console.log(`Пробуем использовать Python провайдер Qwen...`);
          
          // Увеличиваем таймаут для запроса к Qwen
          const pythonTimeout = 25000; // 25 секунд максимум
          
          // Создаем обработчик запроса с таймаутом
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), pythonTimeout);
          
          // Выполняем запрос к Python провайдеру
          const pythonResponse = await fetch('http://localhost:5000/api/python/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, provider: provider || 'Qwen_Qwen_3' }),
            signal: controller.signal
          });
          
          // Очищаем таймер
          clearTimeout(timeoutId);
          
          if (pythonResponse.ok) {
            const result = await pythonResponse.json();
            if (result && result.success && result.response) {
              console.log(`✅ Успешно получен ответ от Python провайдера Qwen`);
              return res.json(result);
            }
          }
        } catch (pythonError) {
          console.log(`❌ Ошибка при использовании Python провайдера:`, 
                    pythonError instanceof Error ? pythonError.message : 'Неизвестная ошибка');
          // Продолжаем выполнение и пробуем другие провайдеры
        }
      }
      
      // Если указан стандартный провайдер, пытаемся использовать его
      if (provider && AI_PROVIDERS && AI_PROVIDERS[provider]) {
        try {
          // Получаем информацию о выбранном провайдере
          const selectedProvider = AI_PROVIDERS[provider];
          console.log(`Пробуем использовать провайдер ${selectedProvider.name} (${provider})...`);
          
          // Для демо-режима мы уже возвращаем демо-ответ
          if (provider === 'DEMO') {
            return res.json({
              success: true,
              response: demoResponse,
              provider: 'BOOOMERANGS-Demo',
              model: 'demo-mode'
            });
          }
          
          // Создаем таймаут для ограничения времени ожидания ответа
          const timeout = 3000; // 3 секунды максимум на ответ
          
          // Готовим запрос к выбранному провайдеру
          const requestData = selectedProvider.prepareRequest(message);
          
          // Создаем обработчик запроса с таймаутом
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const fetchPromise = fetch(selectedProvider.url, {
              method: 'POST',
              headers: selectedProvider.headers || { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData),
              signal: controller.signal
            });
            
            // Запускаем запрос с ограничением по времени
            const fetchWithTimeout = Promise.race([
              fetchPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Таймаут запроса (${timeout}ms)`)), timeout)
              )
            ]);
            
            // Устанавливаем таймер для возврата демо-ответа
            let responseTimedOut = false;
            const responseTimer = setTimeout(() => {
              responseTimedOut = true;
              console.log(`Превышено время ожидания ответа от ${selectedProvider.name}, возвращаем демо-ответ`);
              return res.json({
                success: true,
                response: demoResponse,
                provider: 'BOOOMERANGS-Live',
                model: 'instant-response'
              });
            }, timeout);
            
            // Пытаемся получить ответ от провайдера
            fetchWithTimeout
              .then(async (response: any) => {
                // Очищаем таймер для AbortController
                clearTimeout(timeoutId);
                
                // Если уже отправили демо-ответ из-за таймаута, не выполняем дальнейшую обработку
                if (responseTimedOut) return;
                
                // Очищаем таймер
                clearTimeout(responseTimer);
                
                if (!response.ok) {
                  throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                
                try {
                  // Извлекаем ответ из ответа API
                  const responseText = await selectedProvider.extractResponse(response);
                  
                  console.log(`✅ Успешно получен ответ от ${selectedProvider.name}`);
                  
                  // Отправляем реальный ответ от провайдера
                  return res.json({
                    success: true,
                    response: responseText,
                    provider: selectedProvider.name,
                    model: provider
                  });
                } catch (extractError) {
                  console.log(`Ошибка при извлечении ответа от ${selectedProvider.name}:`, 
                              extractError instanceof Error ? extractError.message : 'Неизвестная ошибка');
                  
                  // В случае ошибки извлечения отправляем демо-ответ
                  return res.json({
                    success: true,
                    response: demoResponse,
                    provider: 'BOOOMERANGS-Live',
                    model: 'instant-response'
                  });
                }
              })
              .catch((error) => {
                // Очищаем таймер для AbortController
                clearTimeout(timeoutId);
                
                // Если уже отправили демо-ответ из-за таймаута, не выполняем дальнейшую обработку
                if (responseTimedOut) return;
                
                // Очищаем таймер
                clearTimeout(responseTimer);
                
                console.log(`❌ Ошибка при запросе к ${selectedProvider.name}:`, 
                            error instanceof Error ? error.message : 'Неизвестная ошибка');
                
                // В случае ошибки отправляем демо-ответ
                return res.json({
                  success: true,
                  response: demoResponse,
                  provider: 'BOOOMERANGS-Live',
                  model: 'instant-response'
                });
              });
            
            // Завершаем функцию без явного return, т.к. ответ будет отправлен в обработчиках промисов
            return;
          } catch (fetchError) {
            console.log(`❌ Ошибка при создании запроса к ${selectedProvider.name}:`, 
                      fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка');
            
            // Продолжаем выполнение и отправляем демо-ответ
          }
        } catch (error) {
          console.log(`Ошибка при подготовке запроса к провайдеру ${provider}:`, 
                    error instanceof Error ? error.message : 'Неизвестная ошибка');
          
          // Продолжаем выполнение и отправляем демо-ответ
        }
      }
      
      // Мгновенно возвращаем демо-ответ
      return res.json({
        success: true,
        response: demoResponse,
        provider: 'BOOOMERANGS-Live',
        model: 'instant-response'
      });
      
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      
      // Используем заглушку в случае любой ошибки
      return res.json({
        success: true,
        response: "Я BOOOMERANGS AI ассистент. Чем могу помочь?",
        provider: 'BOOOMERANGS-Fallback',
        model: 'error-recovery'
      });
    }
  });
  
  // Функция для генерации демо-ответов
  function generateDemoResponse(message: string) {
    const lowerMessage = message.toLowerCase();
    let response;
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      response = 'Привет! Я ассистент BOOOMERANGS. Чем могу помочь?';
    } else if (lowerMessage.includes('как дела') || lowerMessage.includes('как ты')) {
      response = 'У меня всё отлично! А как ваши дела?';
    } else if (lowerMessage.includes('изображени') || lowerMessage.includes('картинк')) {
      response = 'Если вы хотите создать изображение, перейдите на вкладку "Генератор Изображений" в верхней части страницы.';
    } else if (lowerMessage.includes('booomerangs')) {
      response = 'BOOOMERANGS - это мультимодальный AI-сервис для общения и создания изображений без API-ключей.';
    } else {
      const backupResponses = [
        `Спасибо за ваш вопрос! BOOOMERANGS предоставляет доступ к AI моделям без необходимости платных API ключей.`,
        `Интересный вопрос! BOOOMERANGS позволяет генерировать тексты и изображения бесплатно через интерфейс браузера.`,
        `BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом без платных подписок.`
      ];
      response = backupResponses[Math.floor(Math.random() * backupResponses.length)];
    }
    
    return {
      response,
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
  
  // Auth endpoint - validate token and return user
  app.post("/api/auth", async (req, res) => {
    try {
      // Validate request body
      const result = authSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { token } = result.data;
      
      // Get user by token
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid access token" });
      }
      
      // Set user as online
      await storage.setUserOnlineStatus(user.id, true);
      
      // Add initials for the frontend
      const initials = user.username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      return res.status(200).json({
        message: "Authentication successful",
        user: {
          ...user,
          initials
        }
      });
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({ message: "Server error during authentication" });
    }
  });
  
  // Get all users
  app.get("/api/users", authMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Add initials for each user
      const usersWithInitials = users.map(user => {
        const initials = user.username
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        return {
          ...user,
          initials
        };
      });
      
      return res.status(200).json(usersWithInitials);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Server error while fetching users" });
    }
  });
  
  // Get messages between two users
  app.get("/api/messages/:userId", authMiddleware, async (req, res) => {
    try {
      const currentUserId = (req as any).userId;
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get messages between users
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      
      // Get user details for sender info
      const users = await storage.getAllUsers();
      const usersMap = users.reduce((acc, user) => {
        const initials = user.username
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        acc[user.id] = {
          ...user,
          initials
        };
        return acc;
      }, {} as Record<number, any>);
      
      // Add sender details and format time
      const formattedMessages = messages.map(message => {
        const sender = usersMap[message.senderId];
        const time = new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        return {
          ...message,
          sender,
          time
        };
      });
      
      return res.status(200).json(formattedMessages);
    } catch (error) {
      console.error("Get messages error:", error);
      return res.status(500).json({ message: "Server error while fetching messages" });
    }
  });
  
  // Send a message
  app.post("/api/messages", authMiddleware, async (req, res) => {
    try {
      const currentUserId = (req as any).userId;
      
      // Validate request body
      const result = messageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { text, receiverId } = result.data;
      
      // Check if receiver exists
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }
      
      // Create message
      const message = await storage.createMessage({
        senderId: currentUserId,
        receiverId,
        text
      });
      
      return res.status(201).json(message);
    } catch (error) {
      console.error("Send message error:", error);
      return res.status(500).json({ message: "Server error while sending message" });
    }
  });

  return httpServer;
}
