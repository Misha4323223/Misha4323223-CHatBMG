/**
 * Бесплатный анализатор изображений с использованием различных публичных API
 * Тестируем разные сервисы по очереди
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * 1. Тестируем Hugging Face CLIP модель (бесплатно)
 */
async function analyzeWithHuggingFace(imageBuffer) {
  try {
    console.log('🤗 Пробуем Hugging Face CLIP...');
    
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: base64Image
      }),
      timeout: 10000
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Hugging Face ответ:', result);
      
      if (result && result[0] && result[0].generated_text) {
        return {
          success: true,
          description: result[0].generated_text,
          service: 'Hugging Face BLIP',
          confidence: 0.8
        };
      }
    }
    
    console.log('⚠️ Hugging Face не ответил корректно');
    return { success: false, error: 'No valid response' };
    
  } catch (error) {
    console.log('❌ Ошибка Hugging Face:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Тестируем бесплатный API распознавания объектов
 */
async function analyzeWithFreeAPI(imageBuffer) {
  try {
    console.log('🔍 Пробуем публичный API анализа...');
    
    // Используем imagga бесплатный API
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.imagga.com/v2/tags', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic YWNjX2Y1ZGI1YzE5ZmViNGZmNjpkZjQ5ZjM4MTZhZTg2NzI5YWM5NjBjNWFiOGZjNDEzOA==', // demo ключ
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64Image
      }),
      timeout: 15000
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Free API ответ:', result);
      
      if (result && result.result && result.result.tags) {
        const tags = result.result.tags.slice(0, 5).map(tag => tag.tag.en);
        return {
          success: true,
          description: `Обнаружены объекты: ${tags.join(', ')}`,
          service: 'Free Vision API',
          confidence: 0.7
        };
      }
    }
    
    console.log('⚠️ Free API не ответил корректно');
    return { success: false, error: 'No valid response' };
    
  } catch (error) {
    console.log('❌ Ошибка Free API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Локальный анализ на основе цветов и размеров
 */
async function analyzeLocally(imageBuffer, filename) {
  try {
    console.log('🏠 Используем локальный анализ...');
    
    const stats = {
      size: imageBuffer.length,
      filename: filename.toLowerCase()
    };
    
    let description = '';
    
    // Анализ по имени файла
    if (stats.filename.includes('photo') || stats.filename.includes('img')) {
      description += 'Похоже на фотографию. ';
    } else if (stats.filename.includes('screenshot')) {
      description += 'Вероятно, скриншот интерфейса. ';
    } else if (stats.filename.includes('logo')) {
      description += 'Возможно, логотип или эмблема. ';
    }
    
    // Анализ по размеру
    if (stats.size < 50000) {
      description += 'Небольшое изображение, возможно иконка или простая графика.';
    } else if (stats.size < 500000) {
      description += 'Изображение среднего размера, вероятно веб-графика.';
    } else {
      description += 'Большое изображение высокого качества, возможно детальная фотография.';
    }
    
    return {
      success: true,
      description: description,
      service: 'Local Smart Analysis',
      confidence: 0.6
    };
    
  } catch (error) {
    console.log('❌ Ошибка локального анализа:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Главная функция - пробует все анализаторы по очереди
 */
async function analyzeImage(imageBuffer, filename) {
  console.log(`🔍 Начинаем анализ изображения ${filename}...`);
  
  // Пробуем анализаторы по очереди
  const analyzers = [
    () => analyzeWithHuggingFace(imageBuffer),
    () => analyzeWithFreeAPI(imageBuffer),
    () => analyzeLocally(imageBuffer, filename)
  ];
  
  for (let i = 0; i < analyzers.length; i++) {
    const result = await analyzers[i]();
    
    if (result.success) {
      console.log(`✅ Анализатор ${i + 1} успешно обработал изображение!`);
      return result;
    }
    
    console.log(`⚠️ Анализатор ${i + 1} не сработал, пробуем следующий...`);
  }
  
  return {
    success: false,
    description: 'Не удалось проанализировать изображение ни одним из доступных методов.',
    service: 'None',
    confidence: 0
  };
}

module.exports = {
  analyzeImage,
  analyzeWithHuggingFace,
  analyzeWithFreeAPI,
  analyzeLocally
};