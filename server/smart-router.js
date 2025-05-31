/**
 * Интеллектуальный маршрутизатор сообщений к наиболее подходящим провайдерам
 * Анализирует сообщение и направляет его к специализированным провайдерам
 */

const express = require('express');
const router = express.Router();

// Система логирования
const SmartLogger = {
  route: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`🎯 [${timestamp}] SMART ROUTER: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  provider: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`🤖 [${timestamp}] PROVIDER: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  success: (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] SUCCESS: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] ERROR: ${message}`, error);
  }
};

// Импортируем провайдеры
const chatFreeProvider = require('./chatfree-provider');
const deepspeekProvider = require('./deepspeek-provider');
const claudeProvider = require('./claude-provider');
const deepInfraProvider = require('./deepinfra-provider');
const pythonProviderRoutes = require('./python_provider_routes');
const embroideryHandler = require('./embroidery-chat-handler');
const aiEmbroideryPipeline = require('./ai-embroidery-pipeline');
const webSearchProvider = require('./web-search-provider');

/**
 * Упрощенная интеграция веб-поиска и AI
 */
async function getSmartResponse(userQuery) {
  try {
    SmartLogger.route(`🚀 ВЫЗВАНА УПРОЩЕННАЯ ИНТЕГРАЦИЯ для: "${userQuery}"`);
    
    // Проверяем, нужен ли поиск
    const searchNeeded = webSearchProvider.needsWebSearch(userQuery);
    SmartLogger.route(`🔍 Проверка поиска в упрощенной функции: ${searchNeeded}`);
    
    if (!searchNeeded) {
      SmartLogger.route(`❌ Поиск не нужен, выходим`);
      return { success: false, reason: 'no_search_needed' };
    }
    
    SmartLogger.route(`✅ Выполняем поиск + AI для: "${userQuery}"`);
    
    // Получаем данные из интернета
    const searchResults = await webSearchProvider.performWebSearch(userQuery);
    
    if (searchResults.success && searchResults.results && searchResults.results.length > 0) {
      const searchContext = webSearchProvider.formatSearchResultsForAI(searchResults);
      
      // Простой промпт для AI
      const prompt = `Вопрос: ${userQuery}

Актуальные данные:
${searchContext}

Ответь на основе этих данных на русском языке.`;

      // Пробуем получить ответ от AI
      const pythonProvider = require('./python_provider_routes');
      const result = await pythonProvider.callPythonAI(prompt, 'Qwen_Qwen_2_72B');
      
      if (result.success && result.response) {
        // Проверяем, что ответ содержит полезную информацию
        const hasWeatherData = result.response.includes('°C') || 
                              result.response.includes('градус') || 
                              result.response.includes('температура') ||
                              result.response.includes('дождь') ||
                              result.response.includes('влажность');
        
        const isRefusal = result.response.toLowerCase().includes('не могу предоставить');
        
        if (hasWeatherData && !isRefusal) {
          SmartLogger.success(`✅ Упрощенная интеграция получила реальные данные!`);
          return {
            success: true,
            response: result.response,
            provider: 'Qwen_Qwen_2_72B',
            searchUsed: true
          };
        }
        
        SmartLogger.route(`⚠️ Ответ не содержит реальных данных: hasWeatherData=${hasWeatherData}, isRefusal=${isRefusal}`);
      }
    }
    
    return { success: false, reason: 'search_failed' };
    
  } catch (error) {
    SmartLogger.error(`Ошибка поиска: ${error.message}`);
    return { success: false, reason: 'error' };
  }
}

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
    providers: ["Qwen_Qwen_2_72B", "Claude", "DeepInfra_Mixtral", "GeminiPro", "Qwen_Qwen_2_5_Max"],
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
    providers: ["Qwen_Qwen_2_72B", "You", "Phind", "Qwen_Qwen_2_5_Max", "PerplexityApi"],
    keywords: [
      "факт", "информация", "статистика", "данные", "история", "событие", "дата",
      "кто", "что", "где", "когда", "fact", "information", "statistics", "data",
      "history", "event", "date", "who", "what", "where", "when", "how many", "how much",
      "определение", "definition", "термин", "term", "concept", "понятие"
    ]
  },
  current: {
    // Вопросы о текущих событиях, новостях
    providers: ["Qwen_Qwen_2_72B", "You", "PerplexityApi", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "новости", "актуальный", "последний", "текущий", "событие", "сегодня", "вчера",
      "новость", "news", "recent", "current", "latest", "today", "yesterday", "update",
      "тренд", "trend", "breaking", "headline", "заголовок", "месяц", "неделя", "год"
    ]
  },
  mathematical: {
    // Математические вопросы, вычисления
    providers: ["Qwen_Qwen_2_72B", "Claude", "DeepInfra_Mixtral", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "математика", "вычисления", "расчет", "формула", "уравнение", "интеграл", 
      "производная", "тригонометрия", "геометрия", "алгебра", "math", "calculation",
      "compute", "formula", "equation", "integral", "derivative", "trigonometry",
      "geometry", "algebra", "statistics", "calculus", "probability", "theorem"
    ]
  },
  image_generation: {
    // Генерация изображений, принтов, дизайна
    providers: ["image_generator"],
    keywords: [
      "создай изображение", "нарисуй", "сгенерируй картинку", "создай принт", "дизайн для футболки",
      "create image", "generate picture", "draw", "design", "artwork", "illustration",
      "принт для футболки", "принт на футболку", "логотип", "иконка", "графика", "постер", "баннер", "стикер",
      "print", "logo", "icon", "graphic", "poster", "banner", "sticker", "t-shirt design",
      "футболка", "одежда", "streetwear", "мерч", "merchandise", "clothing",
      "visualize", "sketch", "art", "creative", "visual", "picture", "image",
      "рисунок", "картинка", "изображение", "визуализация", "концепт", "макет"
    ]
  },
  image_editing: {
    // Редактирование изображений через Replicate AI
    providers: ["replicate_editor"],
    keywords: [
      "убери", "удали", "измени", "замени", "отредактируй", "улучши", "поменяй",
      "remove", "delete", "edit", "modify", "change", "replace", "enhance", "improve",
      "фон", "background", "стиль", "style", "качество", "quality", "объект", "object",
      "редактирование", "editing", "обработка", "processing", "коррекция", "correction"
    ]
  },
  shopping: {
    // Поиск магазинов, покупки, торговые центры, услуги
    providers: ["Qwen_Qwen_2_72B", "You", "PerplexityApi", "Qwen_Qwen_2_5_Max", "Phind"],
    keywords: [
      "магазин", "магазины", "купить", "где купить", "торговый центр", "тц", "мол", "супермаркет",
      "shop", "store", "shopping", "buy", "purchase", "mall", "supermarket", "market",
      "аптека", "pharmacy", "ресторан", "кафе", "restaurant", "cafe", "бар", "bar",
      "банк", "bank", "отделение", "офис", "салон", "центр", "сервис", "service",
      "найди", "где находится", "адрес", "местоположение", "рядом", "близко",
      "find", "locate", "address", "location", "near", "nearby", "close", "around"
    ]
  },
  business: {
    // Бизнес-вопросы, экономика, финансы
    providers: ["Qwen_Qwen_2_72B", "Claude", "GeminiPro", "Qwen_Qwen_2_5_Max"],
    keywords: [
      "бизнес", "экономика", "финансы", "маркетинг", "стартап", "инвестиции", "продажи",
      "business", "economy", "finance", "marketing", "startup", "investment", "sales",
      "management", "strategy", "market", "customer", "client", "product", "service",
      "revenue", "profit", "loss", "bankruptcy", "accounting", "tax", "taxation"
    ]
  },
  translation: {
    // Перевод текста, языковые вопросы
    providers: ["Qwen_Qwen_2_72B", "Claude", "Qwen_Qwen_2_5_Max", "GeminiPro"],
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
const DEFAULT_PROVIDERS = ["FreeGpt", "Liaobots", "HuggingChat", "DeepInfra", "You"];

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
  
  // Специальная проверка для генерации изображений с более гибким распознаванием
  const imageGenerationPatterns = [
    /создай.*принт/i,
    /нарисуй/i,
    /сгенерируй.*картинк/i,
    /дизайн.*футболк/i,
    /принт.*футболк/i,
    /создай.*изображение/i,
    /логотип/i,
    /рисунок/i,
    /макет/i,
    /концепт/i
  ];
  
  // Специальная проверка для редактирования изображений
  const imageEditingPatterns = [
    /убери.*с.*изображения/i,
    /удали.*с.*картинки/i,
    /замени.*фон/i,
    /поменяй.*фон/i,
    /отредактируй.*изображение/i,
    /улучши.*качество/i,
    /измени.*стиль/i,
    /remove.*from.*image/i,
    /edit.*image/i,
    /change.*background/i,
    /enhance.*image/i
  ];
  
  let isImageGeneration = false;
  for (const pattern of imageGenerationPatterns) {
    if (pattern.test(message)) {
      isImageGeneration = true;
      break;
    }
  }
  
  let isImageEditing = false;
  for (const pattern of imageEditingPatterns) {
    if (pattern.test(message)) {
      isImageEditing = true;
      break;
    }
  }
  
  if (isImageEditing) {
    detectedCategories.push({
      category: 'image_editing',
      matchCount: 15, // Самый высокий приоритет для редактирования
      providers: PROVIDER_SPECIALTIES.image_editing.providers
    });
  } else if (isImageGeneration) {
    detectedCategories.push({
      category: 'image_generation',
      matchCount: 10, // Высокий приоритет
      providers: PROVIDER_SPECIALTIES.image_generation.providers
    });
  }
  
  // Проверка на редактирование изображений
  const imageEditPatterns = [
    // Команды добавления
    /добавь.*к.*изображени/i,
    /измени.*изображени/i,
    /сделай.*ярче/i,
    /сделай.*темнее/i,
    /добавь.*логотип/i,
    /добавь.*текст/i,
    /поменяй.*цвет/i,
    /убери.*фон/i,
    // Команды удаления объектов
    /убери(?!.*фон)/i,  // убери (но не фон)
    /удали/i,
    /убрать/i,
    /удалить/i,
    /remove/i,
    /delete/i,
    /добавь.*фон/i,
    /сделай.*больше/i,
    /сделай.*меньше/i,
    /добавь.*к.*этому/i,
    /измени.*на/i,
    /переделай/i,
    /улучши/i,
    /модифицируй/i,
    /добавь.*сзади/i,
    /добавь.*спереди/i,
    /добавь.*рядом/i,
    /добавь.*на.*фон/i,
    /добавь.*него/i,
    /добавь.*неё/i,
    /добавь.*них/i,
    /добавь.*грибы/i,
    /добавь.*цветы/i,
    /добавь.*деревья/i,
    /добавь.*облака/i,
    /добавь.*звезды/i,
    // Команды удаления - НОВЫЕ ПАТТЕРНЫ
    /убери/i,
    /удали/i,
    /скрой/i,
    /убрать/i,
    /удалить/i,
    /без/i,
    /убери.*сапоги/i,
    /убери.*шляпу/i,
    /убери.*очки/i,
    /убери.*фон/i,
    /убери.*предмет/i,
    /убери.*объект/i,
    /удали.*сапоги/i,
    /удали.*шляпу/i,
    /удали.*очки/i,
    /без.*сапог/i,
    /без.*шляпы/i,
    /без.*очков/i
  ];
  
  let isImageEdit = false;
  for (const pattern of imageEditPatterns) {
    if (pattern.test(message)) {
      isImageEdit = true;
      break;
    }
  }
  
  if (isImageEdit) {
    detectedCategories.push({
      category: 'image_edit',
      matchCount: 10, // Высокий приоритет
      providers: PROVIDER_SPECIALTIES.image_generation.providers
    });
  }
  
  // Проверяем каждую категорию на наличие ключевых слов
  for (const [category, details] of Object.entries(PROVIDER_SPECIALTIES)) {
    if (category === 'image_generation' && isImageGeneration) {
      continue; // Уже обработали выше
    }
    
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
  const startTime = Date.now();
  SmartLogger.route(`Начинаем маршрутизацию сообщения`, { 
    messageLength: message.length, 
    hasImage: !!options.imageUrl,
    options: Object.keys(options)
  });

  // Проверяем, нужен ли веб-поиск для актуальной информации
  SmartLogger.route(`=== ДЕТАЛЬНАЯ ПРОВЕРКА ВЕБ-ПОИСКА ===`);
  SmartLogger.route(`Исходное сообщение: "${message}"`);
  SmartLogger.route(`Сообщение в нижнем регистре: "${message.toLowerCase()}"`);
  
  const needsSearch = webSearchProvider.needsWebSearch(message);
  SmartLogger.route(`Результат needsWebSearch: ${needsSearch}`);
  
  // Сначала пробуем упрощенную интеграцию поиска + AI
  if (needsSearch) {
    const smartResult = await getSmartResponse(message);
    if (smartResult.success) {
      SmartLogger.success(`Получен ответ через упрощенную интеграцию`);
      return smartResult;
    }
    SmartLogger.route(`Упрощенная интеграция не сработала, переходим к стандартному поиску`);
  }
  
  if (needsSearch) {
    SmartLogger.route(`Обнаружен запрос, требующий веб-поиска`);
    
    try {
      const searchResults = await webSearchProvider.performWebSearch(message);
      
      if (searchResults.success && searchResults.results.length > 0) {
        // Формируем контекст для AI с результатами поиска
        const searchContext = webSearchProvider.formatSearchResultsForAI(searchResults);
        const enhancedMessage = `ВАЖНО: Ты ДОЛЖЕН использовать информацию из интернета ниже для ответа пользователю!

Пользователь спрашивает: ${message}

${searchContext}

ОБЯЗАТЕЛЬНО используй эту актуальную информацию в своём ответе. НЕ говори, что не можешь предоставить данные в реальном времени - у тебя есть свежая информация выше!`;
        
        // Продолжаем обработку с обогащенным сообщением
        SmartLogger.route(`Веб-поиск успешен, найдено результатов: ${searchResults.results.length}`);
        SmartLogger.route(`Отправляем AI обогащенное сообщение: "${enhancedMessage.substring(0, 200)}..."`);
        
        // Используем специализированные провайдеры для ответа с актуальной информацией
        const searchProviders = ["Qwen_Qwen_2_72B", "You", "PerplexityApi", "Qwen_Qwen_2_5_Max"];
        
        for (const provider of searchProviders) {
          try {
            const pythonProvider = require('./python_provider_routes');
            const result = await pythonProvider.callPythonAI(enhancedMessage, provider);
            
            // Проверяем, что ответ содержит реальную информацию, а не отказ
            const hasRealData = result.response && (
              result.response.includes('°C') ||
              result.response.includes('градус') ||
              result.response.includes('температура') ||
              result.response.includes('влажность') ||
              result.response.includes('ветер') ||
              result.response.includes('дождь') ||
              result.response.includes('снег') ||
              result.response.includes('новости') ||
              result.response.includes('событи')
            );
            
            const isRefusal = result.response && (
              result.response.toLowerCase().includes('не могу предоставить') &&
              !hasRealData
            );
            
            if (result.success && result.response && !isRefusal) {
              SmartLogger.success(`Веб-поиск + AI ответ готов от провайдера: ${provider}`);
              
              return {
                success: true,
                response: result.response,
                provider: `WebSearch+${provider}`,
                model: result.model || provider,
                category: 'web_search',
                searchResults: searchResults.results,
                processingTime: Date.now() - startTime
              };
            } else {
              SmartLogger.route(`Провайдер ${provider} дал стандартный отказ, пробуем следующий`);
            }
          } catch (providerError) {
            SmartLogger.error(`Ошибка провайдера ${provider} с веб-поиском:`, providerError);
            continue;
          }
        }
        
        SmartLogger.error(`Не удалось получить ответ от AI провайдеров с веб-поиском`);
      } else {
        SmartLogger.route(`Веб-поиск не дал результатов, продолжаем обычную обработку`);
      }
    } catch (searchError) {
      SmartLogger.error(`Ошибка веб-поиска:`, searchError);
      // Продолжаем обычную обработку при ошибке поиска
    }
  }

  // Проверяем запросы на генерацию изображений для вышивки
  if (aiEmbroideryPipeline.isEmbroideryGenerationRequest(message)) {
    SmartLogger.route(`Обнаружен запрос на создание дизайна для вышивки`);
    
    try {
      const result = await aiEmbroideryPipeline.generateAndConvertToEmbroidery(message, {
        sessionId: options.sessionId,
        userId: options.userId,
        conversionOptions: {}
      });
      
      if (result.success) {
        // Формируем полный ответ с AI-анализом
        let fullResponse = result.message;
        
        // Добавляем информацию о файлах для скачивания
        if (result.files && result.files.length > 0) {
          fullResponse += '\n\n📁 **Файлы для скачивания:**\n';
          result.files.forEach(file => {
            const emoji = file.path.includes('.dst') ? '🧵' : 
                         file.path.includes('.png') ? '🖼️' : '🎨';
            const shortName = file.path.includes('.dst') ? 'DST файл' :
                             file.path.includes('.png') ? 'PNG превью' : 'JSON схема';
            fullResponse += `\n${emoji} [${shortName}](${file.path})`;
          });
        }
        
        // Добавляем детали
        if (result.details) {
          fullResponse += '\n\n📋 **Детали:**\n';
          fullResponse += `\n• Цветов: ${result.details.colors}`;
          fullResponse += `\n• Размер: ${result.details.size}`;
          fullResponse += `\n• Формат: ${result.details.machineFormat}`;
        }
        
        // Добавляем изображение
        if (result.generatedImage) {
          fullResponse += `\n\n![Сгенерированное изображение](${result.generatedImage})`;
        }
        
        // Добавляем AI-отчет об оптимизации, если он есть
        if (result.aiOptimizationReport) {
          fullResponse += '\n\n' + result.aiOptimizationReport;
        }
        
        return {
          success: true,
          response: fullResponse,
          provider: 'AI-EmbroideryPipeline',
          model: 'ai-embroidery-generator',
          type: 'embroidery_generation',
          details: result.details,
          files: result.files,
          instructions: result.instructions,
          generatedImage: result.generatedImage,
          embroideryFormat: result.embroideryFormat
        };
      } else {
        return {
          success: false,
          response: `Ошибка создания дизайна: ${result.error}`,
          provider: 'AI-EmbroideryPipeline',
          error: result.error,
          step: result.step
        };
      }
    } catch (error) {
      SmartLogger.error('Ошибка пайплайна создания дизайна для вышивки', error);
      return {
        success: false,
        response: 'Произошла ошибка при создании дизайна для вышивки',
        provider: 'AI-EmbroideryPipeline',
        error: error.message
      };
    }
  }

  // Проверяем запросы на конвертацию в форматы вышивки
  if (embroideryHandler.isEmbroideryRequest(message)) {
    SmartLogger.route(`Обнаружен запрос на конвертацию в формат вышивки`);
    
    try {
      let imageData = null;
      if (options.imageUrl) {
        // Подготавливаем данные изображения для обработки
        const fs = require('fs');
        const path = require('path');
        const imageBuffer = fs.readFileSync(options.imageUrl);
        imageData = {
          buffer: imageBuffer,
          filename: path.basename(options.imageUrl)
        };
      }
      
      const result = await embroideryHandler.handleEmbroideryRequest(message, imageData);
      
      if (result.success) {
        return {
          success: true,
          response: result.message,
          provider: 'EmbroideryConverter',
          model: 'embroidery-processor',
          type: result.type,
          details: result.details || {},
          files: result.files,
          instructions: result.instructions
        };
      } else {
        return {
          success: false,
          response: `Ошибка конвертации: ${result.error}`,
          provider: 'EmbroideryConverter',
          error: result.error
        };
      }
    } catch (error) {
      SmartLogger.error('Ошибка обработки запроса на вышивку', error);
      return {
        success: false,
        response: 'Произошла ошибка при обработке запроса на конвертацию в формат вышивки',
        provider: 'EmbroideryConverter',
        error: error.message
      };
    }
  }

  // Если изображение, используем наш собственный детектор объектов
  if (options.imageUrl) {
    SmartLogger.route(`Обнаружено изображение! Используем собственный детектор объектов`);
    
    try {
      const imageDetector = require('./image-object-detector');
      const result = await imageDetector.analyzeLocalImage(options.imageUrl, message);
      
      if (result.success) {
        // Сохраняем ответ в память разговора
        if (options.userId) {
          const conversationMemory = require('./conversation-memory');
          conversationMemory.addAiResponse(options.userId, result.response, result.provider, result.model);
        }
        
        return {
          success: true,
          response: result.response,
          provider: result.provider,
          model: result.model,
          category: "multimodal",
          bestProvider: "Advanced Object Detection"
        };
      } else {
        console.log('⚠️ Собственный детектор не сработал, пробуем внешние провайдеры...');
        // Если наш детектор не сработал, переходим к внешним провайдерам
        const analysis = { 
          category: "multimodal", 
          providers: PROVIDER_SPECIALTIES.multimodal.providers 
        };
        return await getResponseFromProviders(message, analysis, options);
      }
    } catch (error) {
      console.error(`❌ Ошибка собственного детектора: ${error.message}`);
      // В случае ошибки переходим к внешним провайдерам
      const analysis = { 
        category: "multimodal", 
        providers: PROVIDER_SPECIALTIES.multimodal.providers 
      };
      console.log(`Переходим к внешним мультимодальным провайдерам...`);
      return await getResponseFromProviders(message, analysis, options);
    }
  }

  // Если есть предпочтительный провайдер (продолжение разговора)
  if (options.preferredProvider) {
    SmartLogger.provider(`Продолжаем разговор с провайдером`, { 
      provider: options.preferredProvider,
      hasContext: !!options.context 
    });
    
    // Добавляем контекст к сообщению
    const messageWithContext = options.context ? options.context + message : message;
    
    try {
      const result = await trySpecificProvider(options.preferredProvider, messageWithContext, options);
      if (result && result.success) {
        // Сохраняем ответ в память разговора
        if (options.userId) {
          const conversationMemory = require('./conversation-memory');
          conversationMemory.addAiResponse(options.userId, result.response, result.provider, result.model);
        }
        return result;
      }
    } catch (error) {
      console.log(`⚠️ Предпочтительный провайдер ${options.preferredProvider} не ответил, выбираем нового...`);
    }
  }

  // Анализируем сообщение для выбора нового провайдера
  const analysis = analyzeMessage(message);
  console.log(`Категория сообщения: ${analysis.category} (совпадений: ${analysis.matchCount})`);
  console.log(`Рекомендуемые провайдеры: ${analysis.providers.join(', ')}`);
  
  // Специальная обработка для генерации изображений
  if (analysis.category === 'image_generation') {
    SmartLogger.route('🎨 Обнаружен запрос на генерацию изображения!');
    try {
      const imageGenerator = require('./ai-image-generator');
      
      // Извлекаем промпт для генерации из сообщения
      let prompt = message;
      
      // Определяем стиль для принтов футболок
      let style = 'realistic';
      if (message.toLowerCase().includes('футболка') || 
          message.toLowerCase().includes('принт') ||
          message.toLowerCase().includes('t-shirt') ||
          message.toLowerCase().includes('streetwear')) {
        style = 'artistic';
        prompt = `Дизайн принта для футболки: ${prompt}`;
      }
      
      const result = await imageGenerator.generateImage(prompt, style, null, options.sessionId, options.userId);
      
      if (result.success) {
        // Сохраняем ответ в память разговора
        if (options.userId) {
          const conversationMemory = require('./conversation-memory');
          const response = `🎨 Изображение создано! Вот ваш дизайн:\n![Сгенерированное изображение](${result.imageUrl})`;
          conversationMemory.addAiResponse(options.userId, response, 'AI_Image_Generator', 'DALL-E_Style');
        }
        
        return {
          success: true,
          response: `🎨 Изображение создано! Вот ваш дизайн:\n![Сгенерированное изображение](${result.imageUrl})`,
          provider: 'AI_Image_Generator',
          model: 'Multi_Provider_Generator',
          category: 'image_generation',
          imageUrl: result.imageUrl,
          bestProvider: 'Image Generator'
        };
      } else {
        SmartLogger.error('Ошибка генерации изображения:', result.error);
        return {
          success: false,
          response: `😔 Извините, не удалось создать изображение. Попробуйте переформулировать запрос или попросить текстовое описание дизайна.`,
          provider: 'AI_Image_Generator',
          error: result.error
        };
      }
    } catch (error) {
      SmartLogger.error('Критическая ошибка генератора изображений:', error);
      // Переключаемся на текстовое описание дизайна
      const analysis = { 
        category: "creative", 
        providers: PROVIDER_SPECIALTIES.creative.providers 
      };
      const fallbackMessage = `Создай детальное текстовое описание дизайна: ${message}`;
      return await getResponseFromProviders(fallbackMessage, analysis, options);
    }
  }
  
  // Добавляем контекст к сообщению, если есть
  const messageWithContext = options.context ? options.context + message : message;
  
  const result = await getResponseFromProviders(messageWithContext, analysis, options);
  
  // Сохраняем ответ в память разговора
  if (result && result.success && options.userId) {
    const conversationMemory = require('./conversation-memory');
    conversationMemory.addAiResponse(options.userId, result.response, result.provider || result.bestProvider, result.model);
  }
  
  return result;
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
  
  // Если все указанные провайдеры отказали, пробуем Qwen_Qwen_2_72B как самый надежный
  if (!providers.includes("Qwen_Qwen_2_72B")) {
    try {
      console.log(`Пробуем резервный провайдер Qwen_Qwen_2_72B...`);
      
      const pythonResponse = await pythonProviderRoutes.callPythonAI(
        message, 
        "Qwen_Qwen_2_72B", 
        systemPrompt
      );
      
      if (pythonResponse) {
        return {
          success: true,
          response: pythonResponse,
          provider: "Qwen_Qwen_2_72B (fallback)",
          category,
          bestProvider: "Qwen_Qwen_2_72B"
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
  const { message, imageUrl, userId = 'anonymous' } = req.body;
  
  if (!message && !imageUrl) {
    return res.status(400).json({
      success: false,
      error: 'Сообщение или изображение должны быть предоставлены'
    });
  }
  
  // Если есть только изображение без текста, используем стандартный запрос для анализа
  const messageText = message || 'Проанализируй это изображение';
  
  try {
    // Получаем контекст разговора
    const conversationMemory = require('./conversation-memory');
    const contextData = conversationMemory.getMessageContext(userId, messageText);
    
    console.log(`💭 Пользователь ${userId}: ${contextData.shouldContinueWithProvider ? 'продолжаем с ' + contextData.currentProvider : 'выбираем нового провайдера'}`);
    
    // Маршрутизируем сообщение к подходящему провайдеру с учетом контекста
    const result = await routeMessage(messageText, { 
      imageUrl, 
      userId,
      context: contextData.context,
      preferredProvider: contextData.shouldContinueWithProvider ? contextData.currentProvider : null
    });
    
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
module.exports.getChatResponse = routeMessage;
module.exports.analyzeMessage = analyzeMessage;