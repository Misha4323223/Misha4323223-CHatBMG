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

// Демо-функция для показа работы DeepSpeek
async function getDeepSpeekResponse(query) {
  // Используем модуль direct-ai-provider для доступа к AI
  const directAiProvider = require('./direct-ai-provider');
  
  try {
    // Пытаемся получить ответ от Qwen через AItianhu
    const response = await directAiProvider.getChatResponse(query, { provider: 'AItianhu' });
    
    return {
      success: true,
      response: response,
      provider: "DeepSpeek",
      model: "DeepSpeek AI"
    };
  } catch (error) {
    console.error("Ошибка DeepSpeek:", error);
    
    // Если не удалось получить ответ от Qwen, используем локальную генерацию
    return {
      success: true,
      response: generateJavaScriptResponse(query),
      provider: "DeepSpeek-Local",
      model: "DeepSpeek AI"
    };
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