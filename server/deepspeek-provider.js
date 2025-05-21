/**
 * DeepSpeek провайдер - специализированный AI для технических вопросов
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Технические домены для определения запросов
const techDomains = [
  "javascript", "python", "java", "c++", "programming",
  "algorithm", "database", "api", "frontend", "backend"
];

// Функция для определения технических запросов
function isTechnicalQuery(query) {
  return techDomains.some(domain => query.toLowerCase().includes(domain));
}

// Функция для генерации JavaScript-ответа
function generateJavaScriptResponse(query) {
  // Примеры кода для технических вопросов
  return `Вот решение для вашего запроса:

\`\`\`javascript
// Пример реализации
function example() {
  console.log("DeepSpeek JavaScript пример");
  return "Результат выполнения кода";
}

// Тестирование функции
const result = example();
console.log(result);
\`\`\`

Это базовая реализация. Для более сложных случаев рекомендую...`;
}

// Функция для получения ответа от DeepSpeek через настоящую AI модель
async function getDeepSpeekResponse(query) {
  // Список провайдеров для DeepSpeek, отсортированный по приоритету
  const technicalProviders = [
    // Наиболее стабильные провайдеры - пробуем в первую очередь
    "AItianhu",          // Qwen
    "Qwen_Qwen_2_5_Max", // Python G4F с Qwen 2.5 Max
    "Phind",             // Технический AI специалист
    "DEEPSEEK",          // G4F провайдер
    "OpenaiAPI",         // OpenAI через G4F
    "OPENROUTER",        // Маршрутизатор моделей
    "PERPLEXITY",        // Perplexity AI (технический)
    "DeepInfra",         // DeepInfra AI
    "GigaChat",          // Российский AI
    "Gemini",            // Gemini API
    "GeminiPro",         // Gemini Pro API
    "Anthropic",         // Claude API
    "HuggingChat"        // Бесплатный провайдер Hugging Face
  ];
  
  // Используем модули для доступа к AI
  const directAiProvider = require('./direct-ai-provider');
  const pythonProviderRoutes = require('./python_provider_routes');
  
  // Проходим по списку провайдеров и пробуем каждый
  for (const provider of technicalProviders) {
    try {
      console.log(`DeepSpeek: Пробуем провайдер ${provider}...`);
      
      let response;
      
      // Определяем, какой метод использовать для этого провайдера
      if (provider === "Qwen_Qwen_2_5_Max" || provider.startsWith("Qwen_")) {
        // Этот провайдер доступен только через Python G4F
        response = await pythonProviderRoutes.callPythonAI(query, provider);
        
        if (response) {
          console.log(`DeepSpeek: Успешно получен ответ от ${provider} через Python G4F`);
          
          return {
            success: true,
            response: response,
            provider: "DeepSpeek",
            model: `DeepSpeek AI (${provider})`
          };
        }
      } else {
        // Остальные провайдеры доступны через direct-ai-provider
        response = await directAiProvider.getChatResponse(query, { provider: provider });
        
        if (response) {
          console.log(`DeepSpeek: Успешно получен ответ от ${provider}`);
          
          return {
            success: true,
            response: response,
            provider: "DeepSpeek",
            model: `DeepSpeek AI (${provider})`
          };
        }
      }
    } catch (error) {
      // Логируем ошибку и продолжаем со следующим провайдером
      console.error(`DeepSpeek: Ошибка с провайдером ${provider}:`, error.message);
    }
  }
  
  // Если ни один из провайдеров не сработал, пробуем g4f Python сервер напрямую
  try {
    console.log(`DeepSpeek: Пробуем прямой запрос к Python G4F серверу...`);
    
    // Запрос к Python G4F серверу (работает с группами провайдеров)
    const pythonUrl = `http://localhost:5004/python/chat`;
    const pythonResponse = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    
    if (pythonResponse.ok) {
      const result = await pythonResponse.json();
      
      if (result && result.response) {
        console.log(`DeepSpeek: Успешно получен ответ от Python G4F`);
        
        return {
          success: true,
          response: result.response,
          provider: "DeepSpeek",
          model: `DeepSpeek AI (${result.provider || 'G4F'})`
        };
      }
    }
  } catch (finalError) {
    console.error("DeepSpeek: Ошибка при прямом запросе к Python G4F:", finalError.message);
  }
  
  // В случае полного отказа возвращаем ошибку
  return {
    success: false,
    error: "Не удалось связаться с AI-провайдерами для DeepSpeek"
  };
}

// Маршрут для обработки запросов к DeepSpeek
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Запрос не может быть пустым"
      });
    }
    
    // Получаем ответ от DeepSpeek
    const response = await getDeepSpeekResponse(query);
    
    res.json(response);
  } catch (error) {
    console.error("Ошибка в маршруте DeepSpeek:", error);
    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
});

module.exports = router;
module.exports.getDeepSpeekResponse = getDeepSpeekResponse;