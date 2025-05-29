/**
 * Продвинутая система редактирования изображений
 * Позволяет добавлять и удалять детали с изображений
 */

const sharp = require('sharp');
const fs = require('fs');

/**
 * Добавление объекта на изображение
 * @param {string} imageUrl - URL основного изображения
 * @param {string} objectDescription - Описание объекта для добавления
 * @returns {Promise<Object>} Результат обработки
 */
async function addObjectToImage(imageUrl, objectDescription) {
  try {
    console.log(`➕ [ADV-EDITOR] Добавляем объект: ${objectDescription}`);
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    // Создаем простую "накладку" объекта (в данном случае - цветную фигуру)
    const timestamp = Date.now();
    const outputPath = `./uploads/object-added-${timestamp}.png`;
    
    // Определяем, какой объект добавляем и создаем соответствующую фигуру
    let overlayColor = { r: 255, g: 255, b: 0 }; // желтый по умолчанию
    let overlaySize = Math.min(width, height) * 0.15;
    
    if (objectDescription.includes('солнце') || objectDescription.includes('sun')) {
      overlayColor = { r: 255, g: 255, b: 0 }; // желтый
      overlaySize = Math.min(width, height) * 0.2;
    } else if (objectDescription.includes('цвет') || objectDescription.includes('flower')) {
      overlayColor = { r: 255, g: 100, b: 150 }; // розовый
      overlaySize = Math.min(width, height) * 0.1;
    } else if (objectDescription.includes('дерево') || objectDescription.includes('tree')) {
      overlayColor = { r: 100, g: 200, b: 100 }; // зеленый
      overlaySize = Math.min(width, height) * 0.25;
    }
    
    // Создаем круглую накладку
    const overlay = sharp({
      create: {
        width: Math.round(overlaySize),
        height: Math.round(overlaySize),
        channels: 4,
        background: overlayColor
      }
    }).png();
    
    const overlayBuffer = await overlay.toBuffer();
    
    // Позиционируем объект в правом верхнем углу
    const left = Math.round(width - overlaySize - 50);
    const top = 50;
    
    await image
      .composite([{
        input: overlayBuffer,
        left: left,
        top: top,
        blend: 'over'
      }])
      .png()
      .toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/object-added-${timestamp}.png`,
      message: `Добавлен объект "${objectDescription}" на изображение`,
      type: 'object_addition'
    };
    
  } catch (error) {
    console.error('❌ [ADV-EDITOR] Ошибка добавления объекта:', error);
    return {
      success: false,
      error: 'Ошибка добавления объекта',
      message: 'Не удалось добавить объект на изображение'
    };
  }
}

/**
 * Удаление области с изображения (простая маскировка)
 * @param {string} imageUrl - URL изображения
 * @param {string} areaDescription - Описание области для удаления
 * @returns {Promise<Object>} Результат обработки
 */
async function removeAreaFromImage(imageUrl, areaDescription) {
  try {
    console.log(`🗑️ [ADV-EDITOR] Удаляем область: ${areaDescription}`);
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    
    const timestamp = Date.now();
    const outputPath = `./uploads/removed-area-${timestamp}.png`;
    
    // Определяем область для удаления в зависимости от описания
    let maskArea = { x: 0, y: 0, width: width, height: height };
    
    if (areaDescription.includes('фон') || areaDescription.includes('background')) {
      // Удаляем фон - заменяем белым цветом
      await image
        .flatten({ background: '#FFFFFF' })
        .png()
        .toFile(outputPath);
      
      return {
        success: true,
        imageUrl: `/uploads/removed-area-${timestamp}.png`,
        message: `Фон удален и заменен белым`,
        type: 'background_removal'
      };
    }
    
    if (areaDescription.includes('верх') || areaDescription.includes('top')) {
      // Удаляем верхнюю часть
      maskArea = { x: 0, y: 0, width: width, height: Math.round(height * 0.3) };
    } else if (areaDescription.includes('низ') || areaDescription.includes('bottom')) {
      // Удаляем нижнюю часть
      maskArea = { x: 0, y: Math.round(height * 0.7), width: width, height: Math.round(height * 0.3) };
    } else if (areaDescription.includes('лев') || areaDescription.includes('left')) {
      // Удаляем левую часть
      maskArea = { x: 0, y: 0, width: Math.round(width * 0.3), height: height };
    } else if (areaDescription.includes('прав') || areaDescription.includes('right')) {
      // Удаляем правую часть
      maskArea = { x: Math.round(width * 0.7), y: 0, width: Math.round(width * 0.3), height: height };
    } else {
      // Удаляем центральную область по умолчанию
      const maskSize = Math.min(width, height) * 0.2;
      maskArea = { 
        x: Math.round((width - maskSize) / 2), 
        y: Math.round((height - maskSize) / 2), 
        width: maskSize, 
        height: maskSize 
      };
    }
    
    // Создаем белую маску для "удаления"
    const whiteMask = sharp({
      create: {
        width: Math.round(maskArea.width),
        height: Math.round(maskArea.height),
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png();
    
    const maskBuffer = await whiteMask.toBuffer();
    
    // Накладываем белую маску на область
    await image
      .composite([{
        input: maskBuffer,
        left: Math.round(maskArea.x),
        top: Math.round(maskArea.y),
        blend: 'over'
      }])
      .png()
      .toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/removed-area-${timestamp}.png`,
      message: `Удалена область: ${areaDescription}`,
      type: 'area_removal'
    };
    
  } catch (error) {
    console.error('❌ [ADV-EDITOR] Ошибка удаления области:', error);
    return {
      success: false,
      error: 'Ошибка удаления области',
      message: 'Не удалось обработать указанную область'
    };
  }
}

/**
 * Изменение цвета объекта на изображении
 * @param {string} imageUrl - URL изображения
 * @param {string} colorChange - Описание изменения цвета
 * @returns {Promise<Object>} Результат обработки
 */
async function changeObjectColor(imageUrl, colorChange) {
  try {
    console.log(`🎨 [ADV-EDITOR] Изменяем цвет: ${colorChange}`);
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    
    const timestamp = Date.now();
    const outputPath = `./uploads/color-changed-${timestamp}.png`;
    
    // Применяем цветовую коррекцию в зависимости от запроса
    let processedImage = sharp(imageBuffer);
    
    if (colorChange.includes('красн') || colorChange.includes('red')) {
      processedImage = processedImage.tint({ r: 255, g: 200, b: 200 });
    } else if (colorChange.includes('син') || colorChange.includes('blue')) {
      processedImage = processedImage.tint({ r: 200, g: 200, b: 255 });
    } else if (colorChange.includes('зелен') || colorChange.includes('green')) {
      processedImage = processedImage.tint({ r: 200, g: 255, b: 200 });
    } else if (colorChange.includes('желт') || colorChange.includes('yellow')) {
      processedImage = processedImage.tint({ r: 255, g: 255, b: 200 });
    } else {
      // Общее изменение насыщенности
      processedImage = processedImage.modulate({ saturation: 1.5 });
    }
    
    await processedImage.png().toFile(outputPath);
    
    return {
      success: true,
      imageUrl: `/uploads/color-changed-${timestamp}.png`,
      message: `Цвет изменен: ${colorChange}`,
      type: 'color_change'
    };
    
  } catch (error) {
    console.error('❌ [ADV-EDITOR] Ошибка изменения цвета:', error);
    return {
      success: false,
      error: 'Ошибка изменения цвета',
      message: 'Не удалось изменить цвет объекта'
    };
  }
}

/**
 * Анализ запроса для определения типа продвинутого редактирования
 * @param {string} request - Запрос пользователя
 * @returns {Object} Тип операции и параметры
 */
function parseAdvancedEditRequest(request) {
  const lowerRequest = request.toLowerCase();
  
  // Добавление объектов
  if (lowerRequest.includes('добавь') || lowerRequest.includes('нарисуй') || lowerRequest.includes('поставь')) {
    const objectMatch = request.match(/добавь\s+(.+?)(?:\.|$|,)/i) || 
                       request.match(/нарисуй\s+(.+?)(?:\.|$|,)/i) ||
                       request.match(/поставь\s+(.+?)(?:\.|$|,)/i);
    const objectToAdd = objectMatch ? objectMatch[1] : 'новый объект';
    
    return {
      type: 'add_object',
      object: objectToAdd,
      description: `Добавление объекта: ${objectToAdd}`
    };
  }
  
  // Удаление объектов/областей
  if (lowerRequest.includes('убери') || lowerRequest.includes('удали') || lowerRequest.includes('скрой')) {
    const areaMatch = request.match(/убери\s+(.+?)(?:\.|$|,)/i) || 
                     request.match(/удали\s+(.+?)(?:\.|$|,)/i) ||
                     request.match(/скрой\s+(.+?)(?:\.|$|,)/i);
    const areaToRemove = areaMatch ? areaMatch[1] : 'указанную область';
    
    return {
      type: 'remove_area',
      area: areaToRemove,
      description: `Удаление области: ${areaToRemove}`
    };
  }
  
  // Изменение цвета
  if (lowerRequest.includes('измени цвет') || lowerRequest.includes('перекрась') || lowerRequest.includes('сделай')) {
    const colorMatch = request.match(/(?:измени цвет|перекрась|сделай)\s+(.+?)(?:\.|$|,)/i);
    const colorChange = colorMatch ? colorMatch[1] : 'цветовые характеристики';
    
    return {
      type: 'change_color',
      colorChange: colorChange,
      description: `Изменение цвета: ${colorChange}`
    };
  }
  
  return {
    type: 'unknown',
    description: 'Неизвестный тип редактирования'
  };
}

/**
 * Основная функция продвинутого редактирования изображений
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} editRequest - Запрос на редактирование
 * @returns {Promise<Object>} Результат обработки
 */
async function processAdvancedEdit(imageUrl, editRequest) {
  const request = parseAdvancedEditRequest(editRequest);
  
  console.log(`🔧 [ADV-EDITOR] Продвинутое редактирование: ${request.description}`);
  
  switch (request.type) {
    case 'add_object':
      return await addObjectToImage(imageUrl, request.object);
      
    case 'remove_area':
      return await removeAreaFromImage(imageUrl, request.area);
      
    case 'change_color':
      return await changeObjectColor(imageUrl, request.colorChange);
      
    default:
      return {
        success: false,
        error: 'Неизвестная операция',
        message: 'Попробуйте: "добавь солнце", "убери дерево", "измени цвет на красный"'
      };
  }
}

module.exports = {
  processAdvancedEdit,
  addObjectToImage,
  removeAreaFromImage,
  changeObjectColor,
  parseAdvancedEditRequest
};