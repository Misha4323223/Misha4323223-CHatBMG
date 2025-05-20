import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./ws";
import { setupProxyMiddleware } from "./middleware/proxy";
import { authMiddleware } from "./middleware/auth";
import { z } from "zod";
import { authSchema, messageSchema } from "@shared/schema";
import crypto from "crypto";
import path from "path";
import fetch from "node-fetch";

// Импортируем обработчики для G4F и ChatGPT
import { handleSimpleG4F, simpleG4FPage } from "./simple-g4f.js";
import { handleChatGPTRequest, chatGPTPage } from "./chatgpt-direct.js";
import { handleG4FRequest, g4fPage } from "./g4f-provider.js";
import { handleFreeModelRequest, freeGPTPage } from "./free-models.js";
import { 
  initPythonG4FApi, 
  handlePythonG4FChat, 
  handlePythonG4FProviders,
  handlePythonG4FModels,
  pythonG4FPage
} from "./python-g4f-bridge.js";
import { handleYouGPT4oRequest, youGPT4oPage } from "./you-gpt4o.js";

// Используем стандартные обработчики без оптимизированного модуля

// Прокси-маршрут для ChatGPT
async function setupChatGPTProxy(app: Express) {
  const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
  
  if (!ACCESS_TOKEN) {
    console.warn("Предупреждение: ACCESS_TOKEN не задан в .env файле");
  }
  
  app.post("/api/chatgpt", async (req: Request, res: Response) => {
    try {
      // Получаем токен из переменной окружения или из заголовка запроса
      const token = ACCESS_TOKEN || req.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return res.status(401).json({ error: "Не предоставлен токен доступа" });
      }
      
      // Получаем сообщение от пользователя
      const userMessage = req.body.message || "";
      
      if (!userMessage) {
        return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
      }
      
      // Генерируем UUID для сообщения и сессии
      const messageId = crypto.randomUUID();
      const parentMessageId = crypto.randomUUID();
      
      // Формируем запрос к ChatGPT API в правильном формате
      const response = await fetch("https://chat.openai.com/backend-api/conversation", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          action: "next",
          messages: [
            {
              id: messageId,
              author: { role: "user" },
              content: { content_type: "text", parts: [userMessage] }
            }
          ],
          model: "text-davinci-002-render-sha",
          parent_message_id: parentMessageId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ChatGPT API error:", errorText);
        
        return res.status(response.status).json({ 
          error: `OpenAI error ${response.status}`,
          message: errorText
        });
      }

      const data = await response.json();
      res.json(data);

    } catch (error: any) {
      console.error("Ошибка прокси:", error);
      res.status(500).json({ 
        error: "Ошибка прокси-сервера", 
        message: error.message 
      });
    }
  });
  
  // Добавляем маршрут для проверки состояния прокси
  app.get("/api/chatgpt/status", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      message: "ChatGPT прокси-сервер работает",
      tokenConfigured: !!ACCESS_TOKEN
    });
  });
  
  console.log("ChatGPT прокси настроен и готов к работе");
}

// Настройка G4F интеграции напрямую в Express
async function setupG4FIntegration(app: Express) {
  // Маршрут для простого G4F интерфейса
  app.get("/g4f", g4fPage);
  
  // Маршрут для страницы прямого доступа к ChatGPT
  app.get("/chatgpt", chatGPTPage);
  
  // Маршрут для простого G4F чата
  app.get("/simple", (req, res) => {
    res.sendFile(path.join(process.cwd(), "simple-chat.html"));
  });
  
  // Статическая страница (минимальный интерфейс, работает в превью)
  app.get("/static", (req, res) => {
    res.sendFile(path.join(process.cwd(), "static-chat.html"));
  });
  
  // Маршрут для нашего реального GPT на основе Python G4F (без имитаций)
  app.get("/realgpt", (req, res) => {
    res.sendFile(path.join(process.cwd(), "real-gpt.html"));
  });
  
  // Маршрут для текстового GPT интерфейса (только чистый текст)
  app.get("/textgpt", (req, res) => {
    res.sendFile(path.join(process.cwd(), "text-only-gpt.html"));
  });
  
  // Маршрут для упрощенного текстового интерфейса (максимально надежный)
  app.get("/simple", (req, res) => {
    res.sendFile(path.join(process.cwd(), "text-gpt-simple.html"));
  });
  
  // Маршрут для надежного интерфейса
  app.get("/reliable", (req, res) => {
    res.sendFile(path.join(process.cwd(), "reliable-gpt.html"));
  });
  
  // Устанавливаем корневой маршрут для нашего бесплатного ChatGPT
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "reliable-gpt.html"));
  });
  
  // Маршрут для ультра-простого чата (работает в любом окружении)
  app.get("/ultra", (req, res) => {
    res.sendFile(path.join(process.cwd(), "ultra-simple.html"));
  });
  
  // Маршрут для ультра ChatGPT - работает с ACCESS_TOKEN
  app.get("/chatapitoken", (req, res) => {
    res.sendFile(path.join(process.cwd(), "ultra-chatgpt.html"));
  });
  
  // Маршрут для полностью бесплатного ChatGPT через G4F
  app.get("/freegpt", freeGPTPage);
  
  // Маршрут для улучшенного интерфейса с локальной обработкой
  app.get("/ultragpt", (req, res) => {
    res.sendFile(path.join(process.cwd(), "ultra-gpt.html"));
  });
  
  // Маршрут для Python G4F интерфейса
  app.get("/pythongpt", pythonG4FPage);
  
  // API для бесплатного доступа к AI моделям
  app.post("/api/free/model", handleFreeModelRequest);
  
  // API Python G4F для чата
  app.post("/api/python/g4f/chat", handlePythonG4FChat);
  
  // API Python G4F для получения списка провайдеров
  app.get("/api/python/g4f/providers", handlePythonG4FProviders);
  
  // API Python G4F для получения списка моделей
  app.get("/api/python/g4f/models", handlePythonG4FModels);
  
  // API для обработки запросов к G4F
  app.post("/api/g4f/simple", handleSimpleG4F);
  
  // API для полноценного G4F провайдера
  app.post("/api/g4f/provider", handleG4FRequest);
  
  // API для прямого доступа к ChatGPT через ACCESS_TOKEN
  app.post("/api/chatgpt/direct", handleChatGPTRequest);
  
  // Улучшенный текстовый API (фильтрует HTML/XML в ответах)
  app.post("/api/text/chat", async (req, res) => {
    try {
      const { message, model = 'gpt-3.5-turbo', max_retries = 3 } = req.body;
      console.log(`Запрос к текстовому API: ${JSON.stringify({message, model, max_retries}).substring(0, 100)}...`);
      
      // Получаем список провайдеров для поиска совместимого
      const providersResponse = await fetch('http://localhost:5001/api/python/g4f/providers');
      
      if (!providersResponse.ok) {
        throw new Error(`Ошибка при получении списка провайдеров: ${providersResponse.status}`);
      }
      
      const providersData = await providersResponse.json();
      
      // Фильтруем только работающие провайдеры, не требующие авторизации
      const workingProviders = providersData.providers
        .filter(provider => provider.working && !provider.needs_auth)
        .map(provider => provider.name);
      
      if (workingProviders.length === 0) {
        return res.json({
          response: 'К сожалению, нет доступных провайдеров. Пожалуйста, повторите попытку позже.',
          provider: 'no_providers',
          model: 'none'
        });
      }
      
      // Пытаемся последовательно использовать разные провайдеры
      // Начинаем с первых 5 (для ускорения)
      const providersList = workingProviders.slice(0, 5);
      console.log(`Доступные провайдеры: ${providersList.join(', ')}`);
      
      let success = false;
      let responseData = null;
      
      // Перебираем провайдеров
      for (const provider of providersList) {
        try {
          console.log(`Пробуем провайдера: ${provider}`);
          
          // Находим информацию о провайдере
          const providerInfo = providersData.providers.find(p => p.name === provider);
          
          // Используем модель по умолчанию для провайдера, если она есть
          const providerModel = providerInfo && providerInfo.default_model ? 
            providerInfo.default_model : undefined;
            
          console.log(`Провайдер ${provider} с моделью ${providerModel || 'не указана'}`);
          
          // Используем конкретного провайдера для запроса
          const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message,
              provider,
              max_retries: 1, // Для ускорения
              // Не указываем модель, чтобы провайдер использовал свою модель по умолчанию
            })
          });
          
          if (!response.ok) {
            console.log(`Провайдер ${provider} вернул ошибку: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          // Если ответ получен от локального фоллбека, попробуем другого провайдера
          if (data.provider === 'local_fallback') {
            console.log(`Провайдер ${provider} вернул фоллбек, пропускаем`);
            continue;
          }
          
          // Проверяем, содержит ли ответ HTML теги
          const containsHtml = typeof data.response === 'string' && 
            /<\s*[a-z][^>]*>/i.test(data.response);
          
          if (containsHtml) {
            console.log(`Ответ от ${provider} содержит HTML/XML, пропускаем`);
            continue;
          }
          
          // Если дошли до этой точки, у нас есть успешный ответ
          success = true;
          responseData = data;
          break;
        } catch (err) {
          console.error(`Ошибка при использовании провайдера ${provider}:`, err);
          continue;
        }
      }
      
      // Если смогли получить ответ от какого-то провайдера
      if (success && responseData) {
        console.log(`Успешный ответ от провайдера ${responseData.provider}`);
        return res.json(responseData);
      }
      
      // Если ни один провайдер не сработал, пробуем общий запрос
      console.log('Все провайдеры не работают, пробуем общий запрос');
      
      const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          max_retries: 3 // Больше попыток
        })
      });
      
      const data = await response.json();
      
      // Проверяем, содержит ли ответ HTML теги
      const containsHtml = typeof data.response === 'string' && 
        /<\s*[a-z][^>]*>/i.test(data.response);
      
      if (containsHtml) {
        console.log(`Ответ содержит HTML/XML, заменяем на текстовый`);
        return res.json({
          response: 'Получен ответ с HTML-разметкой, которая не поддерживается в текстовом режиме. Пожалуйста, попробуйте задать другой вопрос.',
          provider: 'text_filter',
          model: data.model || 'неизвестно'
        });
      }
      
      // Если это локальный фоллбек, также меняем сообщение
      if (data.provider === 'local_fallback') {
        return res.json({
          response: 'К сожалению, ни один из провайдеров текстового API не доступен. Пожалуйста, попробуйте задать другой вопрос или попробуйте позже.',
          provider: 'text_fallback',
          model: 'none'
        });
      }
      
      // Отправляем ответ клиенту
      return res.json(data);
      
    } catch (error) {
      console.error('Ошибка при обращении к текстовому API:', error);
      
      // В случае ошибки возвращаем информативное сообщение
      res.status(500).json({
        error: `Ошибка при обращении к текстовому API: ${error.message}`,
        response: 'Извините, произошла ошибка при обработке текстового запроса. Пожалуйста, повторите попытку позже.',
        provider: 'error',
        model: 'none'
      });
    }
  });
  
  // API для получения провайдеров для текстового режима
  app.get("/api/text/providers", async (req, res) => {
    try {
      // Используем стандартный список провайдеров, но фильтруем его
      const response = await fetch('http://localhost:5001/api/python/g4f/providers');
      
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Фильтруем провайдеров - только работающие и не требующие авторизации
      const textProviders = data.providers
        .filter(provider => {
          if (!provider.working || provider.needs_auth) return false;
          
          // Исключаем провайдеров TTS и генерации изображений
          const name = provider.name.toLowerCase();
          return !name.includes('tts') && !name.includes('image');
        })
        .map(provider => ({
          name: provider.name,
          model: provider.default_model || 'неизвестно',
          working: true
        }));
      
      // Отправляем отфильтрованный список
      res.json({
        providers: textProviders,
        count: textProviders.length
      });
      
    } catch (error) {
      console.error('Ошибка при получении списка текстовых провайдеров:', error);
      
      // В случае ошибки возвращаем пустой список
      res.status(500).json({
        error: `Ошибка при получении списка текстовых провайдеров: ${error.message}`,
        providers: [],
        count: 0
      });
    }
  });
  
  // Маршрут для You GPT-4o интерфейса
  app.get("/you-gpt4o", youGPT4oPage);
  
  // API для You GPT-4o (более новая модель GPT-4 через провайдер You)
  app.post("/api/you-gpt4o", handleYouGPT4oRequest);
  
  // Для обратной совместимости 
  app.post("/api/g4f/chat", handleSimpleG4F);
  
  // Этот маршрут был удален для избежания ошибок
  
  console.log("G4F и ChatGPT интеграция настроена и готова к работе");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Настраиваем прокси для ChatGPT и G4F
  await setupChatGPTProxy(app);
  await setupG4FIntegration(app);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocket(httpServer, storage);
  
  // Setup proxy middleware
  setupProxyMiddleware(app);
  
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
