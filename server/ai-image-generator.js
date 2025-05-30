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
 * @returns {Promise<{success: boolean, imageUrl: string, error?: string}>}
 */
async function generateImage(prompt, style = 'realistic', previousImage = null, sessionId = null, userId = null) {
  const { imageLogger } = require('./logger.js');
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
        console.log(`⚠️ [AI] AI недоступен, используем простое улучшение`);
        enhancedPrompt = enhancePromptWithAI(prompt, style);
        
        if (sessionId) {
          imageLogger.promptTranslation(prompt, enhancedPrompt, 'SIMPLE_TRANSLATION', sessionId);
        }
      }
      console.log(`🎨 [DEBUG] Промпт для новой генерации: "${enhancedPrompt}"`);
    }
    
    const imageId = generateId();
    
    // Пробуем разные генераторы по очереди для надежности
    const generators = [
      () => generateWithPollinations(enhancedPrompt, imageId),
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
  const smartRouter = require('./smart-router.js');
  
  const systemPrompt = `Ты эксперт по созданию промптов для генерации изображений. 
Переведи русский запрос на английский и улучши его для качественной генерации изображения.

Правила:
1. Переводи точно, сохраняя смысл
2. Добавляй технические детали для качества: "high quality", "detailed", "professional"
3. Указывай стиль: ${style}
4. Для персонажей добавляй детали внешности
5. Отвечай ТОЛЬКО улучшенным английским промптом, без пояснений

Пример:
Вход: "кот в сапогах"
Выход: "high quality detailed cat wearing boots, professional photography, realistic style"`;

  try {
    const response = await smartRouter.getSmartResponse(
      `${systemPrompt}\n\nЗапрос: "${prompt}"`,
      { 
        systemPrompt,
        preferredProvider: 'Qwen_Qwen_2_72B',
        maxLength: 200
      }
    );
    
    if (response && response.response) {
      // Извлекаем только текст промпта, убираем лишнее
      let enhancedPrompt = response.response.trim();
      
      // Убираем возможные префиксы ответа
      enhancedPrompt = enhancedPrompt.replace(/^(Выход:|Output:|Result:)/i, '').trim();
      enhancedPrompt = enhancedPrompt.replace(/^["']|["']$/g, ''); // убираем кавычки
      
      return enhancedPrompt;
    }
    
    throw new Error('AI не вернул ответ');
    
  } catch (error) {
    console.log(`⚠️ Ошибка AI улучшения: ${error.message}`);
    throw error;
  }
}

/**
 * Простой словарь для перевода ключевых слов
 */
const SIMPLE_TRANSLATE = {
  'кот в сапогах': 'cat wearing boots',
  'кота в сапогах': 'cat wearing boots',
  'кот': 'cat',
  'кота': 'cat',
  'сапоги': 'boots',
  'сапогах': 'boots',
  'в сапогах': 'wearing boots',
  'кибер': 'cyber',
  'техно': 'techno',
  'самурай': 'samurai',
  'принт': 'print design',
  'футболка': 't-shirt',
  'дракон': 'dragon',
  'робот': 'robot',
  'собака': 'dog',
  'машина': 'car',
  'дом': 'house',
  'природа': 'nature',
  'город': 'city',
  'космос': 'space',
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
  let baseDescription = "previous image";
  
  if (previousImage && previousImage.url) {
    // Пытаемся извлечь описание из URL Pollinations
    const urlMatch = previousImage.url.match(/prompt\/([^?]+)/);
    if (urlMatch) {
      baseDescription = decodeURIComponent(urlMatch[1]);
    }
  }
  
  // Создаем новый промпт, объединяя базовое описание с новыми требованиями
  const combinedPrompt = `${baseDescription}, ${editRequest}`;
  
  // Применяем улучшения для принтов
  if (style === 'artistic' || combinedPrompt.toLowerCase().includes('футболка') || combinedPrompt.toLowerCase().includes('принт')) {
    return `High quality t-shirt design, vector style, bold graphics, streetwear aesthetic, clean background, print-ready: ${combinedPrompt}`;
  }
  
  return combinedPrompt;
}

/**
 * Генерирует изображение с помощью Pollinations.ai API
 * @param {string} prompt - Текстовый запрос
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithPollinations(prompt, imageId) {
  // Убеждаемся что промпт не пустой
  if (!prompt || prompt.trim() === '') {
    throw new Error('Пустой промпт для генерации изображения');
  }
  
  const cleanPrompt = prompt.replace(/[^\w\s\-.,!?а-яА-Я]/g, '').trim();
  console.log(`🎨 [Pollinations] Обработанный промпт: "${cleanPrompt}"`);
  
  if (cleanPrompt.length < 3) {
    throw new Error('Промпт слишком короткий после очистки');
  }
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;
  console.log(`🔗 [Pollinations] Создан URL: ${imageUrl}`);
  
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