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

// Импортируем простые обработчики для G4F
import { handleSimpleG4F, simpleG4FPage } from "./simple-g4f.js";

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
  app.get("/g4f", simpleG4FPage);
  
  // Маршрут для сверхпростого чата (гарантированно работает в любом браузере)
  app.get("/simple", (req, res) => {
    res.sendFile(path.join(process.cwd(), "simple-chat.html"));
  });
  
  // Статическая страница (минимальный интерфейс, работает в превью)
  app.get("/static", (req, res) => {
    res.sendFile(path.join(process.cwd(), "static-chat.html"));
  });
  
  // Устанавливаем корневой маршрут для статического чата
  app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "static-chat.html"));
  });
  
  // API для обработки запросов к G4F
  app.post("/api/g4f/simple", handleSimpleG4F);
  
  // Для обратной совместимости 
  app.post("/api/g4f/chat", handleSimpleG4F);
  
  console.log("Простая G4F интеграция настроена и готова к работе");
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

// Маршрут для самого простого чата (ультра-совместимость)
app.get("/ultra", (req, res) => {
  res.sendFile(path.join(process.cwd(), "ultra-simple.html"));
});
