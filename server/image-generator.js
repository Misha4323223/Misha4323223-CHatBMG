/**
 * Генератор изображений для BOOOMERANGS AI Chat
 * Использует различные бесплатные API для создания изображений
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Создаем папку для сохранения сгенерированных изображений
const IMAGES_DIR = path.join(process.cwd(), 'public', 'generated-images');
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Генерация изображения по текстовому описанию
 */
async function generateImage(prompt, style = 'realistic') {
    console.log('🎨 Начало генерации изображения:', prompt);
    
    const imageId = generateUniqueId();
    
    try {
        // Пробуем различные бесплатные API для генерации изображений
        const providers = [
            () => generateWithPollinations(prompt, style, imageId),
            () => generateWithProdia(prompt, style, imageId),
            () => generateWithStableDiffusion(prompt, style, imageId)
        ];
        
        for (const provider of providers) {
            try {
                const result = await provider();
                if (result.success) {
                    console.log('✅ Изображение успешно сгенерировано:', result.imageUrl);
                    return result;
                }
            } catch (error) {
                console.log('⚠️ Провайдер недоступен, пробуем следующий...');
                continue;
            }
        }
        
        // Если все провайдеры не работают, создаем заглушку
        return generatePlaceholderImage(prompt, imageId);
        
    } catch (error) {
        console.error('❌ Ошибка генерации изображения:', error);
        return {
            success: false,
            error: 'Не удалось сгенерировать изображение. Попробуйте еще раз.'
        };
    }
}

/**
 * Генерация через Pollinations AI (бесплатный API)
 */
async function generateWithPollinations(prompt, style, imageId) {
    console.log('🌸 Попытка генерации через Pollinations...');
    
    const encodedPrompt = encodeURIComponent(prompt);
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}`;
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        timeout: 30000
    });
    
    if (response.ok) {
        const imageBuffer = await response.buffer();
        const filename = `pollinations_${imageId}.png`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        return {
            success: true,
            imageUrl: `/generated-images/${filename}`,
            provider: 'Pollinations AI',
            prompt: prompt
        };
    }
    
    throw new Error('Pollinations API недоступен');
}

/**
 * Генерация через Prodia (альтернативный бесплатный API)
 */
async function generateWithProdia(prompt, style, imageId) {
    console.log('🚀 Попытка генерации через Prodia...');
    
    // Prodia требует особого форматирования промпта
    const formattedPrompt = `${prompt}, ${style} style, high quality, detailed`;
    
    const apiUrl = 'https://api.prodia.com/v1/sd/generate';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: formattedPrompt,
            model: 'sd_xl_base_1.0.safetensors',
            steps: 20,
            cfg_scale: 7,
            seed: Math.floor(Math.random() * 1000000),
            width: 512,
            height: 512
        }),
        timeout: 30000
    });
    
    if (response.ok) {
        const data = await response.json();
        
        if (data.job) {
            // Ждем завершения генерации
            const imageUrl = await waitForProdiaCompletion(data.job);
            
            if (imageUrl) {
                const filename = `prodia_${imageId}.png`;
                const filepath = path.join(IMAGES_DIR, filename);
                
                // Скачиваем сгенерированное изображение
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.buffer();
                fs.writeFileSync(filepath, imageBuffer);
                
                return {
                    success: true,
                    imageUrl: `/generated-images/${filename}`,
                    provider: 'Prodia',
                    prompt: prompt
                };
            }
        }
    }
    
    throw new Error('Prodia API недоступен');
}

/**
 * Ожидание завершения генерации в Prodia
 */
async function waitForProdiaCompletion(jobId) {
    for (let i = 0; i < 30; i++) { // Ждем максимум 30 секунд
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
            const response = await fetch(`https://api.prodia.com/v1/job/${jobId}`);
            const data = await response.json();
            
            if (data.status === 'succeeded' && data.imageUrl) {
                return data.imageUrl;
            }
            
            if (data.status === 'failed') {
                throw new Error('Генерация не удалась');
            }
        } catch (error) {
            console.log('⏳ Ожидание завершения генерации...');
        }
    }
    
    return null;
}

/**
 * Генерация через Stable Diffusion (резервный вариант)
 */
async function generateWithStableDiffusion(prompt, style, imageId) {
    console.log('🎭 Попытка генерации через Stable Diffusion...');
    
    // Это заглушка для возможного будущего API
    throw new Error('Stable Diffusion API временно недоступен');
}

/**
 * Создание заглушки изображения с красивым дизайном
 */
function generatePlaceholderImage(prompt, imageId) {
    console.log('🖼️ Создание заглушки изображения...');
    
    const filename = `placeholder_${imageId}.svg`;
    const filepath = path.join(IMAGES_DIR, filename);
    
    // Создаем красивую SVG заглушку в стиле BOOOMERANGS
    const svg = `
        <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f87171;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <rect width="512" height="512" fill="url(#bgGradient)" rx="20"/>
            
            <!-- Декоративные элементы -->
            <circle cx="128" cy="128" r="60" fill="url(#accentGradient)" opacity="0.1"/>
            <circle cx="384" cy="384" r="80" fill="url(#accentGradient)" opacity="0.1"/>
            
            <!-- Центральная иконка -->
            <circle cx="256" cy="200" r="40" fill="url(#accentGradient)"/>
            <text x="256" y="210" text-anchor="middle" fill="white" font-size="24" font-weight="bold">🎨</text>
            
            <!-- Заголовок -->
            <text x="256" y="280" text-anchor="middle" fill="#e5e7eb" font-size="24" font-weight="bold" font-family="Arial, sans-serif">
                BOOOMERANGS AI
            </text>
            
            <!-- Подзаголовок -->
            <text x="256" y="310" text-anchor="middle" fill="#9ca3af" font-size="16" font-family="Arial, sans-serif">
                Генерация изображений
            </text>
            
            <!-- Промпт (обрезанный) -->
            <text x="256" y="350" text-anchor="middle" fill="#6b7280" font-size="14" font-family="Arial, sans-serif">
                "${prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}"
            </text>
            
            <!-- Статус -->
            <text x="256" y="420" text-anchor="middle" fill="#dc2626" font-size="12" font-family="Arial, sans-serif">
                Функция будет улучшена в следующих версиях
            </text>
            
            <!-- Декоративная рамка -->
            <rect x="20" y="20" width="472" height="472" fill="none" stroke="url(#accentGradient)" stroke-width="2" rx="15" opacity="0.3"/>
        </svg>
    `;
    
    fs.writeFileSync(filepath, svg);
    
    return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        provider: 'BOOOMERANGS Placeholder',
        prompt: prompt,
        isPlaceholder: true
    };
}

/**
 * Генерация уникального ID для изображения
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Определение стиля изображения по ключевым словам
 */
function detectImageStyle(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('реалистич') || lowerPrompt.includes('фото')) {
        return 'realistic';
    }
    
    if (lowerPrompt.includes('аниме') || lowerPrompt.includes('мульт')) {
        return 'anime';
    }
    
    if (lowerPrompt.includes('арт') || lowerPrompt.includes('рисунок')) {
        return 'artistic';
    }
    
    if (lowerPrompt.includes('логотип') || lowerPrompt.includes('иконка')) {
        return 'logo';
    }
    
    return 'realistic';
}

/**
 * Очистка старых сгенерированных изображений
 */
function cleanupOldImages() {
    try {
        const files = fs.readdirSync(IMAGES_DIR);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа
        
        files.forEach(file => {
            const filepath = path.join(IMAGES_DIR, file);
            const stats = fs.statSync(filepath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filepath);
                console.log('🗑️ Удален старый файл изображения:', file);
            }
        });
    } catch (error) {
        console.warn('⚠️ Ошибка при очистке старых изображений:', error.message);
    }
}

// Запускаем очистку каждые 6 часов
setInterval(cleanupOldImages, 6 * 60 * 60 * 1000);

module.exports = {
    generateImage,
    detectImageStyle,
    cleanupOldImages
};