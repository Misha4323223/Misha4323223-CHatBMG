/**
 * Тестирование системы редактирования изображений
 */

import sharp from 'sharp';
import fs from 'fs';

async function createTestImage() {
  try {
    // Создаем простое тестовое изображение
    const testImage = sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 100, g: 150, b: 200 }
      }
    });

    const timestamp = Date.now();
    const outputPath = `./uploads/test-image-${timestamp}.png`;
    
    await testImage.png().toFile(outputPath);
    
    console.log('✅ Тестовое изображение создано:', outputPath);
    return `/uploads/test-image-${timestamp}.png`;
    
  } catch (error) {
    console.error('❌ Ошибка создания тестового изображения:', error);
    return null;
  }
}

async function testImageEditing() {
  try {
    console.log('🧪 Начинаем тестирование системы редактирования...');
    
    // Создаем тестовое изображение
    const imageUrl = await createTestImage();
    if (!imageUrl) {
      throw new Error('Не удалось создать тестовое изображение');
    }
    
    // Тестируем простое редактирование
    const simpleProcessor = require('./simple-image-processor');
    
    console.log('🔧 Тестируем простую обработку...');
    const result1 = await simpleProcessor.processImage(imageUrl, 'размытие');
    console.log('📊 Результат простой обработки:', result1.success ? 'Успех' : 'Ошибка');
    
    // Тестируем продвинутое редактирование
    const advancedEditor = require('./advanced-image-editor');
    
    console.log('⚡ Тестируем продвинутое редактирование...');
    const result2 = await advancedEditor.changeObjectColor(imageUrl, 'красный');
    console.log('📊 Результат продвинутого редактирования:', result2.success ? 'Успех' : 'Ошибка');
    
    return {
      simpleEdit: result1,
      advancedEdit: result2,
      originalImage: imageUrl
    };
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    return { error: error.message };
  }
}

module.exports = {
  createTestImage,
  testImageEditing
};