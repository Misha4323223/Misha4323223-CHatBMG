/**
 * Анализатор изображений для BOOOMERANGS AI Chat
 * Предоставляет возможности анализа изображений без внешних API
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Анализ изображения с извлечением базовой информации
 */
async function analyzeImage(imagePath, originalName) {
    try {
        console.log('🖼️ Начало анализа изображения:', originalName);
        
        // Получаем метаданные изображения
        const metadata = await sharp(imagePath).metadata();
        
        // Базовый анализ цвета
        const colorAnalysis = await analyzeColors(imagePath);
        
        // Анализ композиции
        const compositionAnalysis = analyzeComposition(metadata);
        
        // Определение типа контента
        const contentType = determineContentType(originalName, metadata);
        
        // Генерируем описание
        const description = generateDescription({
            metadata,
            colorAnalysis,
            compositionAnalysis,
            contentType,
            filename: originalName
        });
        
        console.log('✅ Анализ изображения завершен');
        
        return {
            success: true,
            description,
            details: {
                size: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format
                },
                colors: colorAnalysis,
                composition: compositionAnalysis,
                contentType
            }
        };
        
    } catch (error) {
        console.error('❌ Ошибка анализа изображения:', error);
        return {
            success: false,
            description: 'Не удалось проанализировать изображение. Возможно, файл поврежден или имеет неподдерживаемый формат.',
            error: error.message
        };
    }
}

/**
 * Анализ цветовой палитры изображения
 */
async function analyzeColors(imagePath) {
    try {
        const { dominant } = await sharp(imagePath)
            .resize(50, 50)
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        // Простейший анализ доминирующих цветов
        const colors = [];
        const buffer = dominant;
        
        // Анализируем каждый 10-й пиксель для скорости
        for (let i = 0; i < buffer.length; i += 30) {
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];
            
            if (r !== undefined && g !== undefined && b !== undefined) {
                colors.push({ r, g, b });
            }
        }
        
        // Определяем доминирующую цветовую гамму
        const colorScheme = determineColorScheme(colors);
        
        return {
            scheme: colorScheme,
            dominantColors: colors.slice(0, 5) // Первые 5 цветов
        };
        
    } catch (error) {
        console.log('⚠️ Упрощенный анализ цветов');
        return {
            scheme: 'разнообразная',
            dominantColors: []
        };
    }
}

/**
 * Определение цветовой схемы
 */
function determineColorScheme(colors) {
    if (colors.length === 0) return 'неопределенная';
    
    const avgBrightness = colors.reduce((sum, color) => 
        sum + (color.r + color.g + color.b) / 3, 0) / colors.length;
    
    if (avgBrightness > 200) return 'светлая';
    if (avgBrightness < 80) return 'темная';
    
    // Проверяем на монохромность
    const isMonochrome = colors.every(color => 
        Math.abs(color.r - color.g) < 30 && 
        Math.abs(color.g - color.b) < 30
    );
    
    if (isMonochrome) return 'монохромная';
    
    return 'цветная';
}

/**
 * Анализ композиции изображения
 */
function analyzeComposition(metadata) {
    const { width, height } = metadata;
    const aspectRatio = width / height;
    
    let orientation;
    if (aspectRatio > 1.3) {
        orientation = 'горизонтальная';
    } else if (aspectRatio < 0.7) {
        orientation = 'вертикальная';
    } else {
        orientation = 'квадратная';
    }
    
    let format;
    if (width > 1920 || height > 1920) {
        format = 'высокое разрешение';
    } else if (width < 500 || height < 500) {
        format = 'низкое разрешение';
    } else {
        format = 'среднее разрешение';
    }
    
    return {
        orientation,
        format,
        aspectRatio: Math.round(aspectRatio * 100) / 100
    };
}

/**
 * Определение типа контента по имени файла и метаданным
 */
function determineContentType(filename, metadata) {
    const name = filename.toLowerCase();
    
    if (name.includes('screenshot') || name.includes('снимок')) {
        return 'скриншот';
    }
    
    if (name.includes('photo') || name.includes('фото') || name.includes('img')) {
        return 'фотография';
    }
    
    if (name.includes('diagram') || name.includes('chart') || name.includes('график')) {
        return 'диаграмма';
    }
    
    if (name.includes('logo') || name.includes('логотип')) {
        return 'логотип';
    }
    
    // Анализ по соотношению сторон
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio > 2 || aspectRatio < 0.5) {
        return 'баннер или специальный формат';
    }
    
    return 'изображение';
}

/**
 * Генерация описания изображения
 */
function generateDescription({ metadata, colorAnalysis, compositionAnalysis, contentType, filename }) {
    const { width, height, format } = metadata;
    const { scheme } = colorAnalysis;
    const { orientation, format: resolutionFormat } = compositionAnalysis;
    
    let description = `📸 Анализ изображения "${filename}":\n\n`;
    
    description += `🔍 **Основные характеристики:**\n`;
    description += `• Тип: ${contentType}\n`;
    description += `• Размер: ${width}×${height} пикселей\n`;
    description += `• Формат: ${format.toUpperCase()}\n`;
    description += `• Ориентация: ${orientation}\n`;
    description += `• Качество: ${resolutionFormat}\n\n`;
    
    description += `🎨 **Цветовая гамма:**\n`;
    description += `• Цветовая схема: ${scheme}\n\n`;
    
    description += `📐 **Композиция:**\n`;
    description += `• Соотношение сторон: ${compositionAnalysis.aspectRatio}:1\n`;
    
    // Добавляем рекомендации на основе анализа
    description += `\n💡 **Рекомендации:**\n`;
    
    if (resolutionFormat === 'высокое разрешение') {
        description += `• Изображение отличного качества, подходит для печати\n`;
    } else if (resolutionFormat === 'низкое разрешение') {
        description += `• Изображение подходит для веб-использования\n`;
    }
    
    if (scheme === 'темная') {
        description += `• Темная цветовая гамма создает драматичный эффект\n`;
    } else if (scheme === 'светлая') {
        description += `• Светлая гамма создает легкое и воздушное впечатление\n`;
    }
    
    if (contentType === 'скриншот') {
        description += `• Это скриншот - возможно, содержит интерфейс или текст\n`;
    }
    
    return description;
}

/**
 * Очистка временных файлов
 */
function cleanupTempFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Временный файл удален:', filePath);
        }
    } catch (error) {
        console.warn('⚠️ Не удалось удалить временный файл:', error.message);
    }
}

export {
    analyzeImage,
    cleanupTempFile
};