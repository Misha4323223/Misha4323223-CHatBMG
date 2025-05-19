// JavaScript обработчики для G4F
import g4f from 'g4f';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обработчик для получения списка провайдеров
export async function getProviders(req, res) {
  try {
    // Получаем список провайдеров
    const providers = g4f.Provider.list_providers();
    
    // Форматируем для ответа
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
    console.error("Ошибка получения провайдеров:", error);
    res.status(500).json({ 
      error: "Ошибка получения списка провайдеров", 
      message: error.message 
    });
  }
}

// Обработчик для запросов к G4F
export async function processG4FRequest(req, res) {
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
}

// Обработчик для отображения страницы G4F
export function g4fPage(req, res) {
  res.sendFile(path.join(process.cwd(), "g4f-direct.html"));
}