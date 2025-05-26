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
    // Улучшаем промпт для принтов футболок
    let enhancedPrompt = prompt;
    
    if (style === 'artistic' || prompt.toLowerCase().includes('футболка') || prompt.toLowerCase().includes('принт')) {
      enhancedPrompt = `High quality t-shirt design, vector style, bold graphics, streetwear aesthetic, clean background, print-ready: ${prompt}`;
    }
    
    console.log(`🎨 Генерация изображения для принта: "${enhancedPrompt}" в стиле ${style}`);
    const imageId = generateId();
    
    // Пробуем разные провайдеры, начиная с самых стабильных
    let imageUrl = null;
    let error = null;
    
    // Используем прямой URL генератор - простое и надежное решение
    try {
      // Очищаем промпт для URL
      const cleanPrompt = enhancedPrompt.replace(/[^\w\s\-.,!?]/g, '').trim();
      
      // Создаем URL для генерации изображения
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;
      
      console.log('✅ Изображение создано через Pollinations.ai');
      console.log('🔗 URL:', imageUrl);
      
    } catch (err) {
      console.error('❌ Ошибка создания изображения:', err.message);
      return { 
        success: false, 
        error: 'Не удалось создать изображение. Попробуйте другой запрос.' 
      };
    }
    
    return { success: true, imageUrl };
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Генерирует изображение с помощью Pollinations.ai API
 * @param {string} prompt - Текстовый запрос
 * @param {string} style - Стиль изображения
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL сгенерированного изображения
 */
async function generateWithPollinations(prompt, style, imageId) {
  // Создаем URL для генерации изображения
  // Pollinations.ai использует параметры в URL для генерации изображений
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
  
  // Сохраняем результат в файл
  const outputPath = path.join(OUTPUT_DIR, `${imageId}-pollinations.jpg`);
  const response = await fetch(pollinationsUrl);
  
  if (!response.ok) {
    throw new Error(`Ошибка запроса к Pollinations.ai: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  await fs.writeFile(outputPath, buffer);
  
  // Возвращаем локальный URL для доступа к изображению
  return `/output/${imageId}-pollinations.jpg`;
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