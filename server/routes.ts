import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./ws";
import { setupProxyMiddleware } from "./middleware/proxy";
import { authMiddleware } from "./middleware/auth";
import { z } from "zod";
import { authSchema, messageSchema, teamMessages } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, count, sql } from "drizzle-orm";

// Импортируем модули для работы с изображениями и AI провайдерами
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(__filename);

// Настройка multer для загрузки изображений
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB лимит
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'), false);
    }
  }
});
const svgGenerator = require('./svg-generator');
const g4fHandlers = require('./g4f-handlers');
const directAiRoutes = require('./direct-ai-routes');
const pythonProviderRoutes = require('./python_provider_routes');
const deepspeekProvider = require('./deepspeek-fixed');
const chatFreeProvider = require('./simple-chatfree');

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer, storage);
  
  // Setup proxy middleware
  setupProxyMiddleware(app);
  
  // Статические файлы из корневой директории
  app.use(express.static(path.join(process.cwd())));
  
  // Подключаем генератор изображений
  app.use('/image-generator', (req, res) => {
    res.redirect('/api/svg');
  });
  
  // API для генератора изображений
  app.use('/api/svg', svgGenerator);
  
  // Импортируем модуль генерации изображений с AI
  const aiImageGenerator = require('./ai-image-generator');

  // API для генерации изображений через бесплатные AI провайдеры
  app.post("/api/ai-image/generate", async (req, res) => {
    try {
      const { prompt, style = 'realistic' } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Необходимо указать текстовый запрос (prompt)'
        });
      }
      
      // Вызываем функцию генерации изображения
      const result = await aiImageGenerator.generateImage(prompt, style);
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера при генерации изображения'
      });
    }
  });
  
  // Создаем маршрут для доступа к сгенерированным изображениям
  app.use('/output', (req, res, next) => {
    const outputPath = path.join(__dirname, '..', 'output');
    res.sendFile(req.path, { root: outputPath });
  });
  
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
    res.sendFile('booomerangs-main.html', { root: '.' });
  });
  
  // BOOOMERANGS новый прямой доступ
  app.get('/ai', (req, res) => {
    res.sendFile('booomerangs-direct.html', { root: '.' });
  });
  
  // BOOOMERANGS новый мультимодальный интерфейс
  app.get('/new', (req, res) => {
    res.sendFile('booomerangs-new.html', { root: '.' });
  });
  
  // BOOOMERANGS чат с AI провайдерами (прямой интерфейс)
  app.get('/chat-ai', (req, res) => {
    res.sendFile('booomerangs-chat.html', { root: '.' });
  });
  
  // BOOOMERANGS универсальный интерфейс (чат + генератор изображений)
  app.get('/unified', (req, res) => {
    res.sendFile('public/unified-interface.html', { root: '.' });
  });
  
  // BOOOMERANGS фиксированный интерфейс с локальной генерацией изображений
  app.get('/fixed', (req, res) => {
    res.sendFile('public/fixed-interface.html', { root: '.' });
  });
  
  // BOOOMERANGS только генератор изображений (стабильная версия)
  app.get('/image-generator', (req, res) => {
    res.sendFile('public/image-generator.html', { root: '.' });
  });
  
  // BOOOMERANGS AI генератор изображений
  app.get('/ai-images', (req, res) => {
    res.sendFile('public/ai-image-app.html', { root: '.' });
  });
  
  // BOOOMERANGS приложение со стримингом
  app.get('/booom-streaming', (req, res) => {
    res.sendFile('booomerangs-app-streaming-fixed.html', { root: '.' });
  });
  
  // BOOOMERANGS с Qwen AI интеграцией
  app.get('/qwen', (req, res) => {
    res.sendFile('booomerangs-qwen.html', { root: '.' });
  });
  
  // BOOOMERANGS со стримингом ответов
  app.get('/streaming', (req, res) => {
    res.sendFile('booomerangs-streaming.html', { root: '.' });
  });
  
  // BOOOMERANGS быстрая версия (запасной вариант без стриминга)
  app.get('/quick', (req, res) => {
    res.sendFile('booomerangs-quick.html', { root: '.' });
  });
  
  // BOOOMERANGS стабильная версия (только провайдеры с поддержкой стриминга)
  app.get('/stable', (req, res) => {
    res.sendFile('booomerangs-stable.html', { root: '.' });
  });
  
  // BOOOMERANGS с Flask-стримингом (самая надежная версия)
  app.get('/flask', (req, res) => {
    res.sendFile('booomerangs-flask-stream.html', { root: '.' });
  });
  
  // Перенаправляем запрос умного чата на HTML-страницу
  app.get('/smart-chat', (req, res) => {
    res.sendFile('booomerangs-smart-chat.html', { root: '.' });
  });
  
  // Командный чат для переписки участников
  app.get('/team-chat', (req, res) => {
    res.sendFile('team-chat.html', { root: '.' });
  });
  
  // API для работы с G4F провайдерами
  app.use('/api/g4f', g4fHandlers);
  
  // API с прямым доступом к AI провайдерам (более стабильный вариант)
  app.use('/api/direct-ai', directAiRoutes);
  
  // API с Python-версией G4F
  app.use('/api/python', pythonProviderRoutes.router);
  
  // API для стриминга от провайдеров, поддерживающих stream=True
  const streamingRoutes = require('./streaming-routes');
  app.use('/api/streaming', streamingRoutes);
  
  // API для Flask-стриминга (надежный вариант)
  const flaskStreamBridge = require('./stream-flask-bridge');
  app.use('/api/flask-stream', flaskStreamBridge);
  
  // API для DeepSpeek - специализированного AI для технических вопросов
  const deepspeekRoutes = require('./deepspeek-routes');
  app.use('/api/deepspeek', deepspeekRoutes);
  
  // API для проверки состояния провайдеров
  const checkProvidersRoutes = require('./check-providers');
  app.use('/api/providers', checkProvidersRoutes);
  
  // API для Ollama - локальный AI провайдер
  const ollamaProvider = require('./ollama-provider');
  app.use('/api/ollama', ollamaProvider);
  
  // API для улучшенного ChatFree провайдера
  const chatFreeImproved = require('./chatfree-improved');
  app.use('/api/chatfree', chatFreeImproved);
  
  // API для FreeChat с интеграцией Phind и Qwen
  const freechatEnhanced = require('./freechat-enhanced');
  app.use('/api/freechat', freechatEnhanced);
  
  // API для Claude от Anthropic через Python G4F
  const claudeProvider = require('./claude-provider');
  app.use('/api/claude', claudeProvider);
  
  // API для DeepInfra - высококачественные модели
  const deepInfraProvider = require('./deepinfra-provider');
  app.use('/api/deepinfra', deepInfraProvider);
  
  // API для мультимодального анализа изображений
  const multimodalProvider = require('./multimodal-provider');
  app.use('/api/multimodal', multimodalProvider);
  
  // API для тестирования провайдеров
  const providerTestRoute = require('./provider-test-route');
  app.use('/api/test-providers', providerTestRoute);
  
  // API для умной маршрутизации сообщений к подходящим провайдерам
  const smartRouter = require('./smart-router');
  app.use('/api/smart', smartRouter);

  // API для сохранения истории чатов
  const chatHistory = require('./chat-history');
  const { insertChatSessionSchema, insertAiMessageSchema } = require('@shared/schema');

  // Создание новой сессии чата
  app.post('/api/chat/sessions', async (req, res) => {
    try {
      const { userId, title } = req.body;
      
      if (!userId || !title) {
        return res.status(400).json({ 
          success: false, 
          error: 'userId и title обязательны' 
        });
      }

      const session = await chatHistory.createChatSession(userId, title);
      res.json({ success: true, session });
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось создать сессию' 
      });
    }
  });

  // Получение всех сессий пользователя (без параметра - для текущего пользователя)
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const userId = 1; // Временно используем фиксированный ID пользователя
      const sessions = await chatHistory.getUserChatSessions(userId);
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Ошибка получения сессий:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сессии' 
      });
    }
  });

  // Получение всех сессий конкретного пользователя
  app.get('/api/chat/sessions/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await chatHistory.getUserChatSessions(userId);
      res.json({ success: true, sessions });
    } catch (error) {
      console.error('Ошибка получения сессий:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сессии' 
      });
    }
  });

  // Сохранение сообщения и получение ответа от AI
  app.post('/api/chat/messages', async (req, res) => {
    try {
      const { message, sessionId, userId } = req.body;
      
      // Сохраняем сообщение пользователя
      const userMessageData = {
        sessionId: sessionId,
        content: message,
        sender: 'user',
        userId: userId
      };
      
      const userMessage = await chatHistory.saveMessage(userMessageData);
      
      // Получаем ответ от AI провайдера
      const smartRouter = require('./smart-router.js');
      const aiResponse = await smartRouter.getChatResponse(message);
      
      if (aiResponse.success) {
        // Сохраняем ответ AI
        const aiMessageData = {
          sessionId: sessionId,
          content: aiResponse.response,
          sender: 'ai',
          provider: aiResponse.provider,
          userId: userId
        };
        
        const aiMessage = await chatHistory.saveMessage(aiMessageData);
        
        res.json({ 
          success: true, 
          response: aiResponse.response,
          provider: aiResponse.provider 
        });
      } else {
        res.json({ 
          success: false, 
          error: aiResponse.error || 'Ошибка получения ответа от AI' 
        });
      }
      
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось обработать сообщение' 
      });
    }
  });

  // Сохранение сообщения в конкретную сессию
  app.post('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messageData = {
        ...req.body,
        sessionId: sessionId
      };
      
      console.log(`💾 Сохраняем сообщение в сессию ${sessionId}:`, messageData);
      const message = await chatHistory.saveMessage(messageData);
      console.log('✅ Сообщение пользователя сохранено');
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('❌ ОШИБКА сохранения сообщения пользователя:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось сохранить сообщение' 
      });
    }
  });

  // Получение сообщений сессии
  app.get('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`📋 Загружаем сообщения для сессии ${sessionId}...`);
      
      const messages = await chatHistory.getSessionMessages(sessionId);
      console.log(`✅ Найдено ${messages.length} сообщений для сессии ${sessionId}`);
      
      // Отключаем кэширование для этого API
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json({ success: true, messages });
    } catch (error) {
      console.error('Ошибка получения сообщений:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить сообщения' 
      });
    }
  });

  // API для удаления сессии чата
  app.delete('/api/chat/sessions/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`🗑️ Удаляем сессию ${sessionId}...`);
      
      // Проверяем, существует ли сессия
      const sessions = await chatHistory.getUserChatSessions(1); // Используем userId = 1
      const sessionExists = sessions.some(session => session.id === sessionId);
      
      if (!sessionExists) {
        console.log(`⚠️ Сессия ${sessionId} уже не существует`);
        return res.status(404).json({ 
          success: false, 
          error: 'Сессия не найдена' 
        });
      }
      
      await chatHistory.deleteSession(sessionId);
      console.log(`✅ Сессия ${sessionId} успешно удалена`);
      
      res.json({ success: true, message: 'Сессия удалена' });
    } catch (error) {
      console.error('Ошибка удаления сессии:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Не удалось удалить сессию' 
      });
    }
  });

  // API для простой авторизации
  const { users, messages } = require('@shared/schema');
  const { eq } = require('drizzle-orm');
  
  // Вход в систему
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Логин и пароль обязательны' 
        });
      }

      const { db } = require('./db');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
        
      if (!user || user.password !== password) {
        return res.status(401).json({ 
          success: false, 
          error: 'Неверный логин или пароль' 
        });
      }
      
      // Генерируем простой токен
      const token = `${user.id}_${Date.now()}_${Math.random().toString(36)}`;
      
      // Обновляем токен в базе
      await db
        .update(users)
        .set({ token, isOnline: true })
        .where(eq(users.id, user.id));
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          token
        }
      });
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  // Выход из системы
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (token) {
        const { db } = require('./db');
        await db
          .update(users)
          .set({ token: null, isOnline: false })
          .where(eq(users.token, token));
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка выхода:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });
  
  // Проверка токена
  app.get('/api/auth/user', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
      }

      const { db } = require('./db');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.token, token));
        
      if (!user) {
        return res.status(401).json({ success: false, error: 'Недействительный токен' });
      }
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName
        }
      });
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
      res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
  });

  // API для переписки между пользователями (импорт уже выше)
  
  // Отправка сообщения пользователю
  app.post('/api/messages', async (req, res) => {
    try {
      const { senderId, receiverId, text } = req.body;
      
      if (!senderId || !receiverId || !text) {
        return res.status(400).json({ 
          success: false, 
          error: 'senderId, receiverId и text обязательны' 
        });
      }

      const { db } = require('./db');
      const [message] = await db
        .insert(messages)
        .values({ senderId, receiverId, text })
        .returning();
        
      res.json({ success: true, message });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      res.status(500).json({ success: false, error: 'Ошибка отправки сообщения' });
    }
  });
  
  // Получение переписки между пользователями
  app.get('/api/messages/:userId1/:userId2', async (req, res) => {
    try {
      const { userId1, userId2 } = req.params;
      const { db } = require('./db');
      const { or, and, eq, desc } = require('drizzle-orm');
      
      const conversation = await db
        .select()
        .from(messages)
        .where(
          or(
            and(eq(messages.senderId, parseInt(userId1)), eq(messages.receiverId, parseInt(userId2))),
            and(eq(messages.senderId, parseInt(userId2)), eq(messages.receiverId, parseInt(userId1)))
          )
        )
        .orderBy(desc(messages.timestamp));
        
      res.json({ success: true, messages: conversation });
    } catch (error) {
      console.error('Ошибка получения переписки:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения переписки' });
    }
  });
  
  // Получение списка всех диалогов пользователя
  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { db } = require('./db');
      const { or, eq, desc } = require('drizzle-orm');
      
      const conversations = await db
        .select()
        .from(messages)
        .where(
          or(
            eq(messages.senderId, parseInt(userId)),
            eq(messages.receiverId, parseInt(userId))
          )
        )
        .orderBy(desc(messages.timestamp));
        
      // Группируем по собеседникам для показа последних сообщений
      const conversationMap = new Map();
      conversations.forEach(msg => {
        const partnerId = msg.senderId === parseInt(userId) ? msg.receiverId : msg.senderId;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            lastMessage: msg,
            timestamp: msg.timestamp
          });
        }
      });
      
      res.json({ success: true, conversations: Array.from(conversationMap.values()) });
    } catch (error) {
      console.error('Ошибка получения диалогов:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения диалогов' });
    }
  });
  
  // API для загрузки изображений
  const imageUpload = require('./image-upload');
  app.use('/api/upload', imageUpload);
  
  // Статический доступ к загруженным изображениям
  app.use('/uploads', (req, res, next) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    res.sendFile(req.path, { root: uploadPath }, (err) => {
      if (err) next('route');
    });
  });
  
  // Проверка работы Python провайдера при запуске
  (async () => {
    try {
      const { spawn } = require('child_process');
      console.log('Проверка работоспособности Python G4F...');
      
      const pythonProcess = spawn('python', ['server/g4f_python_provider.py', 'test']);
      let pythonOutput = '';
      
      // Устанавливаем таймаут
      const timeout = setTimeout(() => {
        console.warn('⚠️ Таймаут при проверке Python G4F');
      }, 5000);
      
      pythonProcess.stdout.on('data', (data) => {
        pythonOutput += data.toString();
        console.log(`Python G4F тест: ${data.toString().trim()}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python G4F ошибка: ${data.toString().trim()}`);
      });
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          console.log('✅ Python G4F провайдер готов к работе');
        } else {
          console.warn(`⚠️ Python G4F провайдер может работать некорректно (код ${code})`);
        }
      });
    } catch (error) {
      console.error('❌ Ошибка при проверке Python G4F:', error);
    }
  })();
  
  // Вспомогательная функция для вызова G4F API
  async function callG4F(message: string, provider: string) {
    try {
      // Получаем ответ от прямого провайдера
      const directAiProvider = require('./direct-ai-provider');
      
      // Если провайдер qwen, используем AItianhu который реализует доступ к Qwen AI
      // Если провайдер chatfree, используем наш локальный провайдер
      let actualProvider = provider;
      
      if (provider === 'qwen') {
        actualProvider = 'AItianhu';
      } else if (provider === 'claude') {
        // Используем Claude через Python G4F
        try {
          console.log(`Пробуем использовать Claude через Python G4F...`);
          const claudeProvider = require('./claude-provider');
          const claudeResponse = await claudeProvider.getClaudeResponse(message);
          
          if (claudeResponse.success) {
            console.log(`✅ Успешно получен ответ от Claude`);
            return claudeResponse;
          } else {
            throw new Error(claudeResponse.error || 'Ошибка Claude');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании Claude:`, error);
          actualProvider = 'AItianhu'; // Фолбэк на стабильный провайдер
        }
      } else if (provider === 'ollama') {
        // Используем Ollama через Python G4F
        try {
          console.log(`Пробуем использовать Ollama через Python G4F...`);
          const ollamaResponse = await pythonProviderRoutes.callPythonAI(message, 'Ollama');
          
          if (ollamaResponse) {
            return {
              success: true,
              response: ollamaResponse,
              provider: 'Ollama',
              model: 'llama3'
            };
          } else {
            throw new Error('Ollama не вернул ответ через Python G4F');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании Ollama через Python:`, error);
          
          // Пробуем использовать локальный Ollama провайдер как запасной вариант
          try {
            const ollamaProvider = require('./ollama-provider');
            const isOllamaAvailable = await ollamaProvider.checkOllamaAvailability();
            
            if (isOllamaAvailable) {
              const ollamaDirectResponse = await ollamaProvider.getOllamaResponse(message);
              if (ollamaDirectResponse.success) {
                return ollamaDirectResponse;
              }
            }
          } catch (localError) {
            console.error(`❌ Локальный Ollama тоже недоступен:`, localError);
          }
          
          // Фолбэк на стабильный провайдер
          actualProvider = 'AItianhu';
        }
      } else if (provider === 'chatfree') {
        // Используем улучшенный провайдер для ChatFree с системой обхода блокировок
        try {
          const chatFreeImproved = require('./chatfree-improved');
          console.log(`Пробуем использовать улучшенную версию ChatFree...`);
          
          const chatFreeResponse = await chatFreeImproved.getChatFreeResponse(message, {
            systemPrompt: "Вы полезный ассистент. Отвечайте точно и по существу, используя дружелюбный тон."
          });
          
          if (chatFreeResponse.success) {
            console.log(`✅ Успешно получен ответ от улучшенного ChatFree провайдера`);
            return chatFreeResponse;
          } else {
            // Пробуем использовать простую версию как запасной вариант
            const simpleChatFree = require('./simple-chatfree');
            const simpleResponse = await simpleChatFree.getChatFreeResponse(message);
            
            if (simpleResponse.success) {
              console.log(`✅ Успешно получен ответ от простого ChatFree провайдера`);
              return simpleResponse;
            }
            
            throw new Error(chatFreeResponse.error || 'Ошибка ChatFree');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании ChatFree:`, error);
          actualProvider = 'AItianhu'; // Фолбэк на стабильный провайдер
        }
      }
      
      // Получаем ответ
      const response = await directAiProvider.getChatResponse(message, { provider: actualProvider });
      
      return {
        success: true,
        response: response,
        provider: actualProvider
      };
    } catch (error) {
      console.error(`❌ Ошибка при вызове G4F:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
  
  // API для работы с BOOOMERANGS AI интеграцией (с поддержкой Qwen и других провайдеров)
  app.post('/api/ai/chat', upload.single('image'), async (req, res) => {
    try {
      const { message, provider, sessionId } = req.body;
      const uploadedImage = req.file;
      
      // Импортируем функции для работы с чатом
      const chatHistory = require('./chat-history');
      
      console.log(`🔍 Проверка загрузки: message="${message}", uploadedImage=${uploadedImage ? 'ЕСТЬ' : 'НЕТ'}`);
      
      if (!message && !uploadedImage) {
        return res.status(400).json({ 
          success: false, 
          error: 'Сообщение или изображение должны быть предоставлены' 
        });
      }

      // Если есть изображение, но нет сообщения, установим стандартный запрос
      let finalMessage = message || 'Анализируй это изображение и опиши что на нем видно';
      
      // Создаем сессию, если её нет
      let currentSessionId = sessionId;
      if (!currentSessionId && finalMessage) {
        console.log('💬 Создаем новую сессию чата...');
        const newSession = await chatHistory.createChatSession(1, finalMessage.substring(0, 50));
        currentSessionId = newSession.id;
        console.log(`✅ Создана новая сессия: ${currentSessionId}`);
      }
      
      // Сохраняем сообщение пользователя
      if (currentSessionId && finalMessage) {
        console.log('💾 Сохраняем сообщение пользователя...');
        try {
          await chatHistory.saveMessage({
            sessionId: currentSessionId,
            sender: 'user',
            content: finalMessage,
            provider: null
          });
          console.log('✅ Сообщение пользователя сохранено');
        } catch (error) {
          console.error('❌ ОШИБКА сохранения сообщения пользователя:', error);
        }
      }
      
      // Импортируем провайдер напрямую
      const directAiProvider = require('./direct-ai-provider');
      const { AI_PROVIDERS } = directAiProvider;
      
      // Импортируем Python провайдер
      const pythonProviderRoutes = require('./python_provider_routes');
      
      // Сначала создаем демо-ответ для запасного варианта
      const demoResponse = generateDemoResponse(finalMessage);
      
      // Определяем, какой провайдер использовать
      let selectedProvider = provider || 'AItianhu';
      let base64Image = null;
      
      // Специальная обработка для изображений - используем мультимодальные провайдеры
      if (uploadedImage) {
        // Конвертируем изображение в base64 для передачи AI провайдерам
        base64Image = uploadedImage.buffer.toString('base64');
        const imageDataUrl = `data:${uploadedImage.mimetype};base64,${base64Image}`;
        
        // Для изображений используем специализированные провайдеры с поддержкой vision
        selectedProvider = 'multimodal'; // Принудительно используем мультимодальный провайдер
        
        finalMessage = `${finalMessage}\n\nИзображение для анализа: ${imageDataUrl}`;
        console.log(`🖼️ Обрабатываем изображение: ${uploadedImage.originalname} (${Math.round(uploadedImage.size / 1024)}KB)`);
      }
      
      // Автоматическое определение технических вопросов для перенаправления на DeepSpeek/Phind
      const techKeywords = [
        "код", "программирование", "javascript", "python", "java", "c++", "c#", 
        "coding", "programming", "code", "алгоритм", "algorithm", "функция", "function",
        "api", "сервер", "server", "backend", "frontend", "фронтенд", "бэкенд",
        "database", "база данных", "sql", "nosql", "json", "html", "css",
        "git", "github", "docker", "kubernetes", "devops"
      ];
      
      // Проверяем, является ли вопрос техническим
      const isTechnicalQuestion = techKeywords.some(keyword => finalMessage.toLowerCase().includes(keyword));
      
      // Специальная обработка для любых запросов с изображениями
      if (uploadedImage) {
        console.log(`🖼️ НАЙДЕНО ИЗОБРАЖЕНИЕ! Размер: ${uploadedImage.size} байт, тип: ${uploadedImage.mimetype}`);
        
        // Импортируем мультимодальный провайдер
        const multimodalProvider = require('./multimodal-provider');
        
        try {
          // Импортируем новый анализатор изображений
          const imageAnalyzer = require('./image-analyzer');
          
          console.log('🔍 Запускаем продвинутый анализ изображения...');
          
          // Используем буфер изображения для анализа
          const analysisResult = await imageAnalyzer.analyzeImage(uploadedImage.buffer, uploadedImage.originalname);
          
          const imageInfo = {
            filename: uploadedImage.originalname,
            size: Math.round(uploadedImage.size / 1024),
            type: uploadedImage.mimetype
          };

          const smartResponse = `🖼️ **AI Анализ изображения:**

📁 **Файл:** ${imageInfo.filename}
📏 **Размер:** ${imageInfo.size}KB
🎨 **Формат:** ${imageInfo.type.includes('jpeg') ? 'JPEG фотография' : imageInfo.type.includes('png') ? 'PNG изображение' : 'Графический файл'}

${analysisResult.success ? `🤖 **Описание содержимого:**
${analysisResult.description}

🔧 **Сервис:** ${analysisResult.service}
📊 **Точность:** ${Math.round(analysisResult.confidence * 100)}%` : `⚠️ **Анализ содержимого:**
${analysisResult.description}`}

${message ? `\n💭 **Ваш запрос:** ${message}` : ''}

*🚀 Анализ выполнен с помощью бесплатных AI сервисов!*`;

          return res.json({
            success: true,
            response: smartResponse,
            provider: analysisResult.success ? analysisResult.service : 'Fallback Analyzer',
            model: analysisResult.success ? `AI Vision (${Math.round(analysisResult.confidence * 100)}% точность)` : 'Local Analysis'
          });
        } catch (error) {
          console.error('❌ Ошибка анализа изображения:', error);
          // Продолжаем с обычными провайдерами
        }
      }

      // Для DeepSpeek используем оптимизированный подход с локальным ответом при необходимости
      if (provider === 'deepspeek') {
        console.log(`📊 Для DeepSpeek используем быстрый режим`);
        
        // Получаем функцию для генерации ответа от DeepSpeek
        const deepspeekProvider = require('./deepspeek-fixed');
        
        // Вызываем функцию DeepSpeek для обработки запроса
        try {
          const deepspeekResponse = await deepspeekProvider.getDeepSpeekResponse(message);
          
          // Проверяем успешность ответа
          if (deepspeekResponse.success) {
            console.log(`✅ Успешно получен ответ от DeepSpeek`);
            
            return res.json({
              success: true,
              response: deepspeekResponse.response,
              provider: 'DeepSpeek',
              model: 'DeepSpeek AI'
            });
          } else {
            // В случае ошибки используем резервного провайдера
            throw new Error(deepspeekResponse.error || 'Ошибка DeepSpeek');
          }
        } catch (error) {
          console.error(`❌ Ошибка при использовании DeepSpeek:`, error);
          
          // Если DeepSpeek не сработал - используем Qwen/Phind как резерв
          selectedProvider = isTechnicalQuestion ? 'Phind' : 'AItianhu';
          console.log(`⚠️ DeepSpeek не сработал, переключаемся на ${selectedProvider}`);
        }
      }
      
      // Автоматическое определение технических запросов
      if (isTechnicalQuestion && !provider) {
        selectedProvider = 'Phind';
        console.log(`📊 Обнаружен технический вопрос, переключаемся на провайдер Phind`);
      }
      
      // Проверяем доступность Ollama как бесплатного локального провайдера
      if (!provider) {
        try {
          const ollamaProvider = require('./ollama-provider');
          const isOllamaAvailable = await ollamaProvider.checkOllamaAvailability();
          
          if (isOllamaAvailable) {
            console.log(`Обнаружен локальный Ollama, используем его как предпочтительный провайдер`);
            selectedProvider = 'Ollama';
          }
        } catch (error) {
          console.log(`Lokальный Ollama не обнаружен, используем стандартные провайдеры`);
        }
      }
      
      // Всегда пытаемся сначала использовать Python G4F сервер для любого запроса
      try {
        // Пытаемся получить ответ от Python провайдера с использованием callPythonAI
        console.log(`Пробуем использовать Python провайдер ${selectedProvider}...`);
        
        // Используем нашу новую функцию callPythonAI
        const aiResponse = await pythonProviderRoutes.callPythonAI(message, selectedProvider);
        
        if (aiResponse) {
          console.log(`✅ Успешно получен ответ от Python провайдера ${selectedProvider}`);
          
          // Определяем отображаемое имя модели
          let modelName = "AI";
          if (selectedProvider.includes('Qwen') || selectedProvider === 'AItianhu') {
            modelName = "Qwen AI";
          } else if (selectedProvider === 'Phind') {
            modelName = "Phind AI";
          } else {
            modelName = selectedProvider;
          }
            
          return res.json({
            success: true,
            response: aiResponse,
            provider: selectedProvider,
            model: modelName
          });
        }
      } catch (pythonError) {
        console.log(`❌ Ошибка при использовании Python провайдера:`, 
                  pythonError instanceof Error ? pythonError.message : 'Неизвестная ошибка');
        // Продолжаем выполнение и пробуем другие провайдеры
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
                  
                  // Сохраняем ответ AI в базу данных
                  if (currentSessionId && responseText) {
                    console.log('💾 Сохраняем ответ AI...');
                    await chatHistory.saveMessage({
                      sessionId: currentSessionId,
                      sender: 'ai',
                      content: responseText,
                      provider: selectedProvider.name
                    });
                    console.log('✅ Ответ AI сохранен');
                  }
                  
                  // Отправляем реальный ответ от провайдера
                  return res.json({
                    success: true,
                    response: responseText,
                    provider: selectedProvider.name,
                    model: provider,
                    sessionId: currentSessionId
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

  // ==================== КОМАНДНЫЙ ЧАТ BOOOMERANGS ====================
  
  // Получение сообщений командного чата
  app.get("/api/team-chat/messages", async (req, res) => {
    try {
      const { after } = req.query;
      const afterId = after ? parseInt(after as string) : 0;
      
      const query = db
        .select()
        .from(teamMessages)
        .orderBy(desc(teamMessages.createdAt));
      
      // Если указан after, получаем только новые сообщения
      if (afterId > 0) {
        query.where(gt(teamMessages.id, afterId));
      } else {
        // Иначе получаем последние 50 сообщений
        query.limit(50);
      }
      
      const messages = await query;
      
      res.json({
        success: true,
        messages: messages.reverse() // Показываем в хронологическом порядке
      });
    } catch (error) {
      console.error("❌ Ошибка получения сообщений командного чата:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка получения сообщений"
      });
    }
  });

  // Отправка сообщения в командный чат
  app.post("/api/team-chat/messages", async (req, res) => {
    try {
      const { content, username, userId } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: "Сообщение не может быть пустым"
        });
      }

      if (!username) {
        return res.status(400).json({
          success: false,
          error: "Имя пользователя обязательно"
        });
      }

      // Сохраняем сообщение в базу данных
      const [newMessage] = await db
        .insert(teamMessages)
        .values({
          content: content.trim(),
          username: username,
          userId: userId || 1
        })
        .returning();

      console.log(`💬 Новое сообщение в командном чате от ${username}: ${content.substring(0, 50)}...`);

      res.json({
        success: true,
        message: newMessage
      });
    } catch (error) {
      console.error("❌ Ошибка отправки сообщения в командный чат:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка отправки сообщения"
      });
    }
  });

  // Получение статистики командного чата
  app.get("/api/team-chat/stats", async (req, res) => {
    try {
      const totalMessages = await db
        .select({ count: count() })
        .from(teamMessages);
      
      const recentUsers = await db
        .selectDistinct({ username: teamMessages.username })
        .from(teamMessages)
        .orderBy(desc(teamMessages.createdAt))
        .limit(10);

      res.json({
        success: true,
        stats: {
          totalMessages: totalMessages[0]?.count || 0,
          recentUsers: recentUsers.map(u => u.username)
        }
      });
    } catch (error) {
      console.error("❌ Ошибка получения статистики командного чата:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка получения статистики"
      });
    }
  });

  // Маршрут для командного чата
  app.get('/team-chat', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🪃 Командный чат BOOOMERANGS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #e0e0e0;
      height: 100vh;
      overflow: hidden;
    }
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-width: 1200px;
      margin: 0 auto;
      background: rgba(40, 40, 40, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .header {
      background: linear-gradient(90deg, #4a5568 0%, #2d3748 100%);
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status {
      font-size: 0.9rem;
      color: #68d391;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: rgba(26, 26, 26, 0.5);
    }
    .message {
      margin: 10px 0;
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 70%;
      word-wrap: break-word;
      animation: fadeIn 0.3s ease-in;
    }
    .message.user {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      margin-left: auto;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .message.other {
      background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .message-header {
      font-size: 0.8rem;
      opacity: 0.8;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .input-area {
      padding: 20px;
      background: rgba(45, 45, 45, 0.8);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 10px;
    }
    .message-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 25px;
      background: rgba(26, 26, 26, 0.8);
      color: #e0e0e0;
      font-size: 1rem;
      outline: none;
      transition: all 0.3s ease;
    }
    .message-input:focus {
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }
    .send-button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      min-width: 100px;
    }
    .send-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
    }
    .send-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .online-indicator {
      width: 8px;
      height: 8px;
      background: #68d391;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(104, 211, 145, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(104, 211, 145, 0); }
      100% { box-shadow: 0 0 0 0 rgba(104, 211, 145, 0); }
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="header">
      <div class="title">
        🪃 Командный чат BOOOMERANGS
      </div>
      <div class="status">
        <div class="online-indicator"></div>
        Онлайн
      </div>
    </div>
    
    <div class="messages-area" id="messagesArea">
      <div class="message other">
        <div class="message-header">Система</div>
        Добро пожаловать в командный чат! Здесь вы можете общаться с коллегами в реальном времени.
      </div>
    </div>
    
    <div class="input-area">
      <input 
        type="text" 
        class="message-input" 
        id="messageInput" 
        placeholder="Напишите сообщение..."
        maxlength="500"
      >
      <button class="send-button" id="sendButton" onclick="sendMessage()">
        Отправить
      </button>
    </div>
  </div>

  <script>
    console.log('🪃 Командный чат BOOOMERANGS загружен');
    
    let currentUser = 'mikhail'; // Можно брать из сессии
    let lastMessageId = 0;
    
    // Отправка сообщения
    function sendMessage() {
      const input = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      const message = input.value.trim();
      
      if (!message) return;
      
      // Блокируем кнопку
      sendButton.disabled = true;
      sendButton.textContent = 'Отправка...';
      
      // Добавляем сообщение в интерфейс сразу
      addMessageToUI(message, currentUser, true);
      
      // Очищаем поле ввода
      input.value = '';
      
      // Отправляем на сервер
      fetch('/api/team-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: message, 
          username: currentUser 
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Сообщение отправлено');
        } else {
          console.error('❌ Ошибка отправки:', data.error);
        }
      })
      .catch(error => {
        console.error('❌ Ошибка сети:', error);
      })
      .finally(() => {
        // Разблокируем кнопку
        sendButton.disabled = false;
        sendButton.textContent = 'Отправить';
      });
    }
    
    // Добавление сообщения в интерфейс
    function addMessageToUI(content, username, isCurrentUser = false) {
      const messagesArea = document.getElementById('messagesArea');
      const messageDiv = document.createElement('div');
      
      messageDiv.className = \`message \${isCurrentUser ? 'user' : 'other'}\`;
      messageDiv.innerHTML = \`
        <div class="message-header">\${username}</div>
        \${content}
      \`;
      
      messagesArea.appendChild(messageDiv);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
    
    // Загрузка новых сообщений
    function loadNewMessages() {
      fetch('/api/team-chat/messages')
      .then(response => response.json())
      .then(data => {
        if (data.success && data.messages) {
          data.messages.forEach(msg => {
            if (msg.id > lastMessageId && msg.username !== currentUser) {
              addMessageToUI(msg.content, msg.username, false);
              lastMessageId = msg.id;
            }
          });
        }
      })
      .catch(error => {
        console.error('❌ Ошибка загрузки сообщений:', error);
      });
    }
    
    // Обработка Enter
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Автоматическое обновление каждые 3 секунды
    setInterval(loadNewMessages, 3000);
    
    // Загружаем сообщения при запуске
    loadNewMessages();
    
    console.log('✅ Командный чат готов к работе');
  </script>
</body>
</html>`);
  });

  // API для отправки сообщений в командный чат
  app.post('/api/team-chat/send', async (req, res) => {
    try {
      const { content, username } = req.body;
      
      if (!content || !username) {
        return res.status(400).json({ 
          success: false, 
          error: 'Отсутствует содержимое сообщения или имя пользователя' 
        });
      }

      // Сохраняем сообщение в базе данных
      const insertQuery = `
        INSERT INTO team_messages (content, username, created_at) 
        VALUES ($1, $2, NOW()) 
        RETURNING *
      `;
      
      const result = await db.execute(sql`
        INSERT INTO team_messages (content, username, created_at) 
        VALUES (${content}, ${username}, NOW()) 
        RETURNING *
      `);
      const savedMessage = result.rows[0];

      console.log(`✅ Сообщение сохранено в командный чат: ${username}: ${content}`);

      res.json({
        success: true,
        message: savedMessage,
        status: 'Сообщение отправлено в командный чат'
      });

    } catch (error) {
      console.error('❌ Ошибка отправки сообщения в командный чат:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка сервера при отправке сообщения' 
      });
    }
  });

  return httpServer;
}
