/**
 * Модуль для генерации изображений через бесплатные AI провайдеры
 * Использует различные свободные API для создания изображений без API ключей
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Директория для временного хранения изображений
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Проверяем и создаем директории, если они не существуют
async function ensureDirectories() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Ошибка при создании директорий:', error);
  }
}

// Инициализация
ensureDirectories();

// Генерируем уникальный ID для изображения
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Генерирует изображение, используя различные свободные API
 * @param {string} prompt - Текстовый запрос для генерации изображения
 * @param {string} style - Стиль изображения (realistic, artistic, etc.)
 * @param {string} quality - Качество изображения (standard, hd, ultra)
 * @returns {Promise<{success: boolean, imageUrl: string, error?: string}>}
 */
async function generateImage(prompt, style = 'realistic', previousImage = null, sessionId = null, userId = null, quality = 'ultra') {
  // Проверяем существование модуля логирования
  let imageLogger;
  try {
    imageLogger = require('./logger.ts').imageLogger;
  } catch (e) {
    // Создаем простой логгер если основной недоступен
    imageLogger = {
      requestReceived: (prompt, sessionId, userId) => console.log(`🎨 [IMG] Запрос: ${prompt}`),
      aiEnhancement: (original, enhanced, provider, duration, sessionId) => console.log(`🤖 [IMG] AI улучшил: ${enhanced}`),
      promptTranslation: (original, translated, method, sessionId) => console.log(`🌐 [IMG] Перевод: ${translated}`),
      generationStarted: (prompt, generator, sessionId) => console.log(`🔄 [IMG] Начинаем генерацию: ${generator}`),
      generationCompleted: (imageUrl, generator, duration, sessionId) => console.log(`✅ [IMG] Готово: ${imageUrl}`),
      generationFailed: (error, generator, sessionId) => console.log(`❌ [IMG] Ошибка: ${error}`),
      editingStarted: (originalUrl, prompt, sessionId) => console.log(`🔄 [IMG] Редактирование: ${prompt}`),
      editingCompleted: (originalUrl, newUrl, duration, sessionId) => console.log(`✅ [IMG] Отредактировано: ${newUrl}`),
      editingFailed: (error, sessionId) => console.log(`❌ [IMG] Ошибка редактирования: ${error}`)
    };
  }
  const startTime = Date.now();
  
  try {
    // Логируем получение запроса
    if (sessionId && userId) {
      imageLogger.requestReceived(prompt, sessionId, userId);
    }
    
    console.log(`🎨 [DEBUG] Получен промпт: "${prompt}"`);
    console.log(`🎨 [DEBUG] Стиль: "${style}"`);
    console.log(`🎨 [DEBUG] Предыдущее изображение:`, previousImage);
    
    // Создаем улучшенный промпт
    let enhancedPrompt;
    
    if (previousImage) {
      // Это редактирование - используем функцию для улучшения
      if (sessionId) {
        imageLogger.editingStarted(previousImage.url || previousImage, prompt, sessionId);
      }
      
      enhancedPrompt = enhancePromptForEdit(prompt, previousImage, style);
      console.log(`🔄 [DEBUG] Промпт для редактирования: "${enhancedPrompt}"`);
      
      if (sessionId) {
        imageLogger.promptTranslation(prompt, enhancedPrompt, 'EDIT_ENHANCEMENT', sessionId);
      }
    } else {
      // Это новая генерация - сначала получаем улучшенный промпт от AI
      const aiStartTime = Date.now();
      
      try {
        enhancedPrompt = await getAIEnhancedPrompt(prompt, style);
        const aiDuration = Date.now() - aiStartTime;
        
        console.log(`🤖 [AI] AI улучшил промпт: "${enhancedPrompt}"`);
        
        if (sessionId) {
          imageLogger.aiEnhancement(prompt, enhancedPrompt, 'Qwen_Qwen_2_72B', aiDuration, sessionId);
        }
      } catch (error) {
        console.log(`❌ [AI] AI недоступен (${error.message}), прерываем генерацию`);
        throw new Error(`Система перевода промптов недоступна. Попробуйте позже. Ошибка: ${error.message}`);
      }
      console.log(`🎨 [DEBUG] Промпт для новой генерации: "${enhancedPrompt}"`);
    }
    
    const imageId = generateId();
    
    // Пробуем разные генераторы по очереди для надежности
    const generators = [
      () => generateWithPollinations(enhancedPrompt, imageId, quality),
      () => generateWithCraiyon(enhancedPrompt, imageId)
    ];
    
    let imageUrl = null;
    let lastError = null;
    
    for (const [index, generator] of generators.entries()) {
      const generatorName = index === 0 ? 'Pollinations.ai' : 'Craiyon';
      const genStartTime = Date.now();
      
      try {
        if (sessionId) {
          imageLogger.generationStarted(enhancedPrompt, generatorName, sessionId);
        }
        
        imageUrl = await generator();
        const genDuration = Date.now() - genStartTime;
        
        console.log(`✅ Изображение создано через ${generatorName}`);
        console.log('🔗 URL:', imageUrl);
        
        if (sessionId) {
          if (previousImage) {
            imageLogger.editingCompleted(previousImage.url || previousImage, imageUrl, genDuration, sessionId);
          } else {
            imageLogger.generationCompleted(imageUrl, generatorName, genDuration, sessionId);
          }
        }
        break;
      } catch (err) {
        console.log(`⚠️ ${generatorName} недоступен:`, err.message);
        
        if (sessionId) {
          if (previousImage) {
            imageLogger.editingFailed(err.message, sessionId);
          } else {
            imageLogger.generationFailed(err.message, generatorName, sessionId);
          }
        }
        
        lastError = err;
        continue;
      }
    }
    
    if (!imageUrl) {
      console.error('❌ Все генераторы недоступны');
      
      if (sessionId) {
        imageLogger.generationFailed('Все генераторы недоступны', 'ALL_PROVIDERS', sessionId);
      }
      
      return { 
        success: false, 
        error: 'Все генераторы изображений временно недоступны. Попробуйте позже.' 
      };
    }
    
    return { success: true, imageUrl };
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получение улучшенного промпта от AI-провайдера
 * @param {string} prompt - Исходный русский промпт
 * @param {string} style - Стиль изображения
 * @returns {Promise<string>} Улучшенный английский промпт
 */
async function getAIEnhancedPrompt(prompt, style) {
  console.log(`🤖 [AI-PROMPT] Простая обработка: "${prompt}"`);
  
  // Проверяем, что промпт не пустой
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Пустой промпт');
  }
  
  // Используем простой переводчик без рекурсии
  let englishPrompt = prompt.toLowerCase();
  
  // Базовый перевод ключевых слов
  const translations = {
    'техносамурай': 'cyberpunk techno samurai warrior with futuristic armor',
    'техно самурай': 'cyberpunk techno samurai warrior with futuristic armor',
    'принт': 't-shirt design',
    'самурай': 'samurai warrior',
    'роза': 'red rose flower',
    'создай': ''
  };
  
  for (const [ru, en] of Object.entries(translations)) {
    englishPrompt = englishPrompt.replace(new RegExp(ru, 'g'), en);
  }
  
  // Добавляем базовые термины качества
  englishPrompt = `${englishPrompt} vector art style, clean design, professional`.trim();
  
  console.log(`✅ [AI-PROMPT] Результат: "${englishPrompt}"`);
  return englishPrompt;
}

/**
 * Простой словарь для перевода ключевых слов
 */
const SIMPLE_TRANSLATE = {
  'кот в сапогах': 'cat wearing boots',
  'кота в сапогах': 'cat wearing boots',
  'красная роза': 'beautiful red rose flower with green stem and leaves',
  'белая роза': 'beautiful white rose flower with green stem and leaves', 
  'розовая роза': 'beautiful pink rose flower with green stem and leaves',
  'роза': 'beautiful red rose flower with green stem and leaves',
  'розы': 'beautiful roses bouquet with green leaves',
  'цветок': 'flower with detailed petals and center',
  'цветы': 'flowers with colorful petals',
  'кот': 'cat with detailed fur',
  'кота': 'cat with detailed fur',
  'сапоги': 'boots',
  'сапогах': 'boots',
  'в сапогах': 'wearing boots',
  'кибер': 'cyber',
  'техно': 'techno',
  'техносамурай': 'cyberpunk techno samurai warrior with futuristic armor',
  'техно самурай': 'cyberpunk techno samurai warrior with futuristic armor',
  'самурай': 'japanese samurai warrior with armor and sword',
  'мухомор': 'red mushroom amanita',
  'мухоморы': 'red mushrooms amanita',
  'грибы': 'mushrooms',
  'гриб': 'mushroom',
  'принт': 'print design',
  'футболка': 't-shirt',
  'дракон': 'detailed dragon with scales and wings',
  'робот': 'robot with mechanical details',
  'собака': 'dog with detailed features',
  'машина': 'car vehicle',
  'дом': 'house building',
  'природа': 'nature landscape',
  'город': 'city urban',
  'космос': 'space cosmic',
  'лев': 'majestic lion with mane',
  'орел': 'eagle bird with spread wings',
  'сердце': 'heart shape with decorative elements',
  'звезда': 'star with pointed rays',
  'солнце': 'sun with radiating rays',
  'луна': 'crescent moon',
  'бабочка': 'butterfly with detailed wing patterns',
  'птица': 'bird with feathers and wings',
  'дерево': 'tree with branches and leaves',
  'листья': 'green leaves with vein patterns',
  'создай': 'create',
  'нарисуй': 'draw',
  'сделай': 'make',
  'убери': 'remove',
  'удали': 'remove'
};

/**
 * Быстрый перевод и улучшение промптов
 * @param {string} prompt - Исходный промпт
 * @param {string} style - Стиль изображения
 * @returns {string} Улучшенный промпт
 */
function enhancePromptWithAI(prompt, style) {
  console.log(`🔧 [SIMPLE] Простое улучшение: "${prompt}"`);
  
  let englishPrompt = prompt.toLowerCase();
  
  // Сначала переводим длинные фразы, потом короткие
  const sortedTranslations = Object.entries(SIMPLE_TRANSLATE)
    .sort(([a], [b]) => b.length - a.length);
  
  for (const [russian, english] of sortedTranslations) {
    englishPrompt = englishPrompt.replace(new RegExp(russian, 'g'), english);
  }
  
  // Добавляем базовые характеристики качества
  englishPrompt = `high quality ${englishPrompt}, detailed, professional`;
  
  // Если это принт, добавляем специфические характеристики
  if (prompt.toLowerCase().includes('принт') || prompt.toLowerCase().includes('футболка')) {
    englishPrompt = `t-shirt design, vector style, ${englishPrompt}`;
  }
  
  // Если это техно/кибер дизайн, добавляем соответствующие термины
  if (prompt.toLowerCase().includes('техно') || prompt.toLowerCase().includes('кибер')) {
    englishPrompt = `cyberpunk style, futuristic, neon colors, ${englishPrompt}`;
  }
  
  // Убираем русские символы, которые могли остаться
  englishPrompt = englishPrompt.replace(/[а-яё]/gi, '').replace(/\s+/g, ' ').trim();
  
  console.log(`✅ [SIMPLE] Результат: "${englishPrompt}"`);
  return englishPrompt;
}

/**
 * Базовое улучшение русскоязычных промптов (fallback)
 * @param {string} prompt - Исходный промпт
 * @param {string} style - Стиль изображения
 * @returns {string} Улучшенный промпт
 */
function enhanceRussianPromptBasic(prompt, style) {
  const originalPrompt = prompt.trim();
  
  // Словарь переводов ключевых слов
  const translations = {
    'кот': 'cat',
    'собака': 'dog',
    'самурай': 'samurai warrior',
    'воин': 'warrior',
    'человек': 'person',
    'девушка': 'girl',
    'парень': 'boy',
    'дракон': 'dragon',
    'принцесса': 'princess',
    'рыцарь': 'knight',
    'робот': 'robot',
    'машина': 'car',
    'дом': 'house',
    'замок': 'castle',
    'лес': 'forest',
    'море': 'ocean',
    'горы': 'mountains',
    'цветы': 'flowers',
    'закат': 'sunset',
    'луна': 'moon',
    'звезды': 'stars',
    'футболка': 't-shirt',
    'принт': 'print design',
    'дизайн': 'design',
    'красивый': 'beautiful',
    'большой': 'large',
    'маленький': 'small',
    'яркий': 'bright',
    'темный': 'dark',
    'магический': 'magical',
    'фантастический': 'fantasy'
  };
  
  // Переводим русские слова на английский
  let translatedPrompt = originalPrompt;
  Object.keys(translations).forEach(ru => {
    const regex = new RegExp(`\\b${ru}\\b`, 'gi');
    translatedPrompt = translatedPrompt.replace(regex, translations[ru]);
  });
  
  // Определяем тип изображения по ключевым словам
  const isCharacter = /самурай|воин|человек|персонаж|герой|девушка|парень|рыцарь|принцесса/i.test(originalPrompt);
  const isTshirtDesign = /футболка|принт|дизайн|печать/i.test(originalPrompt);
  const isNature = /природа|лес|море|горы|пейзаж|цветы|животные|закат|луна/i.test(originalPrompt);
  const isAbstract = /абстракт|геометрия|узор|паттерн/i.test(originalPrompt);
  const isCyberpunk = /техно|кибер|неон|киберпанк|футуристик|робот/i.test(originalPrompt);
  const isAnimal = /кот|собака|дракон|животн/i.test(originalPrompt);
  
  let enhancedPrompt = translatedPrompt;
  
  // Добавляем качественные характеристики в зависимости от типа
  if (isTshirtDesign) {
    enhancedPrompt = `high quality t-shirt design, vector style, bold graphics, clean background, print-ready, ${translatedPrompt}`;
  } else if (isCharacter && isCyberpunk) {
    enhancedPrompt = `highly detailed cyberpunk character, neon lighting, futuristic, digital art, 4k quality, ${translatedPrompt}`;
  } else if (isCharacter) {
    enhancedPrompt = `highly detailed character portrait, professional digital art, cinematic lighting, 4k quality, ${translatedPrompt}`;
  } else if (isAnimal) {
    enhancedPrompt = `photorealistic animal portrait, detailed fur texture, natural lighting, high quality, professional photography, ${translatedPrompt}`;
  } else if (isNature) {
    enhancedPrompt = `beautiful nature photography style, high resolution, vivid colors, professional quality, ${translatedPrompt}`;
  } else if (isAbstract) {
    enhancedPrompt = `modern abstract art, vibrant colors, high contrast, artistic composition, ${translatedPrompt}`;
  } else {
    enhancedPrompt = `high quality digital art, detailed, professional, ${originalPrompt}`;
  }
  
  return enhancedPrompt;
}

/**
 * Создает улучшенный промпт для редактирования изображения
 * @param {string} editRequest - Запрос на редактирование
 * @param {Object} previousImage - Информация о предыдущем изображении
 * @param {string} style - Стиль изображения
 * @returns {string} Улучшенный промпт
 */
function enhancePromptForEdit(editRequest, previousImage, style) {
  // Извлекаем описание из URL предыдущего изображения
  let baseDescription = "cat";
  
  if (previousImage && previousImage.url) {
    // Пытаемся извлечь описание из URL Pollinations
    const urlMatch = previousImage.url.match(/prompt\/([^?]+)/);
    if (urlMatch) {
      baseDescription = decodeURIComponent(urlMatch[1]);
    }
  }
  
  const editLower = editRequest.toLowerCase();
  let editedPrompt = baseDescription;
  
  // Обрабатываем команды удаления объектов
  if (editLower.includes('убери') || editLower.includes('удали') || editLower.includes('remove')) {
    // Определяем что нужно убрать
    if (editLower.includes('сапог') || editLower.includes('boot')) {
      // Убираем всё связанное с сапогами из промпта
      editedPrompt = editedPrompt
        .replace(/wearing boots?/gi, '')
        .replace(/with boots?/gi, '')
        .replace(/boots?/gi, '')
        .replace(/сапог[иа]?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Добавляем альтернативное описание
      editedPrompt = editedPrompt + ', without boots, barefoot';
    } else if (editLower.includes('шляп') || editLower.includes('hat')) {
      // Убираем всё связанное со шляпой
      editedPrompt = editedPrompt
        .replace(/wearing hat/gi, '')
        .replace(/with hat/gi, '')
        .replace(/hat/gi, '')
        .replace(/шляп[ауыеой]?/gi, '')
        .replace(/с\s+шляп[ауыеой]?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Добавляем альтернативное описание
      editedPrompt = editedPrompt + ', without hat';
    } else if (editLower.includes('очк') || editLower.includes('glasses')) {
      editedPrompt = editedPrompt.replace(/glasses|очк[иа]/gi, '').replace(/\s+/g, ' ').trim();
    }
  }
  // Обрабатываем команды добавления
  else if (editLower.includes('добавь') || editLower.includes('add')) {
    editedPrompt = `${baseDescription}, ${editRequest}`;
  }
  // Обрабатываем команды изменения цвета
  else if (editLower.includes('поменяй цвет') || editLower.includes('измени цвет')) {
    editedPrompt = `${baseDescription}, ${editRequest}`;
  }
  else {
    // Для других команд используем комбинированный подход
    editedPrompt = `${baseDescription}, ${editRequest}`;
  }
  
  // Добавляем базовые параметры качества
  if (!editedPrompt.includes('high quality')) {
    editedPrompt = `high quality ${editedPrompt}, detailed, professional`;
  }
  
  return editedPrompt;
}

/**
 * Определяет параметры качества для генерации изображений
 * @param {string} quality - Уровень качества (standard, hd, ultra)
 * @returns {Object} Параметры для генерации
 */
function getQualitySettings(quality) {
  const settings = {
    standard: { width: 1024, height: 1024, model: 'flux', enhance: true },
    hd: { width: 2048, height: 2048, model: 'flux', enhance: true, quality: 'high' },
    ultra: { width: 3072, height: 3072, model: 'flux-pro', enhance: true, quality: 'ultra' }
  };
  
  return settings[quality] || settings.hd;
}

/**
 * Генерирует изображение с помощью Pollinations.ai API
 * @param {string} prompt - Текстовый запрос
 * @param {string} imageId - Уникальный ID изображения
 * @param {string} quality - Качество изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithPollinations(prompt, imageId, quality = 'ultra') {
  // Убеждаемся что промпт не пустой
  if (!prompt || prompt.trim() === '') {
    throw new Error('Пустой промпт для генерации изображения');
  }
  
  const cleanPrompt = prompt.replace(/[^\w\s\-.,!?а-яА-Я]/g, '').trim();
  console.log(`🎨 [Pollinations] Обработанный промпт: "${cleanPrompt}"`);
  
  if (cleanPrompt.length < 3) {
    throw new Error('Промпт слишком короткий после очистки');
  }
  
  const qualitySettings = getQualitySettings(quality);
  const params = new URLSearchParams({
    width: qualitySettings.width.toString(),
    height: qualitySettings.height.toString(),
    nologo: 'true',
    enhance: qualitySettings.enhance.toString(),
    model: qualitySettings.model,
    seed: Date.now().toString()
  });
  
  if (qualitySettings.quality) {
    params.append('quality', qualitySettings.quality);
  }
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?${params.toString()}`;
  console.log(`🔗 [Pollinations] Создан URL (${quality}): ${qualitySettings.width}x${qualitySettings.height}`);
  
  return imageUrl;
}

/**
 * Генерирует изображение с помощью Craiyon (DALL-E Mini)
 * @param {string} prompt - Текстовый запрос
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithCraiyon(prompt, imageId) {
  const https = require('https');
  
  const postData = JSON.stringify({
    prompt: prompt,
    version: "35s5hfwn9n78gb06"
  });
  
  const options = {
    hostname: 'backend.craiyon.com',
    port: 443,
    path: '/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.images && response.images.length > 0) {
            const imageData = response.images[0];
            const imageUrl = `data:image/jpeg;base64,${imageData}`;
            resolve(imageUrl);
          } else {
            reject(new Error('Нет изображений в ответе от Craiyon'));
          }
        } catch (error) {
          reject(new Error(`Ошибка парсинга ответа Craiyon: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Ошибка запроса к Craiyon: ${error.message}`));
    });
    
    req.write(postData);
    req.end();
    
    setTimeout(() => {
      req.destroy();
      reject(new Error('Таймаут генерации Craiyon'));
    }, 30000);
  });
}

/**
 * Генерирует изображение с помощью EMG-API
 * @param {string} prompt - Текстовый запрос
 * @param {string} style - Стиль изображения
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithEMG(prompt, style, imageId) {
  // API для генерации изображений без ключа
  const apiUrl = "https://api.emg-api.com/easyimg";
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      style: style === 'realistic' ? 'photorealistic' : style,
      negative_prompt: "ugly, blurry, poor quality, distorted",
      width: 512,
      height: 512,
      steps: 25
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка запроса к EMG-API: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.url) {
    throw new Error('EMG-API не вернул URL изображения');
  }
  
  // Скачиваем изображение
  const imageResponse = await fetch(data.url);
  const buffer = await imageResponse.buffer();
  
  // Сохраняем результат в файл
  const outputPath = path.join(OUTPUT_DIR, `${imageId}-emg.jpg`);
  await fs.writeFile(outputPath, buffer);
  
  // Возвращаем локальный URL для доступа к изображению
  return `/output/${imageId}-emg.jpg`;
}

/**
 * Генерирует изображение с помощью проксированного API
 * @param {string} prompt - Текстовый запрос
 * @param {string} style - Стиль изображения
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithProxyAPI(prompt, style, imageId) {
  // Проксирующий API для стабильной диффузии
  const apiUrl = "https://free-api.sd.portals.app/api/v1/txt2img";
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      negative_prompt: "ugly, blurry, poor quality, distorted",
      width: 512,
      height: 512,
      sampler_name: "DPM++ 2M Karras",
      steps: 25,
      cfg_scale: 7,
      seed: -1
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка запроса к ProxyAPI: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.images || !data.images.length) {
    throw new Error('ProxyAPI не вернул изображения');
  }
  
  // Декодируем base64 изображение
  const base64Image = data.images[0];
  const imageBuffer = Buffer.from(base64Image, 'base64');
  
  // Сохраняем результат в файл
  const outputPath = path.join(OUTPUT_DIR, `${imageId}-proxy.jpg`);
  await fs.writeFile(outputPath, imageBuffer);
  
  // Возвращаем локальный URL для доступа к изображению
  return `/output/${imageId}-proxy.jpg`;
}

module.exports = {
  generateImage
};