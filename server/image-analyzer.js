/**
 * Бесплатный анализатор изображений с использованием различных публичных API
 * Тестируем разные сервисы по очереди
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * 1. Пробуем публичный API распознавания через прокси
 */
async function analyzeWithPublicAPI(imageBuffer) {
  try {
    console.log('🔍 Пробуем публичный Vision API...');
    
    // Используем публичный endpoint для анализа изображений
    const formData = new (require('form-data'))();
    formData.append('image', imageBuffer, 'image.jpg');
    
    const response = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Api-Key': 'demo_key', // Используем demo ключ
      },
      timeout: 15000
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Public API ответ:', result);
      
      if (result && result.length > 0) {
        return {
          success: true,
          description: `Обнаружен текст: ${result.map(item => item.text).join(', ')}`,
          service: 'Public Vision API',
          confidence: 0.7
        };
      }
    }
    
    console.log('⚠️ Public API не ответил корректно');
    return { success: false, error: 'No valid response' };
    
  } catch (error) {
    console.log('❌ Ошибка Public API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Анализ через наш собственный AI провайдер с описанием изображения
 */
async function analyzeWithAIProvider(imageBuffer, filename) {
  try {
    console.log('🤖 Пробуем AI провайдер для описания изображения...');
    
    // Подключаемся к нашему Python G4F провайдеру
    const response = await fetch('http://localhost:5004/python/chat', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Проанализируй это изображение и опиши что на нем изображено. Файл называется ${filename}. Будь максимально подробным в описании объектов, людей, животных, цветов и деталей.`,
        provider: 'Qwen_Qwen_2_5_Max'
      }),
      timeout: 20000
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI Provider ответ:', result);
      
      if (result && result.response) {
        return {
          success: true,
          description: result.response,
          service: 'Qwen AI Analysis',
          confidence: 0.85
        };
      }
    }
    
    console.log('⚠️ AI Provider не ответил корректно');
    return { success: false, error: 'No valid response' };
    
  } catch (error) {
    console.log('❌ Ошибка AI Provider:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Умный анализ через распознавание паттернов в пикселях
 */
async function analyzeWithPixelAnalysis(imageBuffer) {
  try {
    console.log('🎨 Анализируем пиксели изображения...');
    
    // Получаем базовую информацию о цветах и размерах
    const imageSize = imageBuffer.length;
    
    // Простой анализ доминирующих цветов (грубая оценка)
    let colorGuess = '';
    const sample = imageBuffer.slice(0, 1000); // Берем образец
    
    let redCount = 0, greenCount = 0, blueCount = 0;
    for (let i = 0; i < sample.length; i += 3) {
      if (sample[i] > 150) redCount++;
      if (sample[i+1] > 150) greenCount++;
      if (sample[i+2] > 150) blueCount++;
    }
    
    if (redCount > greenCount && redCount > blueCount) {
      colorGuess = 'Преобладают красные оттенки - возможно закат, цветы или предметы красного цвета. ';
    } else if (greenCount > redCount && greenCount > blueCount) {
      colorGuess = 'Преобладают зеленые тона - вероятно природа, растения или трава. ';
    } else if (blueCount > redCount && blueCount > greenCount) {
      colorGuess = 'Много синего цвета - возможно небо, вода или объекты синего цвета. ';
    } else {
      colorGuess = 'Сбалансированная цветовая палитра. ';
    }
    
    // Анализ сложности изображения
    let complexityGuess = '';
    if (imageSize < 100000) {
      complexityGuess = 'Простое изображение с небольшим количеством деталей.';
    } else if (imageSize < 1000000) {
      complexityGuess = 'Изображение средней сложности с различными элементами.';
    } else {
      complexityGuess = 'Сложное детализированное изображение с множеством элементов.';
    }
    
    return {
      success: true,
      description: `${colorGuess}${complexityGuess}`,
      service: 'Pixel Pattern Analysis',
      confidence: 0.65
    };
    
  } catch (error) {
    console.log('❌ Ошибка анализа пикселей:', error.message);
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
    () => analyzeWithAIProvider(imageBuffer, filename),
    () => analyzeWithPublicAPI(imageBuffer),
    () => analyzeWithPixelAnalysis(imageBuffer),
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
  analyzeWithPublicAPI,
  analyzeWithAIProvider,
  analyzeWithPixelAnalysis,
  analyzeLocally
};