import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export async function registerRoutes(app: Express): Promise<Server> {
  // Базовые API для чата
  app.get('/api/chat-sessions/:username', async (req, res) => {
    try {
      const { username } = req.params;
      console.log(`🔍 Получение сессий для пользователя: ${username}`);
      
      // Пока возвращаем пустой массив
      res.json({ sessions: [] });
    } catch (error) {
      console.error('❌ Ошибка получения сессий:', error);
      res.status(500).json({ error: 'Ошибка получения сессий' });
    }
  });

  // API для отправки сообщений через старый роутер
  app.post('/api/ai/smart-chat', async (req, res) => {
    try {
      const { message, userId, sessionId } = req.body;
      
      console.log(`💬 Получено сообщение: ${message?.substring(0, 50)}...`);
      
      // Используем старый роутер со всеми провайдерами
      const { default: smartRouter } = await import('./smart-router-old.js');
      
      let response;
      if (typeof smartRouter.routeMessage === 'function') {
        console.log('🔄 Используем старый роутер со всеми провайдерами...');
        response = await smartRouter.routeMessage(message);
        console.log('✅ Получен ответ от старого роутера');
      } else {
        // Fallback к G4F провайдеру
        const { default: g4fProvider } = await import('./g4f-provider.js');
        console.log('🔄 Fallback к G4F провайдеру...');
        response = await g4fProvider.getChatResponse(message, { provider: 'auto' });
        console.log('✅ Получен ответ от G4F провайдера');
      }
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка обработки сообщения' 
      });
    }
  });

  // Стриминг endpoint для реального времени
  app.get('/api/streaming/chat', async (req, res) => {
    try {
      const message = req.query.message as string;
      const sessionId = req.query.sessionId as string;
      
      if (!message) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
      }
      
      console.log('🚀 СТРИМИНГ ЗАПРОС ПОЛУЧЕН!');
      console.log('📝 Сообщение для стриминга:', message);
      
      // Настраиваем SSE заголовки
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Получаем ответ через старый роутер
      const { default: smartRouter } = await import('./smart-router-old.js');
      console.log('🔍 Загружен smartRouter:', typeof smartRouter);
      
      let response;
      try {
        if (typeof smartRouter.routeMessage === 'function') {
          console.log('🔄 Используем старый роутер со всеми провайдерами...');
          response = await smartRouter.routeMessage(message);
          console.log('✅ Получен ответ от старого роутера');
        } else {
          // Fallback к G4F провайдеру
          const { default: g4fProvider } = await import('./g4f-provider.js');
          console.log('🔄 Fallback к G4F провайдеру...');
          response = await g4fProvider.getChatResponse(message, { provider: 'auto' });
          console.log('✅ Получен ответ от G4F провайдера');
        }
      } catch (error) {
        console.log('❌ Все провайдеры недоступны, используем демо-ответ...');
        response = {
          success: true,
          response: 'Демо-ответ от BOOOMERANGS AI. Настройте провайдеры для получения реальных ответов.',
          provider: 'DEMO'
        };
      }
      
      if (response.success) {
        const fullText = response.response;
        console.log('✅ Получен ответ, начинаем стриминг:', fullText.substring(0, 50) + '...');
        
        // Отправляем текст по частям
        const chunkSize = 3;
        let currentIndex = 0;
        
        const sendNextChunk = async () => {
          if (currentIndex < fullText.length) {
            const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);
            console.log(`📤 Отправляем chunk: "${chunk}"`);
            
            res.write(`data: ${JSON.stringify({ 
              type: 'chunk', 
              content: chunk,
              provider: response.provider 
            })}\n\n`);
            currentIndex += chunkSize;
            setTimeout(sendNextChunk, 50);
          } else {
            console.log('✅ Стриминг завершен');
            
            res.write(`data: ${JSON.stringify({ 
              type: 'complete',
              provider: response.provider,
              category: response.category || 'general'
            })}\n\n`);
            res.end();
          }
        };
        
        sendNextChunk();
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка получения ответа' })}\n\n`);
        res.end();
      }
      
    } catch (error) {
      console.error('❌ Ошибка стриминга:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Ошибка сервера' })}\n\n`);
      res.end();
    }
  });

  // API для анализа изображений
  app.post('/api/analyze-image', async (req, res) => {
    try {
      console.log('🖼️ Запрос анализа изображения');
      
      res.json({
        success: true,
        analysis: {
          description: 'Демо анализ изображения',
          objects: ['демо объект'],
          colors: ['синий', 'белый'],
          mood: 'позитивное'
        }
      });
    } catch (error) {
      console.error('❌ Ошибка анализа изображения:', error);
      res.status(500).json({ success: false, error: 'Ошибка анализа' });
    }
  });

  // API для генерации изображений
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      console.log(`🎨 Запрос генерации изображения: ${prompt}`);
      
      res.json({
        success: true,
        imageUrl: '/demo-image.jpg',
        prompt: prompt
      });
    } catch (error) {
      console.error('❌ Ошибка генерации изображения:', error);
      res.status(500).json({ success: false, error: 'Ошибка генерации' });
    }
  });

  // Статус сервера
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'running',
      message: 'Сервер успешно запущен после очистки проекта!',
      timestamp: new Date().toISOString(),
      version: '2.0-clean'
    });
  });

  // Создаем HTTP сервер
  const httpServer = createServer(app);
  return httpServer;
}