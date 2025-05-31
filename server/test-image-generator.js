/**
 * Простой генератор тестовых изображений для проверки системы анализа вышивки
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Создает простое тестовое изображение для анализа
 */
async function createTestImage(prompt) {
  try {
    // Создаем простое изображение с цветными блоками
    const width = 512;
    const height = 512;
    
    // Определяем цветовую схему на основе промпта
    let colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']; // По умолчанию
    
    if (prompt.toLowerCase().includes('самурай') || prompt.toLowerCase().includes('samurai')) {
      colors = ['#8B0000', '#FFD700', '#000000', '#C0C0C0']; // Красный, золотой, черный, серебряный
    } else if (prompt.toLowerCase().includes('роза') || prompt.toLowerCase().includes('flower')) {
      colors = ['#FF69B4', '#228B22', '#FFB6C1', '#006400']; // Розовый, зеленый для листьев
    } else if (prompt.toLowerCase().includes('логотип') || prompt.toLowerCase().includes('logo')) {
      colors = ['#1E90FF', '#FFFFFF', '#000000', '#FF4500']; // Синий, белый, черный, оранжевый
    }
    
    // Создаем SVG с простыми фигурами
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${colors[1]}"/>
        <circle cx="256" cy="256" r="100" fill="${colors[0]}" stroke="${colors[2]}" stroke-width="8"/>
        <rect x="200" y="200" width="112" height="112" fill="${colors[3]}" opacity="0.8"/>
        <polygon points="256,150 300,220 212,220" fill="${colors[2]}"/>
        <text x="256" y="350" text-anchor="middle" font-family="Arial" font-size="24" fill="${colors[2]}">TEST</text>
      </svg>
    `;
    
    // Конвертируем SVG в PNG
    const imageBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    // Сохраняем изображение
    const outputDir = path.join(process.cwd(), 'output', 'test');
    await fs.mkdir(outputDir, { recursive: true });
    
    const fileName = `test_${Date.now()}.png`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, imageBuffer);
    
    console.log('✅ Тестовое изображение создано:', filePath);
    
    return {
      success: true,
      imageUrl: `/output/test/${fileName}`,
      localPath: filePath,
      buffer: imageBuffer
    };
    
  } catch (error) {
    console.error('❌ Ошибка создания тестового изображения:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Создает более сложное изображение для тестирования
 */
async function createComplexTestImage(prompt) {
  try {
    const width = 1024;
    const height = 1024;
    
    // Создаем более сложный дизайн
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pattern1" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect width="40" height="40" fill="#FF6B6B"/>
            <circle cx="20" cy="20" r="8" fill="#4ECDC4"/>
          </pattern>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFE66D"/>
            <stop offset="100%" style="stop-color:#FF6B6B"/>
          </linearGradient>
        </defs>
        
        <!-- Фон -->
        <rect width="100%" height="100%" fill="url(#grad1)"/>
        
        <!-- Основные фигуры -->
        <circle cx="512" cy="300" r="150" fill="#4ECDC4" stroke="#000" stroke-width="8"/>
        <rect x="350" y="450" width="324" height="180" fill="url(#pattern1)" stroke="#000" stroke-width="4"/>
        
        <!-- Детали -->
        <polygon points="512,150 600,250 424,250" fill="#A8E6CF" stroke="#000" stroke-width="3"/>
        <ellipse cx="400" cy="700" rx="80" ry="40" fill="#FFD93D"/>
        <ellipse cx="624" cy="700" rx="80" ry="40" fill="#FFD93D"/>
        
        <!-- Мелкие элементы -->
        <circle cx="450" cy="200" r="15" fill="#FF8B94"/>
        <circle cx="574" cy="200" r="15" fill="#FF8B94"/>
        <rect x="490" y="380" width="44" height="20" fill="#000"/>
        
        <!-- Текст -->
        <text x="512" y="900" text-anchor="middle" font-family="Arial" font-size="32" fill="#000">EMBROIDERY TEST</text>
      </svg>
    `;
    
    const imageBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    const outputDir = path.join(process.cwd(), 'output', 'test');
    await fs.mkdir(outputDir, { recursive: true });
    
    const fileName = `complex_test_${Date.now()}.png`;
    const filePath = path.join(outputDir, fileName);
    
    await fs.writeFile(filePath, imageBuffer);
    
    console.log('✅ Сложное тестовое изображение создано:', filePath);
    
    return {
      success: true,
      imageUrl: `/output/test/${fileName}`,
      localPath: filePath,
      buffer: imageBuffer
    };
    
  } catch (error) {
    console.error('❌ Ошибка создания сложного тестового изображения:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createTestImage,
  createComplexTestImage
};