import express, { type Request, Response, NextFunction } from "express";
// Этот импорт вызывает ошибку из-за неверного форматирования в deepspeek-provider.js
// Отключаем прямой импорт проблемного файла
process.env.SKIP_DEEPSPEEK_ORIGINAL = 'true';
import { registerRoutes } from "./routes-minimal";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';

const app = express();
app.use(cors()); // Разрешаем CORS для всех маршрутов
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Обслуживание статических HTML файлов из корневой папки
app.use(express.static('.', {
  index: false,
  extensions: ['html'],
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // КРИТИЧЕСКИ ВАЖНО: маршруты чата ДО setupVite
  app.get('/smart-chat', (req, res) => {
    console.log('🎯 BOOOMERANGS SMART CHAT - главный файл');
    res.sendFile('booomerangs-smart-chat.html', { root: '.' });
  });
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Используем переменную окружения PORT если она доступна, иначе 5000
  // Это критично для правильной работы в окружении Replit
  const PORT = process.env.PORT || 5000;
  server.listen({
    port: PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${PORT}`);
  });
})();
