// Прямая интеграция G4F без отдельного сервера
import g4f from 'g4f';
import type { Express, Request, Response } from "express";
import path from "path";

// Типы для библиотеки g4f
interface Provider {
  name: string;
  working: boolean;
  supports_stream: boolean;
}

// Доступ к g4f API (библиотека динамическая, используем any)
const g4fAny = g4f as any;

// Настройка G4F маршрутов
export function setupG4FDirect(app: Express) {
  // Маршрут для главной страницы G4F
  app.get("/g4f-direct", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "g4f-direct.html"));
  });

  // Получить список доступных провайдеров
  app.get("/api/g4f/providers", async (req: Request, res: Response) => {
    try {
      // Получаем список провайдеров
      const providers = g4fAny.Provider.list_providers();
      
      // Форматируем для ответа
      const formattedProviders = providers.map((provider: Provider) => ({
        name: provider.name,
        working: provider.working,
        supports_stream: provider.supports_stream
      }));
      
      res.json({
        providers: formattedProviders,
        count: formattedProviders.length,
        working_count: formattedProviders.filter((p: Provider) => p.working).length
      });
    } catch (error: any) {
      console.error("Ошибка получения провайдеров:", error);
      res.status(500).json({ 
        error: "Ошибка получения списка провайдеров", 
        message: error.message 
      });
    }
  });

  // Маршрут для обработки запросов к G4F
  app.post("/api/g4f/direct", async (req: Request, res: Response) => {
    try {
      // Получаем сообщение из тела запроса
      const userMessage = req.body.message || "";
      
      if (!userMessage) {
        return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
      }
      
      // Получаем настройки из запроса
      const providerId = req.body.provider || "auto"; // auto по умолчанию
      const modelId = req.body.model || "gpt-3.5-turbo"; // gpt-3.5-turbo по умолчанию
      
      console.log(`Запрос к G4F: провайдер=${providerId}, модель=${modelId}, сообщение=${userMessage.substring(0, 30)}...`);
      
      // Выбираем провайдера
      let selectedProvider = null;
      if (providerId !== "auto") {
        const providers = g4f.Provider.list_providers();
        selectedProvider = providers.find(p => p.name.toLowerCase() === providerId.toLowerCase());
        
        if (!selectedProvider) {
          return res.status(400).json({ error: `Провайдер ${providerId} не найден` });
        }
      }
      
      // Создаем запрос к G4F
      const response = await g4f.Chat.completion({
        model: modelId,
        messages: [{ role: "user", content: userMessage }],
        provider: selectedProvider
      });
      
      console.log("Ответ от G4F получен:", response.substring(0, 30) + "...");
      
      // Формируем ответ в формате ChatGPT для совместимости с фронтендом
      const formattedResponse = {
        message: {
          content: {
            content_type: "text",
            parts: [response]
          }
        }
      };
      
      res.json(formattedResponse);
    } catch (error: any) {
      console.error("Ошибка G4F:", error);
      res.status(500).json({ 
        error: "Ошибка при обработке запроса G4F", 
        message: error.message 
      });
    }
  });

  console.log("G4F прямая интеграция настроена");
}