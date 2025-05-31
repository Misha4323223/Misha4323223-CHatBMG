/**
 * Конвертер изображений в SVG для шелкографии и DTF печати
 * Преобразует растровые изображения в векторные форматы для печати на текстиле
 */

const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs').promises;
const path = require('path');

// Импорт fetch с проверкой версии Node.js
let fetch;
try {
  fetch = require('node-fetch');
} catch (error) {
  // Fallback для более новых версий Node.js
  fetch = globalThis.fetch;
}

// Импортируем AI провайдеры для улучшения SVG
const chatFreeProvider = require('./chatfree-provider');

// Создание необходимых директорий
async function ensureDirectories() {
  const dirs = ['temp', 'output', 'output/svg', 'output/print'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    } catch (error) {
      // Директория уже существует
    }
  }
}

/**
 * AI-анализ изображения для оптимизации SVG конвертации
 */
async function analyzeImageWithAI(imageBuffer, userRequest) {
  try {
    console.log(`🤖 [SVG-AI] Анализируем изображение с помощью AI...`);
    
    const prompt = `Ты эксперт по векторной графике и печати на текстиле. Проанализируй запрос пользователя: "${userRequest}"

Твоя задача - дать рекомендации для оптимальной конвертации изображения в SVG для печати:

1. Определи тип дизайна (логотип, иллюстрация, текст, паттерн)
2. Рекомендуй метод трассировки (простой контур, детализированный, смешанный)
3. Предложи оптимальную цветовую палитру для печати
4. Определи лучший тип печати (шелкография или DTF)
5. Дай технические рекомендации

Ответь в формате JSON:
{
  "designType": "логотип|иллюстрация|текст|паттерн",
  "traceMethod": "simple|detailed|mixed",
  "printType": "screenprint|dtf|both",
  "colorReduction": true|false,
  "maxColors": число,
  "recommendations": "текстовые рекомендации"
}`;

    const aiResponse = await chatFreeProvider.getChatFreeResponse(prompt, {
      systemPrompt: "Ты эксперт по векторной графике и печати на текстиле. Отвечай только в формате JSON.",
      temperature: 0.3
    });

    if (aiResponse.success && aiResponse.response) {
      try {
        // Пытаемся извлечь JSON из ответа
        const jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log(`✅ [SVG-AI] AI анализ получен:`, analysis);
          return analysis;
        }
      } catch (parseError) {
        console.log(`⚠️ [SVG-AI] Ошибка парсинга AI ответа, используем базовые настройки`);
      }
    }

    // Возвращаем базовые настройки если AI не сработал
    return {
      designType: "иллюстрация",
      traceMethod: "detailed",
      printType: "both",
      colorReduction: true,
      maxColors: 6,
      recommendations: "Стандартная конвертация для универсального использования"
    };

  } catch (error) {
    console.error(`❌ [SVG-AI] Ошибка AI анализа:`, error);
    return {
      designType: "иллюстрация",
      traceMethod: "detailed", 
      printType: "both",
      colorReduction: true,
      maxColors: 6,
      recommendations: "Базовые настройки из-за ошибки AI анализа"
    };
  }
}

/**
 * Загрузка изображения по URL или из файла
 */
async function loadImage(imageSource) {
  try {
    if (imageSource.startsWith('http')) {
      const response = await fetch(imageSource);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.buffer();
    } else {
      return await fs.readFile(imageSource);
    }
  } catch (error) {
    throw new Error(`Ошибка загрузки изображения: ${error.message}`);
  }
}

/**
 * Подготовка изображения для векторизации
 */
async function prepareImageForVectorization(imageBuffer, options = {}) {
  const {
    width = 1024,
    height = 1024,
    contrast = 1.2,
    brightness = 0.1,
    threshold = 128
  } = options;

  try {
    // Обработка изображения для лучшей векторизации
    let processedBuffer = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .modulate({ brightness: 1 + brightness })
      .linear(contrast, -(128 * contrast) + 128)
      .threshold(threshold)
      .png()
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    throw new Error(`Ошибка обработки изображения: ${error.message}`);
  }
}

/**
 * Создание SVG для шелкографии (высококонтрастный, простые формы)
 */
async function createScreenPrintSVG(imageBuffer, outputPath, options = {}) {
  const {
    simplify = true,
    threshold = 180,
    strokeWidth = 0.5
  } = options;

  try {
    // Подготовка для шелкографии - высокий контраст, простые формы
    const preparedBuffer = await prepareImageForVectorization(imageBuffer, {
      threshold,
      contrast: 1.5,
      brightness: 0.2
    });

    return new Promise((resolve, reject) => {
      potrace.trace(preparedBuffer, {
        threshold: threshold,
        optTolerance: simplify ? 0.4 : 0.2,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
        turdSize: 2,
        optCurve: true,
        alphaMax: 1.0,
        color: '#000000'
      }, (err, svg) => {
        if (err) {
          reject(new Error(`Ошибка векторизации для шелкографии: ${err.message}`));
          return;
        }

        // Оптимизация SVG для шелкографии
        const optimizedSVG = svg
          .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">`)
          .replace(/fill="[^"]*"/g, 'fill="#000000"')
          .replace(/stroke="[^"]*"/g, `stroke="#000000" stroke-width="${strokeWidth}"`);

        // Добавление метаданных для шелкографии
        const finalSVG = optimizedSVG.replace(
          '<svg',
          `<!-- Оптимизировано для шелкографии -->
          <!-- Рекомендации: одноцветная печать, плотность красок 100% -->
          <svg`
        );

        resolve({
          svg: finalSVG,
          path: outputPath,
          type: 'screenprint'
        });
      });
    });
  } catch (error) {
    throw new Error(`Ошибка создания SVG для шелкографии: ${error.message}`);
  }
}

/**
 * Создание SVG для DTF печати (детализированный, цветной)
 */
async function createDTFSVG(imageBuffer, outputPath, options = {}) {
  const {
    preserveColors = true,
    threshold = 120,
    strokeWidth = 0.3
  } = options;

  try {
    let preparedBuffer;
    
    if (preserveColors) {
      // Для DTF сохраняем больше деталей и цветов
      preparedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .normalize()
        .sharpen()
        .png()
        .toBuffer();
    } else {
      preparedBuffer = await prepareImageForVectorization(imageBuffer, {
        threshold,
        contrast: 1.3,
        brightness: 0.1
      });
    }

    return new Promise((resolve, reject) => {
      potrace.trace(preparedBuffer, {
        threshold: threshold,
        optTolerance: 0.2,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
        turdSize: 1,
        optCurve: true,
        alphaMax: 1.0,
        color: preserveColors ? 'auto' : '#000000'
      }, (err, svg) => {
        if (err) {
          reject(new Error(`Ошибка векторизации для DTF: ${err.message}`));
          return;
        }

        // Оптимизация SVG для DTF печати
        let optimizedSVG = svg
          .replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 1024">`)
          .replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`);

        // Добавление метаданных для DTF
        const finalSVG = optimizedSVG.replace(
          '<svg',
          `<!-- Оптимизировано для DTF печати -->
          <!-- Рекомендации: полноцветная печать, высокое разрешение -->
          <svg`
        );

        resolve({
          svg: finalSVG,
          path: outputPath,
          type: 'dtf'
        });
      });
    });
  } catch (error) {
    throw new Error(`Ошибка создания SVG для DTF: ${error.message}`);
  }
}

/**
 * Создание цветовой схемы для печати
 */
async function generateColorScheme(imageBuffer) {
  try {
    const { dominant } = await sharp(imageBuffer)
      .resize(100, 100)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Простой алгоритм выделения доминирующих цветов
    const colors = new Map();
    const buffer = dominant;
    
    for (let i = 0; i < buffer.length; i += 3) {
      const r = buffer[i];
      const g = buffer[i + 1];
      const b = buffer[i + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      colors.set(hex, (colors.get(hex) || 0) + 1);
    }

    // Сортируем по частоте использования
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color]) => color);

    return {
      primary: sortedColors[0] || '#000000',
      secondary: sortedColors[1] || '#333333',
      accent: sortedColors[2] || '#666666',
      palette: sortedColors
    };
  } catch (error) {
    return {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      palette: ['#000000', '#333333', '#666666']
    };
  }
}

/**
 * Главная функция конвертации
 */
async function convertImageToPrintSVG(imageSource, outputName, printType = 'both', userRequest = '') {
  await ensureDirectories();
  
  const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  const baseName = outputName || `print-design-${id}`;
  
  try {
    console.log(`🎨 [SVG-PRINT] Начинаем конвертацию изображения для ${printType} печати`);
    
    // Загружаем изображение
    const imageBuffer = await loadImage(imageSource);
    console.log(`📁 [SVG-PRINT] Изображение загружено: ${imageBuffer.length} байт`);
    
    // AI-анализ для оптимизации конвертации
    const aiAnalysis = await analyzeImageWithAI(imageBuffer, userRequest);
    console.log(`🤖 [SVG-PRINT] AI рекомендации получены: ${aiAnalysis.recommendations}`);
    
    // Генерируем цветовую схему
    const colorScheme = await generateColorScheme(imageBuffer);
    console.log(`🎨 [SVG-PRINT] Цветовая схема: ${colorScheme.palette.length} цветов`);
    
    const results = {
      id,
      name: baseName,
      colorScheme,
      files: [],
      recommendations: {},
      aiAnalysis: aiAnalysis
    };

    // Создаем SVG для шелкографии
    if (printType === 'screenprint' || printType === 'both') {
      const screenPrintPath = path.join('output', 'svg', `${baseName}-screenprint.svg`);
      const screenResult = await createScreenPrintSVG(imageBuffer, screenPrintPath);
      
      await fs.writeFile(screenResult.path, screenResult.svg);
      console.log(`✅ [SVG-PRINT] SVG для шелкографии создан: ${screenResult.path}`);
      
      results.files.push({
        type: 'screenprint',
        format: 'svg',
        path: screenResult.path,
        url: `/output/svg/${baseName}-screenprint.svg`,
        size: screenResult.svg.length
      });
      
      results.recommendations.screenprint = {
        colors: 1,
        technique: 'Одноцветная шелкография',
        notes: 'Рекомендуется для больших тиражей, простые формы, высокая стойкость'
      };
    }

    // Создаем SVG для DTF печати
    if (printType === 'dtf' || printType === 'both') {
      const dtfPath = path.join('output', 'svg', `${baseName}-dtf.svg`);
      const dtfResult = await createDTFSVG(imageBuffer, dtfPath, { preserveColors: true });
      
      await fs.writeFile(dtfResult.path, dtfResult.svg);
      console.log(`✅ [SVG-PRINT] SVG для DTF создан: ${dtfResult.path}`);
      
      results.files.push({
        type: 'dtf',
        format: 'svg',
        path: dtfResult.path,
        url: `/output/svg/${baseName}-dtf.svg`,
        size: dtfResult.svg.length
      });
      
      results.recommendations.dtf = {
        colors: colorScheme.palette.length,
        technique: 'DTF полноцветная печать',
        notes: 'Подходит для сложных дизайнов, фотореализм, малые тиражи'
      };
    }

    // Сохраняем цветовую схему
    const colorSchemePath = path.join('output', 'print', `${baseName}-colors.json`);
    await fs.writeFile(colorSchemePath, JSON.stringify(colorScheme, null, 2));
    
    results.files.push({
      type: 'colorscheme',
      format: 'json',
      path: colorSchemePath,
      url: `/output/print/${baseName}-colors.json`,
      size: JSON.stringify(colorScheme).length
    });

    console.log(`🎉 [SVG-PRINT] Конвертация завершена: ${results.files.length} файлов`);
    
    return {
      success: true,
      result: results
    };

  } catch (error) {
    console.error(`❌ [SVG-PRINT] Ошибка конвертации:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Определение типа печати из запроса
 */
function detectPrintTypeFromRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('шелкограф') || lowerMessage.includes('screenprint') || lowerMessage.includes('трафарет')) {
    return 'screenprint';
  }
  
  if (lowerMessage.includes('dtf') || lowerMessage.includes('цифров') || lowerMessage.includes('термотрансфер')) {
    return 'dtf';
  }
  
  return 'both'; // По умолчанию создаем оба типа
}

/**
 * Проверка, является ли запрос конвертацией в SVG для печати
 */
function isPrintConversionRequest(message) {
  const printKeywords = [
    'принт', 'футболка', 'печать', 'svg', 'векторизация', 'шелкография', 
    'dtf', 'печать на ткани', 'screenprint', 'термотрансфер', 'трафарет',
    'дизайн для', 'принт на', 'одежда', 'textile', 'майка', 'рубашка'
  ];
  
  const conversionKeywords = [
    'конверт', 'преобразуй', 'сделай svg', 'в вектор', 'сохрани в svg',
    'сохрани svg', 'экспорт в svg', 'сделай векторным'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  const hasPrintKeyword = printKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasConversionKeyword = conversionKeywords.some(keyword => lowerMessage.includes(keyword));
  
  console.log(`🔍 [SVG-PRINT] Проверка запроса на печать:`, {
    message: lowerMessage.substring(0, 50),
    hasPrintKeyword,
    hasConversionKeyword,
    foundKeywords: [...printKeywords, ...conversionKeywords].filter(keyword => lowerMessage.includes(keyword))
  });
  
  return hasPrintKeyword || hasConversionKeyword;
}

module.exports = {
  convertImageToPrintSVG,
  detectPrintTypeFromRequest,
  isPrintConversionRequest,
  generateColorScheme
};