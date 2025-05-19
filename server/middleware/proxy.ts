import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Function to setup proxy middleware
export function setupProxyMiddleware(app: Express) {
  // Получаем переменные окружения
  const proxyApiKey = process.env.PROXY_API_KEY || "";
  const proxyServiceUrl = process.env.PROXY_SERVICE_URL || "https://api.example.com";

  if (!proxyApiKey) {
    console.warn("WARNING: PROXY_API_KEY not set in .env file");
  }

  // Middleware для маршрута конфигурации прокси
  app.get("/api/proxy/config", async (req: Request, res: Response) => {
    try {
      // Проверяем аутентификацию
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Отправляем конфигурацию прокси (но не сам API ключ)
      return res.status(200).json({
        proxyEnabled: !!proxyApiKey,
        proxyServiceUrl: proxyServiceUrl,
        userAuthorized: true
      });
    } catch (error) {
      console.error("Proxy config error:", error);
      return res.status(500).json({ message: "Server error getting proxy configuration" });
    }
  });

  // Middleware для обработки запросов прокси
  app.use("/proxy/*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Проверяем аутентификацию пользователя
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required for proxy" });
      }
      
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token for proxy request" });
      }
      
      // Проверяем наличие API ключа
      if (!proxyApiKey) {
        return res.status(503).json({ message: "Proxy service is not configured" });
      }
      
      // Извлекаем целевой URL из пути запроса
      const targetPath = req.path.replace("/proxy/", "");
      
      if (!targetPath) {
        return res.status(400).json({ message: "No target URL specified" });
      }
      
      // Декодируем URL, если он закодирован
      const decodedPath = decodeURIComponent(targetPath);
      
      // Строим полный целевой URL
      let targetUrl = decodedPath;
      if (!decodedPath.startsWith("http")) {
        // Если путь не содержит протокол, проверяем конфигурацию
        if (decodedPath.startsWith("/")) {
          // Это относительный путь, добавляем его к базовому URL
          targetUrl = `${proxyServiceUrl}${decodedPath}`;
        } else {
          // Это хост без протокола
          targetUrl = `https://${decodedPath}`;
        }
      }
      
      console.log(`Proxying request to: ${targetUrl}`);
      
      // Переадресуем запрос к целевому URL
      try {
        const headers: Record<string, string> = {};
        
        // Копируем соответствующие заголовки из исходного запроса
        const headersToCopy = [
          "accept",
          "content-type",
          "user-agent"
        ];
        
        headersToCopy.forEach(header => {
          if (req.headers[header]) {
            headers[header] = req.headers[header] as string;
          }
        });
        
        // Добавляем заголовки для идентификации прокси-запросов
        headers["x-proxy-user"] = user.username;
        headers["x-proxy-api-key"] = proxyApiKey;
        
        // Делаем запрос к целевому ресурсу
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
        });
        
        // Получаем данные ответа
        const contentType = response.headers.get("content-type") || "";
        let data;
        
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        // Пересылаем ответ
        res.status(response.status);
        
        // Копируем соответствующие заголовки из ответа
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        res.send(data);
      } catch (error) {
        console.error("Proxy request error:", error);
        return res.status(502).json({ 
          message: "Failed to proxy request to target", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    } catch (error) {
      console.error("Proxy middleware error:", error);
      return res.status(500).json({ message: "Server error in proxy middleware" });
    }
  });
}
