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
  // Используем модуль direct-ai-provider для доступа к AI
  const directAiProvider = require('./direct-ai-provider');
  
  try {
    console.log(`DeepSpeek: Отправка запроса к настоящей AI модели Qwen...`);
    
    // Пытаемся получить ответ от Qwen через AItianhu (самый стабильный провайдер)
    const response = await directAiProvider.getChatResponse(query, { provider: 'AItianhu' });
    
    console.log(`DeepSpeek: Успешно получен ответ от настоящей AI модели Qwen`);
    
    return {
      success: true,
      response: response,
      provider: "DeepSpeek",
      model: "DeepSpeek AI (Qwen)"
    };
  } catch (error) {
    console.error("Ошибка DeepSpeek с AItianhu:", error);
    
    // В случае ошибки с AItianhu пробуем запасной вариант - Python G4F с Qwen_2_5_Max
    try {
      console.log(`DeepSpeek: Пробуем запасной вариант через Python G4F...`);
      
      // Используем Python провайдер как запасной вариант
      const pythonProviderRoutes = require('./python_provider_routes');
      
      const pythonResponse = await pythonProviderRoutes.callPythonAI(query, 'Qwen_Qwen_2_5_Max');
      
      if (pythonResponse) {
        console.log(`DeepSpeek: Успешно получен ответ от Python G4F`);
        
        return {
          success: true,
          response: pythonResponse,
          provider: "DeepSpeek",
          model: "DeepSpeek AI (Qwen 2.5 Max)"
        };
      }
      
      // Если Python G4F тоже не сработал, пробуем Phind
      const phindResponse = await directAiProvider.getChatResponse(query, { provider: 'Phind' });
      
      return {
        success: true,
        response: phindResponse,
        provider: "DeepSpeek",
        model: "DeepSpeek AI (Phind)"
      };
    } catch (backupError) {
      console.error("Все резервные провайдеры DeepSpeek не сработали:", backupError);
      
      // В случае полного отказа возвращаем ошибку
      return {
        success: false,
        error: "Не удалось связаться с AI-провайдерами для DeepSpeek"
      };
    }
  }
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