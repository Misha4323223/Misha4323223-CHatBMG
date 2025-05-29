/**
 * Умная система регенерации изображений
 * Анализирует исходное изображение и создает новое без указанных объектов
 */

const sharp = require('sharp');

/**
 * Анализ цветовой схемы изображения
 */
async function analyzeImageColors(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // Получаем пиксели для анализа
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    
    const colorCounts = {};
    const sampleStep = 10; // Анализируем каждый 10-й пиксель для скорости
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const pixelIndex = (y * width + x) * 3;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Группируем похожие цвета
        const colorKey = `${Math.floor(r/20)*20}-${Math.floor(g/20)*20}-${Math.floor(b/20)*20}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }
    }
    
    // Находим доминирующие цвета
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split('-').map(Number);
        return { r, g, b };
      });
    
    return sortedColors;
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка анализа цветов:', error);
    return [{ r: 128, g: 128, b: 128 }];
  }
}

/**
 * Определение стиля изображения по цветам
 */
function determineImageStyle(colors) {
  const mainColor = colors[0];
  
  // Анализируем цветовую гамму
  const isDark = colors.every(c => (c.r + c.g + c.b) / 3 < 120);
  const isBright = colors.some(c => (c.r + c.g + c.b) / 3 > 200);
  const hasWarmColors = colors.some(c => c.r > c.g && c.r > c.b);
  const hasCoolColors = colors.some(c => c.b > c.r && c.b > c.g);
  
  let style = '';
  
  if (isDark) {
    style += 'dark atmosphere, moody lighting, ';
  } else if (isBright) {
    style += 'bright, well-lit, cheerful, ';
  }
  
  if (hasWarmColors && !hasCoolColors) {
    style += 'warm color palette, ';
  } else if (hasCoolColors && !hasWarmColors) {
    style += 'cool color palette, ';
  }
  
  // Определяем насыщенность
  const avgSaturation = colors.reduce((sum, c) => {
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    return sum + (max - min) / max;
  }, 0) / colors.length;
  
  if (avgSaturation > 0.5) {
    style += 'vibrant colors, ';
  } else {
    style += 'muted colors, ';
  }
  
  return style;
}

/**
 * Извлечение ключевых слов из URL изображения
 */
function extractKeywordsFromUrl(imageUrl) {
  try {
    // Декодируем URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Извлекаем промпт из URL Pollinations
    const promptMatch = decodedUrl.match(/prompt\/(.+?)(?:\?|$)/);
    if (!promptMatch) return [];
    
    const prompt = promptMatch[1];
    
    // Разбиваем на слова и фильтруем служебные слова
    const words = prompt.split(/[^\w\u0400-\u04FF]+/) // латиница и кириллица
      .filter(word => word.length > 2)
      .filter(word => !['high', 'quality', 'detailed', 'professional', 'draw', 'create'].includes(word.toLowerCase()));
    
    return words;
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка извлечения ключевых слов:', error);
    return [];
  }
}

/**
 * Создание нового описания без указанного объекта
 */
function createModifiedDescription(originalKeywords, objectToRemove, imageStyle) {
  // Удаляем упоминания объекта
  const removePatterns = [
    objectToRemove,
    objectToRemove.slice(0, -1), // убираем окончание
    objectToRemove + 'ом',
    objectToRemove + 'ами',
    objectToRemove + 'и'
  ];
  
  let filteredKeywords = originalKeywords.filter(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return !removePatterns.some(pattern => 
      lowerKeyword.includes(pattern.toLowerCase()) || 
      pattern.toLowerCase().includes(lowerKeyword)
    );
  });
  
  // Если удалили слишком много, оставляем основные
  if (filteredKeywords.length < 2 && originalKeywords.length > 0) {
    filteredKeywords = originalKeywords.slice(0, 2);
  }
  
  // Создаем новое описание
  let newDescription = filteredKeywords.join(' ');
  
  // Добавляем стилевые характеристики
  newDescription += `, ${imageStyle}`;
  
  // Добавляем качественные модификаторы
  newDescription += ' high quality, detailed, professional';
  
  return newDescription;
}

/**
 * Основная функция умной регенерации
 */
async function regenerateImageWithoutObject(imageUrl, objectToRemove) {
  try {
    console.log(`🔄 [REGENERATOR] Начинаем умную регенерацию`);
    console.log(`🎯 [REGENERATOR] Убираем объект: ${objectToRemove}`);
    
    // Загружаем и анализируем изображение
    const imageUtils = require('./image-utils');
    const imageBuffer = await imageUtils.loadImageFromUrl(imageUrl);
    
    // Анализируем цвета и стиль
    const colors = await analyzeImageColors(imageBuffer);
    const style = determineImageStyle(colors);
    
    console.log(`🎨 [REGENERATOR] Стиль изображения: ${style}`);
    
    // Извлекаем ключевые слова из URL
    const keywords = extractKeywordsFromUrl(imageUrl);
    console.log(`🔤 [REGENERATOR] Ключевые слова: ${keywords.join(', ')}`);
    
    // Создаем новое описание
    const newDescription = createModifiedDescription(keywords, objectToRemove, style);
    console.log(`📝 [REGENERATOR] Новое описание: ${newDescription}`);
    
    // Генерируем новое изображение
    const aiImageGenerator = require('./ai-image-generator');
    const result = await aiImageGenerator.generateImage(newDescription, 'realistic');
    
    if (result.success) {
      return {
        success: true,
        imageUrl: result.imageUrl,
        message: `Создано новое изображение без "${objectToRemove}", сохранив основные характеристики оригинала`,
        originalKeywords: keywords,
        newDescription: newDescription,
        style: style
      };
    } else {
      throw new Error('Не удалось сгенерировать новое изображение');
    }
    
  } catch (error) {
    console.error('❌ [REGENERATOR] Ошибка регенерации:', error);
    return {
      success: false,
      error: error.message,
      message: 'Не удалось создать новое изображение без указанного объекта'
    };
  }
}

module.exports = {
  regenerateImageWithoutObject,
  analyzeImageColors,
  determineImageStyle,
  extractKeywordsFromUrl
};