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
async function generateImage(prompt, style = 'realistic') {
  try {
    console.log(`🎨 [DEBUG] Получен промпт: "${prompt}"`);
    console.log(`🎨 [DEBUG] Стиль: "${style}"`);
    
    // Улучшаем промпт для принтов футболок
    let enhancedPrompt = prompt;
    
    if (style === 'artistic' || prompt.toLowerCase().includes('футболка') || prompt.toLowerCase().includes('принт')) {
      enhancedPrompt = `High quality t-shirt design, vector style, bold graphics, streetwear aesthetic, clean background, print-ready: ${prompt}`;
    }
    
    console.log(`🎨 [DEBUG] Улучшенный промпт: "${enhancedPrompt}"`);
    const imageId = generateId();
    
    // Пробуем разные генераторы по очереди для надежности
    const generators = [
      () => generateWithPollinations(enhancedPrompt, imageId),
      () => generateWithCraiyon(enhancedPrompt, imageId)
    ];
    
    let imageUrl = null;
    let lastError = null;
    
    for (const [index, generator] of generators.entries()) {
      try {
        imageUrl = await generator();
        const generatorName = index === 0 ? 'Pollinations.ai' : 'Craiyon (DALL-E Mini)';
        console.log(`✅ Изображение создано через ${generatorName}`);
        console.log('🔗 URL:', imageUrl);
        break;
      } catch (err) {
        const generatorName = index === 0 ? 'Pollinations.ai' : 'Craiyon';
        console.log(`⚠️ ${generatorName} недоступен:`, err.message);
        lastError = err;
        continue;
      }
    }
    
    if (!imageUrl) {
      console.error('❌ Все генераторы недоступны');
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