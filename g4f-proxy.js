// Прокси-сервер для ChatGPT с использованием g4f (бесплатный)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import g4f from 'g4f';

// Настройка приложения
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static('./'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'g4f-index.html'));
});

// Маршрут для статус-страницы
app.get('/status', (req, res) => {
  res.json({
    status: "ok",
    message: "G4F Прокси-сервер работает",
    models: "Используются провайдеры g4f (бесплатно)"
  });
});

// Список провайдеров g4f 
app.get('/api/providers', (req, res) => {
  try {
    // Получаем список доступных провайдеров
    const providers = g4f.Provider.list_providers();
    
    // Форматируем провайдеров для ответа
    const formattedProviders = providers.map(provider => ({
      name: provider.name,
      working: provider.working,
      supports_stream: provider.supports_stream
    }));
    
    res.json({
      providers: formattedProviders,
      count: formattedProviders.length,
      working_count: formattedProviders.filter(p => p.working).length
    });
  } catch (error) {
    console.error("Ошибка при получении списка провайдеров:", error);
    res.status(500).json({ 
      error: "Ошибка при получении списка провайдеров", 
      message: error.message 
    });
  }
});

// Основной маршрут для запросов к G4F
app.post('/api/chat', async (req, res) => {
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
    
  } catch (error) {
    console.error("Ошибка G4F:", error);
    res.status(500).json({ 
      error: "Ошибка при обработке запроса G4F", 
      message: error.message 
    });
  }
});

// Запуск сервера
const PORT = process.env.PROXY_PORT || 3334; // Изменяем порт, чтобы не конфликтовал с основным приложением
app.listen(PORT, '0.0.0.0', () => {
  console.log(`G4F Прокси-сервер работает на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT}/ в браузере`);
});