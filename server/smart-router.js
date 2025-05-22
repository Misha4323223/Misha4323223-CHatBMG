/**
 * Интеллектуальный маршрутизатор сообщений к наиболее подходящим провайдерам
 * Анализирует сообщение и направляет его к специализированным провайдерам
 */

const express = require('express');
const router = express.Router();

// Импортируем провайдеры
const chatFreeProvider = require('./chatfree-improved');
const freechatEnhanced = require('./freechat-enhanced');
const deepspeekProvider = require('./deepspeek-fixed');
const claudeProvider = require('./claude-provider');
const deepInfraProvider = require('./deepinfra-provider');
const pythonProviderRoutes = require('./python_provider_routes');

// Специализации провайдеров
const PROVIDER_SPECIALTIES = {
  technical: {
    // Технические вопросы, код, программирование
    providers: ["Phind", "DeepSpeek", "DeepInfra_CodeLlama", "DeepInfra_Mistral"],
    keywords: [
      "код", "программирование", "javascript", "python", "java", "c++", "c#", 
      "coding", "programming", "code", "алгоритм", "algorithm", "функция", "function",
      "api", "сервер", "server", "backend", "frontend", "фронтенд", "бэкенд",
      "database", "база данных", "sql", "nosql", "mongodb", "json", "html", "css",
      "git", "github", "docker", "kubernetes", "devops", "react", "angular", "vue",
      "node", "npm", "yarn", "webpack", "babel", "typescript", "rust", "golang"
    ]
  },
  creative: {
    // Творческие запросы, генерация текста, истории
    providers: ["GeminiPro", "Claude", "Liaobots"],
    keywords: [
      "творчество", "креатив", "придумай", "сочини", "напиши", "создай", "генерация",
      "стих", "поэма", "рассказ", "история", "сказка", "роман", "новелла", "песня",
      "creative", "poem", "story", "tale", "fiction", "writing", "screenplay", "script",
      "слоган", "лозунг", "реклама", "маркетинг", "рифма", "метафора", "аллегория"
    ]
  },
  analytical: {
    // Аналитические вопросы, требующие глубоких рассуждений
    providers: ["Claude", "DeepInfra_Mixtral", "GeminiPro", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "анализ", "объясни", "почему", "сравни", "логика", "философия", "размышление",
      "докажи", "опровергни", "дилемма", "аргумент", "точка зрения", "критика",
      "analyze", "explain", "compare", "contrast", "philosophy", "ethics", "morality",
      "pros and cons", "advantages", "disadvantages", "thesis", "hypothesis", 
      "научный метод", "research", "study", "investigation", "exploration"
    ]
  },
  factual: {
    // Фактические вопросы, требующие точной информации
    providers: ["You", "Phind", "Qwen_Qwen_2_5_Max", "PerplexityApi"],
    keywords: [
      "факт", "информация", "статистика", "данные", "история", "событие", "дата",
      "кто", "что", "где", "когда", "fact", "information", "statistics", "data",
      "history", "event", "date", "who", "what", "where", "when", "how many", "how much",
      "определение", "definition", "термин", "term", "concept", "понятие"
    ]
  },
  current: {
    // Вопросы о текущих событиях, новостях
    providers: ["You", "PerplexityApi", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "новости", "актуальный", "последний", "текущий", "событие", "сегодня", "вчера",
      "новость", "news", "recent", "current", "latest", "today", "yesterday", "update",
      "тренд", "trend", "breaking", "headline", "заголовок", "месяц", "неделя", "год"
    ]
  },
  mathematical: {
    // Математические вопросы, вычисления
    providers: ["Claude", "DeepInfra_Mixtral", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "математика", "вычисления", "расчет", "формула", "уравнение", "интеграл", 
      "производная", "тригонометрия", "геометрия", "алгебра", "math", "calculation",
      "compute", "formula", "equation", "integral", "derivative", "trigonometry",
      "geometry", "algebra", "statistics", "calculus", "probability", "theorem"
    ]
  },
  business: {
    // Бизнес-вопросы, экономика, финансы
    providers: ["Claude", "GeminiPro", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "бизнес", "экономика", "финансы", "маркетинг", "стартап", "инвестиции", "продажи",
      "business", "economy", "finance", "marketing", "startup", "investment", "sales",
      "management", "strategy", "market", "customer", "client", "product", "service",
      "revenue", "profit", "loss", "bankruptcy", "accounting", "tax", "taxation"
    ]
  },
  translation: {
    // Перевод текста, языковые вопросы
    providers: ["Claude", "Qwen_Qwen_2_5_Max", "GeminiPro"],
    keywords: [
      "перевод", "переведи", "перевести", "язык", "translation", "translate", "language",
      "с русского на", "с английского на", "from english to", "from russian to",
      "грамматика", "grammar", "spelling", "правописание", "синоним", "synonym",
      "антоним", "antonym", "идиома", "idiom", "фразеологизм", "phraseology"
    ]
  },
  multimodal: {
    // Мультимодальные запросы с изображениями
    providers: ["Claude", "GeminiPro", "You"],
    keywords: [
      "изображение", "картинка", "фото", "фотография", "скриншот", "image", "picture",
      "photo", "screenshot", "опиши", "describe", "что изображено", "what is shown",
      "что на картинке", "what's in the picture", "проанализируй изображение"
    ]
  }
};

// Провайдеры по умолчанию
const DEFAULT_PROVIDERS = ["Qwen_Qwen_2_5_Max", "AItianhu", "Phind", "GeminiPro", "Claude"];

/**
 * Анализирует запрос и определяет его тематику
 * @param {string} message - Сообщение пользователя
 * @returns {Object} Категория запроса и провайдеры
 */
function analyzeMessage(message) {
  // Преобразуем сообщение в нижний регистр для поиска ключевых слов
  const lowerMessage = message.toLowerCase();
  
  // Массив обнаруженных категорий с количеством совпадений
  const detectedCategories = [];
  
  // Проверяем каждую категорию на наличие ключевых слов
  for (const [category, details] of Object.entries(PROVIDER_SPECIALTIES)) {
    let matchCount = 0;
    
    for (const keyword of details.keywords) {
      if (lowerMessage.includes(keyword)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      detectedCategories.push({
        category,
        matchCount,
        providers: details.providers
      });
    }
  }
  
  // Сортируем категории по количеству совпадений (от большего к меньшему)
  detectedCategories.sort((a, b) => b.matchCount - a.matchCount);
  
  // Если ни одна категория не подошла, используем провайдеры по умолчанию
  if (detectedCategories.length === 0) {
    return {
      category: "general",
      providers: DEFAULT_PROVIDERS,
      matchCount: 0
    };
  }
  
  // Возвращаем наиболее подходящую категорию
  return {
    category: detectedCategories[0].category,
    providers: detectedCategories[0].providers,
    matchCount: detectedCategories[0].matchCount,
    allMatches: detectedCategories // Для отладки и логирования
  };
}

/**
 * Выбирает наиболее подходящего провайдера и получает ответ
 * @param {string} message - Сообщение пользователя
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} - Результат от провайдера
 */
async function routeMessage(message, options = {}) {
  // Если изображение, сразу используем мультимодальный провайдер
  if (options.imageUrl) {
    const analysis = { 
      category: "multimodal", 
      providers: PROVIDER_SPECIALTIES.multimodal.providers 
    };
    console.log(`Обнаружено изображение! Используем мультимодальный провайдер`);
    return await getResponseFromProviders(message, analysis, options);
  }

  // Анализируем сообщение
  const analysis = analyzeMessage(message);
  console.log(`Категория сообщения: ${analysis.category} (совпадений: ${analysis.matchCount})`);
  console.log(`Рекомендуемые провайдеры: ${analysis.providers.join(', ')}`);
  
  return await getResponseFromProviders(message, analysis, options);
}

/**
 * Получает ответ от провайдеров из списка, пробуя каждый до первого успешного
 * @param {string} message - Сообщение пользователя
 * @param {Object} analysis - Результат анализа
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} - Ответ от провайдера
 */
async function getResponseFromProviders(message, analysis, options = {}) {
  const { category, providers } = analysis;
  let lastError = null;
  
  // Формируем системный промпт в зависимости от категории
  let systemPrompt = "Вы полезный ассистент. Отвечайте точно и по существу.";
  
  switch (category) {
    case "technical":
      systemPrompt = "Вы опытный программист. Давайте точные и подробные технические объяснения с примерами кода, где это уместно.";
      break;
    case "creative":
      systemPrompt = "Вы творческий ассистент. Создавайте оригинальные, интересные и увлекательные тексты.";
      break;
    case "analytical":
      systemPrompt = "Вы аналитический ассистент с критическим мышлением. Предоставляйте глубокий анализ, рассматривайте вопросы с разных сторон.";
      break;
    case "factual":
      systemPrompt = "Вы информационный ассистент. Предоставляйте точные, проверенные факты, ссылайтесь на источники, где это возможно.";
      break;
    case "current":
      systemPrompt = "Вы информационный ассистент с доступом к текущим данным. Предоставляйте актуальную информацию, где это возможно.";
      break;
    case "mathematical":
      systemPrompt = "Вы математический эксперт. Предоставляйте точные формулы, шаги решения и объяснения математических концепций.";
      break;
    case "business":
      systemPrompt = "Вы бизнес-консультант. Давайте практичные и реалистичные советы по бизнесу, маркетингу и финансам.";
      break;
    case "translation":
      systemPrompt = "Вы профессиональный переводчик. Обеспечивайте точный и естественный перевод, сохраняя стиль и нюансы оригинала.";
      break;
    case "multimodal":
      systemPrompt = "Вы визуальный аналитик. Детально описывайте содержимое изображений и отвечайте на вопросы о них.";
      break;
  }
  
  // Проверяем каждый провайдер из списка
  for (const provider of providers) {
    try {
      console.log(`Пробуем провайдер: ${provider} для категории: ${category}...`);
      
      let result;
      
      if (provider === "DeepSpeek") {
        // Для DeepSpeek используем специальный провайдер
        result = await deepspeekProvider.getDeepSpeekResponse(message);
      } else if (provider === "Claude") {
        // Для Claude используем Anthropic через Python G4F
        result = await claudeProvider.getClaudeResponse(message, {
          promptType: category,
          systemPrompt
        });
      } else if (provider.startsWith("DeepInfra")) {
        // Для DeepInfra используем специальный провайдер
        result = await deepInfraProvider.getDeepInfraResponse(message, {
          model: provider.replace("DeepInfra_", "").toLowerCase(),
          promptType: category
        });
      } else if (provider === "FreeChat" || provider === "ChatFree") {
        // Для FreeChat/ChatFree используем улучшенный провайдер
        result = await freechatEnhanced.getChatFreeEnhancedResponse(message, {
          systemPrompt
        });
      } else {
        // Для всех остальных используем Python G4F
        const pythonResponse = await pythonProviderRoutes.callPythonAI(
          message, 
          provider, 
          systemPrompt
        );
        
        if (pythonResponse) {
          result = {
            success: true,
            response: pythonResponse,
            provider: provider
          };
        } else {
          throw new Error(`Провайдер ${provider} не вернул ответ`);
        }
      }
      
      // Проверяем ответ
      if (result && result.success) {
        // Добавляем мета-информацию о категории
        result.category = category;
        result.bestProvider = provider;
        
        return result;
      }
    } catch (error) {
      console.error(`Ошибка при использовании провайдера ${provider}: ${error.message}`);
      lastError = error;
    }
  }
  
  // Если все указанные провайдеры отказали, пробуем Qwen как самый надежный
  if (!providers.includes("Qwen_Qwen_2_5_Max")) {
    try {
      console.log(`Пробуем резервный провайдер Qwen_Qwen_2_5_Max...`);
      
      const pythonResponse = await pythonProviderRoutes.callPythonAI(
        message, 
        "Qwen_Qwen_2_5_Max", 
        systemPrompt
      );
      
      if (pythonResponse) {
        return {
          success: true,
          response: pythonResponse,
          provider: "Qwen_Qwen_2_5_Max (fallback)",
          category,
          bestProvider: "Qwen_Qwen_2_5_Max"
        };
      }
    } catch (qwenError) {
      console.error(`Ошибка при использовании Qwen: ${qwenError.message}`);
    }
  }
  
  // В крайнем случае используем FreeChat, который имеет внутреннюю систему fallback
  try {
    console.log(`Последняя попытка: используем FreeChat с системой автоматического выбора...`);
    
    const result = await freechatEnhanced.getChatFreeEnhancedResponse(message, {
      systemPrompt
    });
    
    if (result && result.success) {
      result.category = category;
      result.bestProvider = "FreeChat (auto)";
      return result;
    }
  } catch (freechatError) {
    console.error(`Ошибка при использовании FreeChat: ${freechatError.message}`);
  }
  
  // Если все провайдеры отказали, возвращаем ошибку
  return {
    success: false,
    error: `Не удалось получить ответ от провайдеров категории ${category}. Последняя ошибка: ${lastError?.message || 'Неизвестная ошибка'}`,
    category,
    providers
  };
}

// API маршрут для обработки сообщений
router.post('/message', async (req, res) => {
  const { message, imageUrl } = req.body;
  
  if (!message && !imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'Сообщение или изображение должны быть предоставлены'
    });
  }
  
  // Если есть только изображение без текста, используем стандартный запрос для анализа
  const messageText = message || 'Проанализируй это изображение';
  
  try {
    // Маршрутизируем сообщение к подходящему провайдеру
    const result = await routeMessage(messageText, { imageUrl });
    
    res.json(result);
  } catch (error) {
    console.error(`Ошибка при маршрутизации сообщения: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: `Ошибка при обработке сообщения: ${error.message}`
    });
  }
});

// API маршрут для анализа сообщения (без отправки)
router.post('/analyze', (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Сообщение не может быть пустым'
    });
  }
  
  try {
    // Анализируем сообщение
    const analysis = analyzeMessage(message);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error(`Ошибка при анализе сообщения: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: `Ошибка при анализе сообщения: ${error.message}`
    });
  }
});

module.exports = router;
module.exports.routeMessage = routeMessage;
module.exports.analyzeMessage = analyzeMessage;