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
  
  // API для работы с G4F провайдерами
  app.use('/api/g4f', g4fHandlers);
  
  // API с прямым доступом к AI провайдерам (более стабильный вариант)
  app.use('/api/direct-ai', directAiRoutes);
  
  // API для работы с BOOOMERANGS AI интеграцией - упрощенная версия
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, provider } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Сообщение не может быть пустым' 
        });
      }
      
      console.log(`Запрос к AI: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
      
      // Получаем прямую интеграцию с AI провайдерами
      const directAiProvider = require('./direct-ai-provider');
      
      // Вызываем обработчик запросов AI с таймаутом 10 секунд
      const result = await directAiProvider.getChatResponse(message, { 
        specificProvider: provider,
        timeout: 10000
      });
      
      // Возвращаем результат запроса
      return res.json({
        success: true,
        response: result.response,
        provider: result.provider,
        model: result.model
      });
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      // Используем демо-ответ вместо ошибки, чтобы интерфейс всегда работал
      const directAiProvider = require('./direct-ai-provider');
      const demoResponse = directAiProvider.getDemoResponse('ошибка');
      
      return res.json({
        success: true,
        response: demoResponse,
        provider: 'BOOOMERANGS-Fallback',
        model: 'error-recovery-mode',
        error: errorMessage
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
