import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { saveMessage, getSessionMessages, getUserChatSessions, createChatSession, updateSessionTitle, deleteSession } from './chat-history.js';
import multer from 'multer';

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB максимум
  }
});

// Подключение к стриминговому серверу
async function connectToStreamingServer(message: string, context: string = '') {
  try {
    const response = await fetch('http://localhost:5001/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        context: context,
        stream: true
      })
    });

    if (response.ok && response.body) {
      return response.body;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Ошибка подключения к стриминговому серверу:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // ============== CHAT API ==============
  
  // Получение всех сессий пользователя
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const username = req.query.username as string || 'anna';
      console.log('🔍 Запрос сессий для пользователя:', username);
      
      const sessions = await getUserChatSessions(username);
      console.log(`📋 Найдено ${sessions.length} сессий для пользователя ${username}`);
      
      res.json({
        success: true,
        sessions: sessions
      });
    } catch (error) {
      console.error('❌ Ошибка получения сессий:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения списка чатов'
      });
    }
  });

  // Создание новой сессии
  app.post('/api/chat/sessions', async (req, res) => {
    try {
      const { username, title } = req.body;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Имя пользователя обязательно'
        });
      }
      
      const session = await createChatSession(username, title || 'Новый чат');
      
      res.json({
        success: true,
        session: session
      });
    } catch (error) {
      console.error('❌ Ошибка создания сессии:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка создания новой сессии'
      });
    }
  });

  // Получение сообщений сессии
  app.get('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      console.log(`📋 Загружаем сообщения для сессии ${sessionId}...`);
      
      const messages = await getSessionMessages(sessionId);
      console.log(`✅ Найдено ${messages.length} сообщений для сессии ${sessionId}`);
      
      res.json({
        success: true,
        messages: messages
      });
    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения сообщений'
      });
    }
  });

  // Сохранение сообщения в сессию
  app.post('/api/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { content, sender, userId, provider, model } = req.body;
      
      console.log(`💾 Сохраняем сообщение в сессию ${sessionId}:`, { sessionId, content: content.substring(0, 50) + '...', sender, userId, provider });
      
      const messageData = {
        sessionId,
        content,
        sender,
        userId,
        provider: provider || null,
        model: model || null,
        category: null,
        confidence: null,
        imageUrl: null
      };
      
      const savedMessage = await saveMessage(messageData);
      console.log('✅ Сообщение сохранено:', savedMessage.id);
      
      res.json({
        success: true,
        message: savedMessage
      });
    } catch (error) {
      console.error('❌ Ошибка сохранения сообщения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сохранения сообщения'
      });
    }
  });

  // Обновление заголовка сессии
  app.patch('/api/chat/sessions/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { title } = req.body;
      
      await updateSessionTitle(sessionId, title);
      
      res.json({
        success: true,
        message: 'Заголовок обновлен'
      });
    } catch (error) {
      console.error('❌ Ошибка обновления заголовка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка обновления заголовка'
      });
    }
  });

  // Удаление сессии
  app.delete('/api/chat/sessions/:sessionId', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      await deleteSession(sessionId);
      
      res.json({
        success: true,
        message: 'Сессия удалена'
      });
    } catch (error) {
      console.error('❌ Ошибка удаления сессии:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка удаления сессии'
      });
    }
  });

  // ============== AI STREAMING ==============
  
  // Стриминговый чат с AI
  app.post('/api/ai/stream-chat', async (req, res) => {
    try {
      const { message, context = '' } = req.body;
      
      console.log('🌊 Стриминговый запрос:', message.substring(0, 100) + '...');
      console.log('🔗 Подключаемся к стриминговому серверу на 5001...');
      
      const streamResponse = await connectToStreamingServer(message, context);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      console.log('✅ Стриминг подключен успешно!');
      
      // Передаем поток напрямую клиенту
      streamResponse.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
      
    } catch (error) {
      console.error('❌ Ошибка стримингового чата:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка подключения к AI сервису'
      });
    }
  });

  // WebSocket для реального времени
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws) => {
    console.log('🔌 WebSocket клиент подключен');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 WebSocket сообщение:', message.type);
        
        // Обработка различных типов сообщений
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'chat':
            // Обработка чат сообщений через WebSocket
            break;
        }
      } catch (error) {
        console.error('❌ Ошибка обработки WebSocket сообщения:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket клиент отключен');
    });
  });

  console.log('✅ Чистые маршруты зарегистрированы успешно');
  return httpServer;
}