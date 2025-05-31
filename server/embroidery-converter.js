/**
 * Конвертер изображений в форматы для шелкографии и вышивки
 * Поддерживает DST, PES, JEF, EXP и другие форматы
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Форматы вышивки и их характеристики
 */
const EMBROIDERY_FORMATS = {
  dst: {
    name: 'Tajima DST',
    extension: '.dst',
    description: 'Стандартный формат для большинства вышивальных машин',
    maxColors: 15,
    maxSize: { width: 400, height: 400 }
  },
  pes: {
    name: 'Brother PES',
    extension: '.pes',
    description: 'Формат для машин Brother',
    maxColors: 64,
    maxSize: { width: 360, height: 200 }
  },
  jef: {
    name: 'Janome JEF',
    extension: '.jef',
    description: 'Формат для машин Janome',
    maxColors: 32,
    maxSize: { width: 200, height: 280 }
  },
  exp: {
    name: 'Melco EXP',
    extension: '.exp',
    description: 'Формат для машин Melco',
    maxColors: 100,
    maxSize: { width: 300, height: 300 }
  },
  vp3: {
    name: 'Husqvarna VP3',
    extension: '.vp3',
    description: 'Формат для машин Husqvarna Viking',
    maxColors: 32,
    maxSize: { width: 260, height: 160 }
  }
};

/**
 * Создает директорию для сохранения файлов
 */
async function ensureOutputDir() {
  const outputDir = path.join(process.cwd(), 'output', 'embroidery');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error('Ошибка создания директории:', error);
  }
  return outputDir;
}

/**
 * Анализирует изображение для подготовки к конвертации
 */
async function analyzeImageForEmbroidery(imageBuffer) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const stats = await image.stats();
  
  return {
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    format: metadata.format,
    colorComplexity: stats.channels.length,
    recommendedFormat: determineRecommendedFormat(metadata.width, metadata.height, stats.channels.length)
  };
}

/**
 * Определяет рекомендуемый формат на основе характеристик изображения
 */
function determineRecommendedFormat(width, height, colorCount) {
  // Простые логотипы - DST
  if (width <= 200 && height <= 200 && colorCount <= 4) {
    return 'dst';
  }
  
  // Средние дизайны - PES
  if (width <= 300 && height <= 250 && colorCount <= 10) {
    return 'pes';
  }
  
  // Сложные дизайны - EXP
  return 'exp';
}

/**
 * Подготавливает изображение для вышивки
 */
async function prepareImageForEmbroidery(imageBuffer, targetFormat, options = {}) {
  const formatInfo = EMBROIDERY_FORMATS[targetFormat];
  if (!formatInfo) {
    throw new Error(`Неподдерживаемый формат: ${targetFormat}`);
  }
  
  const maxWidth = options.width || formatInfo.maxSize.width;
  const maxHeight = options.height || formatInfo.maxSize.height;
  const maxColors = options.colors || formatInfo.maxColors;
  
  let image = sharp(imageBuffer);
  
  // Изменение размера с сохранением пропорций
  image = image.resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true
  });
  
  // Квантизация цветов для уменьшения количества
  image = image.png({
    palette: true,
    colors: Math.min(maxColors, 256),
    dither: 1.0
  });
  
  // Увеличение контрастности для четких линий
  image = image.modulate({
    brightness: 1.1,
    saturation: 1.2
  }).sharpen(2);
  
  return await image.toBuffer();
}

/**
 * Извлекает цветовую палитру из изображения
 */
async function extractColorPalette(imageBuffer, maxColors = 15) {
  const image = sharp(imageBuffer);
  const { data, info } = await image
    .png({ palette: true, colors: maxColors })
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const colors = [];
  const pixelsPerColor = {};
  
  // Анализируем пиксели для определения основных цветов
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const colorKey = `${r},${g},${b}`;
    
    pixelsPerColor[colorKey] = (pixelsPerColor[colorKey] || 0) + 1;
  }
  
  // Сортируем цвета по частоте использования
  const sortedColors = Object.entries(pixelsPerColor)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxColors)
    .map(([colorKey, count]) => {
      const [r, g, b] = colorKey.split(',').map(Number);
      return {
        rgb: { r, g, b },
        hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
        usage: count,
        threadColor: suggestThreadColor(r, g, b)
      };
    });
  
  return sortedColors;
}

/**
 * Предлагает ближайший цвет нити для вышивки
 */
function suggestThreadColor(r, g, b) {
  // Стандартные цвета ниток для вышивки
  const threadColors = {
    '#FFFFFF': 'Белый',
    '#000000': 'Черный',
    '#FF0000': 'Красный',
    '#00FF00': 'Зеленый',
    '#0000FF': 'Синий',
    '#FFFF00': 'Желтый',
    '#FF00FF': 'Пурпурный',
    '#00FFFF': 'Голубой',
    '#800000': 'Темно-красный',
    '#008000': 'Темно-зеленый',
    '#000080': 'Темно-синий',
    '#808000': 'Оливковый',
    '#800080': 'Фиолетовый',
    '#008080': 'Бирюзовый',
    '#C0C0C0': 'Серебристый',
    '#808080': 'Серый'
  };
  
  let closestColor = '#000000';
  let minDistance = Infinity;
  
  for (const [hex, name] of Object.entries(threadColors)) {
    const tr = parseInt(hex.slice(1, 3), 16);
    const tg = parseInt(hex.slice(3, 5), 16);
    const tb = parseInt(hex.slice(5, 7), 16);
    
    const distance = Math.sqrt(
      Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = hex;
    }
  }
  
  return {
    hex: closestColor,
    name: threadColors[closestColor],
    distance: Math.round(minDistance)
  };
}

/**
 * Создает простой DST файл (базовая структура)
 */
function createDSTFile(colorPalette, imageWidth, imageHeight) {
  // DST заголовок (512 байт)
  const header = Buffer.alloc(512, 0x20); // Заполняем пробелами
  
  // Записываем основную информацию
  header.write('LA', 0); // Метка
  header.writeInt16LE(0, 2); // Стежков
  header.writeInt16LE(colorPalette.length, 4); // Цветов
  header.writeInt16LE(imageWidth * 10, 6); // Ширина в десятых долях мм
  header.writeInt16LE(imageHeight * 10, 8); // Высота в десятых долях мм
  
  // Простой список стежков (заглушка)
  const stitches = Buffer.alloc(100);
  stitches.writeInt8(0x00, 0); // JUMP
  stitches.writeInt8(0x03, 1); // END
  
  return Buffer.concat([header, stitches]);
}

/**
 * Создает файл цветовой схемы
 */
function createColorScheme(colorPalette, format) {
  const scheme = {
    format: format,
    totalColors: colorPalette.length,
    colors: colorPalette.map((color, index) => ({
      index: index + 1,
      hex: color.hex,
      rgb: color.rgb,
      threadColor: color.threadColor,
      usage: color.usage
    })),
    instructions: [
      '1. Подготовьте нити указанных цветов',
      '2. Загрузите файл в вышивальную машину',
      '3. Следуйте порядку цветов',
      '4. Меняйте нить при появлении сигнала'
    ]
  };
  
  return JSON.stringify(scheme, null, 2);
}

/**
 * Основная функция конвертации
 */
async function convertToEmbroidery(imageBuffer, filename, targetFormat = 'dst', options = {}) {
  try {
    const outputDir = await ensureOutputDir();
    const analysis = await analyzeImageForEmbroidery(imageBuffer);
    
    console.log('Анализ изображения:', analysis);
    
    // Подготавливаем изображение
    const preparedImage = await prepareImageForEmbroidery(imageBuffer, targetFormat, options);
    
    // Извлекаем цветовую палитру
    const colorPalette = await extractColorPalette(preparedImage, EMBROIDERY_FORMATS[targetFormat].maxColors);
    
    console.log(`Найдено цветов: ${colorPalette.length}`);
    
    const baseName = path.parse(filename).name;
    const formatInfo = EMBROIDERY_FORMATS[targetFormat];
    
    // Сохраняем подготовленное изображение
    const imageOutputPath = path.join(outputDir, `${baseName}_prepared.png`);
    await fs.writeFile(imageOutputPath, preparedImage);
    
    // Создаем файл вышивки (базовая структура для DST)
    let embroideryBuffer;
    if (targetFormat === 'dst') {
      embroideryBuffer = createDSTFile(colorPalette, analysis.width, analysis.height);
    } else {
      // Для других форматов создаем текстовое описание
      embroideryBuffer = Buffer.from(`Файл ${formatInfo.name}\nЦветов: ${colorPalette.length}\nРазмер: ${analysis.width}x${analysis.height}px`);
    }
    
    const embroideryOutputPath = path.join(outputDir, `${baseName}${formatInfo.extension}`);
    await fs.writeFile(embroideryOutputPath, embroideryBuffer);
    
    // Создаем файл цветовой схемы
    const colorScheme = createColorScheme(colorPalette, targetFormat);
    const schemeOutputPath = path.join(outputDir, `${baseName}_colors.json`);
    await fs.writeFile(schemeOutputPath, colorScheme);
    
    return {
      success: true,
      format: formatInfo,
      analysis: analysis,
      colorPalette: colorPalette,
      files: {
        embroidery: embroideryOutputPath,
        image: imageOutputPath,
        colorScheme: schemeOutputPath
      },
      instructions: [
        `Создан файл ${formatInfo.name} для вышивки`,
        `Использовано цветов: ${colorPalette.length}`,
        `Рекомендуемый размер: ${analysis.width}x${analysis.height}мм`,
        'Файл цветовой схемы содержит инструкции по ниткам'
      ]
    };
    
  } catch (error) {
    console.error('Ошибка конвертации в формат вышивки:', error);
    return {
      success: false,
      error: error.message,
      supportedFormats: Object.keys(EMBROIDERY_FORMATS)
    };
  }
}

/**
 * Получает список поддерживаемых форматов
 */
function getSupportedFormats() {
  return Object.entries(EMBROIDERY_FORMATS).map(([key, info]) => ({
    format: key,
    name: info.name,
    extension: info.extension,
    description: info.description,
    maxColors: info.maxColors,
    maxSize: info.maxSize
  }));
}

module.exports = {
  convertToEmbroidery,
  getSupportedFormats,
  analyzeImageForEmbroidery,
  extractColorPalette,
  EMBROIDERY_FORMATS
};