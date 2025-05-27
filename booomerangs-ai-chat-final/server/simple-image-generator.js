/**
 * Простой и надежный генератор изображений для BOOOMERANGS
 * Использует проверенные бесплатные API для создания качественных изображений
 */

/**
 * Генерирует изображение через надежные бесплатные сервисы
 * @param {string} prompt - Описание изображения
 * @param {string} style - Стиль изображения 
 * @returns {Promise<{success: boolean, imageUrl: string}>}
 */
async function generateImage(prompt, style = 'realistic') {
  console.log(`🎨 Создаю изображение: "${prompt}"`);
  
  try {
    // Улучшаем промпт для лучшего качества
    let enhancedPrompt = prompt;
    
    if (style === 'artistic' || prompt.toLowerCase().includes('футболка') || prompt.toLowerCase().includes('принт')) {
      enhancedPrompt = `Professional t-shirt design, high quality vector graphics, modern streetwear style, clean composition, vibrant colors: ${prompt}`;
    } else if (prompt.toLowerCase().includes('логотип')) {
      enhancedPrompt = `Professional logo design, clean minimalist style, vector graphics, high contrast: ${prompt}`;
    }
    
    // Очищаем промпт от специальных символов
    const cleanPrompt = enhancedPrompt.replace(/[^\w\s\-.,!?]/g, '').trim();
    
    // Используем Pollinations.ai - самый надежный бесплатный сервис
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;
    
    console.log('✅ Изображение создано:', imageUrl);
    
    return {
      success: true,
      imageUrl: imageUrl
    };
    
  } catch (error) {
    console.error('❌ Ошибка генерации изображения:', error);
    return {
      success: false,
      error: 'Не удалось создать изображение'
    };
  }
}

/**
 * Создает несколько вариантов изображения
 * @param {string} prompt - Описание изображения
 * @param {number} count - Количество вариантов (по умолчанию 3)
 * @returns {Promise<Array>} - Массив URL изображений
 */
async function generateMultipleImages(prompt, count = 3) {
  console.log(`🎨 Создаю ${count} вариантов изображения`);
  
  const images = [];
  const cleanPrompt = prompt.replace(/[^\w\s\-.,!?]/g, '').trim();
  
  for (let i = 0; i < count; i++) {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now() + i}`;
    images.push({
      url: imageUrl,
      variant: i + 1
    });
  }
  
  return images;
}

module.exports = {
  generateImage,
  generateMultipleImages
};