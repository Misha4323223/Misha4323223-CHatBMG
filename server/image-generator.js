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
            () => generateWithReplicateProxy(prompt, style, imageId),
            () => generateWithFalAI(prompt, style, imageId),
            () => generateWithCivitAI(prompt, style, imageId)
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
    
    // Улучшаем промпт для лучших результатов
    const enhancedPrompt = enhancePromptForPollinations(prompt, style);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Используем правильный формат API Pollinations
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}&model=flux&enhance=true`;
    
    console.log('🌸 Запрос к Pollinations:', apiUrl);
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8'
        },
        timeout: 45000
    });
    
    if (response.ok) {
        const imageBuffer = await response.buffer();
        const filename = `pollinations_${imageId}.jpg`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        console.log('✅ Pollinations: изображение сохранено');
        
        return {
            success: true,
            imageUrl: `/generated-images/${filename}`,
            provider: 'Pollinations AI',
            prompt: prompt,
            enhancedPrompt: enhancedPrompt
        };
    }
    
    throw new Error(`Pollinations API недоступен: ${response.status}`);
}

/**
 * Улучшение промпта для Pollinations
 */
function enhancePromptForPollinations(prompt, style) {
    let enhanced = prompt;
    
    // Добавляем стилистические модификаторы
    const styleModifiers = {
        'realistic': 'photorealistic, highly detailed, 8k quality',
        'artistic': 'digital art, artistic style, creative',
        'anime': 'anime style, manga, japanese animation',
        'logo': 'clean logo design, minimalist, professional'
    };
    
    if (styleModifiers[style]) {
        enhanced += `, ${styleModifiers[style]}`;
    }
    
    // Добавляем общие улучшения качества
    enhanced += ', high quality, detailed, beautiful';
    
    return enhanced;
}

/**
 * Генерация через Replicate Proxy (бесплатный)
 */
async function generateWithReplicateProxy(prompt, style, imageId) {
    console.log('🔄 Попытка генерации через Replicate Proxy...');
    
    const enhancedPrompt = enhancePromptForPollinations(prompt, style);
    
    // Используем публичный прокси для Replicate
    const apiUrl = 'https://replicate-api-proxy.glitch.me/predictions';
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BOOOMERANGS-AI-Chat'
        },
        body: JSON.stringify({
            version: 'stability-ai/stable-diffusion',
            input: {
                prompt: enhancedPrompt,
                width: 512,
                height: 512,
                num_inference_steps: 20,
                guidance_scale: 7.5
            }
        }),
        timeout: 40000
    });
    
    if (response.ok) {
        const data = await response.json();
        
        if (data.output && data.output[0]) {
            const imageUrl = data.output[0];
            const filename = `replicate_${imageId}.jpg`;
            const filepath = path.join(IMAGES_DIR, filename);
            
            // Скачиваем изображение
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFileSync(filepath, imageBuffer);
            
            console.log('✅ Replicate Proxy: изображение сохранено');
            
            return {
                success: true,
                imageUrl: `/generated-images/${filename}`,
                provider: 'Replicate Proxy',
                prompt: prompt
            };
        }
    }
    
    throw new Error(`Replicate Proxy недоступен: ${response.status}`);
}

/**
 * Генерация через Fal.AI (бесплатный лимит)
 */
async function generateWithFalAI(prompt, style, imageId) {
    console.log('⚡ Попытка генерации через Fal.AI...');
    
    const enhancedPrompt = enhancePromptForPollinations(prompt, style);
    
    const apiUrl = 'https://fal.run/fal-ai/flux/schnell';
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BOOOMERANGS-AI-Chat'
        },
        body: JSON.stringify({
            prompt: enhancedPrompt,
            image_size: 'square_hd',
            num_inference_steps: 4,
            enable_safety_checker: false
        }),
        timeout: 35000
    });
    
    if (response.ok) {
        const data = await response.json();
        
        if (data.images && data.images[0] && data.images[0].url) {
            const imageUrl = data.images[0].url;
            const filename = `fal_${imageId}.jpg`;
            const filepath = path.join(IMAGES_DIR, filename);
            
            // Скачиваем изображение
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFileSync(filepath, imageBuffer);
            
            console.log('✅ Fal.AI: изображение сохранено');
            
            return {
                success: true,
                imageUrl: `/generated-images/${filename}`,
                provider: 'Fal.AI',
                prompt: prompt
            };
        }
    }
    
    throw new Error(`Fal.AI недоступен: ${response.status}`);
}

/**
 * Генерация через CivitAI (бесплатный)
 */
async function generateWithCivitAI(prompt, style, imageId) {
    console.log('🎨 Попытка генерации через CivitAI...');
    
    const enhancedPrompt = enhancePromptForPollinations(prompt, style);
    
    // Используем публичный API CivitAI
    const apiUrl = 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/generate';
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BOOOMERANGS-AI-Chat'
        },
        body: JSON.stringify({
            prompt: enhancedPrompt,
            width: 512,
            height: 512,
            steps: 20,
            cfg_scale: 7,
            seed: Math.floor(Math.random() * 1000000)
        }),
        timeout: 40000
    });
    
    if (response.ok) {
        const data = await response.json();
        
        if (data.url) {
            const filename = `civitai_${imageId}.jpg`;
            const filepath = path.join(IMAGES_DIR, filename);
            
            // Скачиваем изображение
            const imageResponse = await fetch(data.url);
            const imageBuffer = await imageResponse.buffer();
            fs.writeFileSync(filepath, imageBuffer);
            
            console.log('✅ CivitAI: изображение сохранено');
            
            return {
                success: true,
                imageUrl: `/generated-images/${filename}`,
                provider: 'CivitAI',
                prompt: prompt
            };
        }
    }
    
    throw new Error(`CivitAI недоступен: ${response.status}`);
}



/**
 * Создание заглушки изображения с красивым дизайном
 */
function generatePlaceholderImage(prompt, imageId) {
    console.log('🖼️ Создание заглушки изображения...');
    
    const filename = `placeholder_${imageId}.svg`;
    const filepath = path.join(IMAGES_DIR, filename);
    
    // Определяем тематическую иконку и цвета на основе промпта
    const themeData = getThemeForPrompt(prompt);
    
    // Создаем красивую SVG заглушку в стиле BOOOMERANGS
    const svg = `
        <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${themeData.color1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${themeData.color2};stop-opacity:1" />
                </linearGradient>
                <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${themeData.color1};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${themeData.color1};stop-opacity:0" />
                </radialGradient>
            </defs>
            
            <rect width="512" height="512" fill="url(#bgGradient)" rx="20"/>
            
            <!-- Фоновые декоративные элементы -->
            <circle cx="100" cy="100" r="40" fill="url(#glowGradient)"/>
            <circle cx="412" cy="400" r="60" fill="url(#glowGradient)"/>
            <circle cx="400" cy="120" r="30" fill="url(#glowGradient)"/>
            <circle cx="120" cy="400" r="50" fill="url(#glowGradient)"/>
            
            <!-- Центральная область -->
            <circle cx="256" cy="200" r="50" fill="url(#accentGradient)" opacity="0.8"/>
            <circle cx="256" cy="200" r="35" fill="url(#bgGradient)"/>
            <text x="256" y="215" text-anchor="middle" fill="url(#accentGradient)" font-size="32" font-weight="bold">${themeData.icon}</text>
            
            <!-- Заголовок -->
            <text x="256" y="290" text-anchor="middle" fill="#e5e7eb" font-size="22" font-weight="bold" font-family="Arial, sans-serif">
                🪃 BOOOMERANGS AI
            </text>
            
            <!-- Тематический заголовок -->
            <text x="256" y="320" text-anchor="middle" fill="url(#accentGradient)" font-size="16" font-family="Arial, sans-serif" font-weight="bold">
                ${themeData.title}
            </text>
            
            <!-- Промпт -->
            <text x="256" y="360" text-anchor="middle" fill="#9ca3af" font-size="13" font-family="Arial, sans-serif">
                "${prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}"
            </text>
            
            <!-- Статус с анимацией -->
            <text x="256" y="400" text-anchor="middle" fill="#6b7280" font-size="11" font-family="Arial, sans-serif">
                ✨ Генерация изображений будет улучшена в ближайших обновлениях
            </text>
            
            <!-- Декоративная рамка -->
            <rect x="15" y="15" width="482" height="482" fill="none" stroke="url(#accentGradient)" stroke-width="2" rx="18" opacity="0.4"/>
            
            <!-- Угловые декоративные элементы -->
            <path d="M40 40 L60 40 L60 60" stroke="url(#accentGradient)" stroke-width="3" fill="none" opacity="0.6"/>
            <path d="M452 40 L472 40 L472 60" stroke="url(#accentGradient)" stroke-width="3" fill="none" opacity="0.6"/>
            <path d="M40 452 L60 452 L60 472" stroke="url(#accentGradient)" stroke-width="3" fill="none" opacity="0.6"/>
            <path d="M452 452 L472 452 L472 472" stroke="url(#accentGradient)" stroke-width="3" fill="none" opacity="0.6"/>
        </svg>
    `;
    
    fs.writeFileSync(filepath, svg);
    
    return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        provider: 'BOOOMERANGS Preview Generator',
        prompt: prompt,
        isPlaceholder: true,
        theme: themeData.title
    };
}

/**
 * Определение темы и визуального стиля на основе промпта
 */
function getThemeForPrompt(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Самурай/боевая тематика
    if (lowerPrompt.includes('самурай') || lowerPrompt.includes('воин') || lowerPrompt.includes('техно')) {
        return {
            icon: '⚔️',
            title: 'Кибер-Самурай',
            color1: '#dc2626',
            color2: '#f59e0b'
        };
    }
    
    // Космическая тематика
    if (lowerPrompt.includes('космос') || lowerPrompt.includes('звезд') || lowerPrompt.includes('планет')) {
        return {
            icon: '🚀',
            title: 'Космическое Путешествие',
            color1: '#3b82f6',
            color2: '#8b5cf6'
        };
    }
    
    // Природа
    if (lowerPrompt.includes('лес') || lowerPrompt.includes('гор') || lowerPrompt.includes('море') || lowerPrompt.includes('закат')) {
        return {
            icon: '🌅',
            title: 'Природные Пейзажи',
            color1: '#10b981',
            color2: '#f59e0b'
        };
    }
    
    // Животные
    if (lowerPrompt.includes('кот') || lowerPrompt.includes('собак') || lowerPrompt.includes('птиц')) {
        return {
            icon: '🐾',
            title: 'Мир Животных',
            color1: '#f59e0b',
            color2: '#10b981'
        };
    }
    
    // Город/архитектура
    if (lowerPrompt.includes('город') || lowerPrompt.includes('здани') || lowerPrompt.includes('футурист')) {
        return {
            icon: '🏙️',
            title: 'Городские Пейзажи',
            color1: '#6366f1',
            color2: '#ec4899'
        };
    }
    
    // Фантастика
    if (lowerPrompt.includes('дракон') || lowerPrompt.includes('волшебн') || lowerPrompt.includes('магич')) {
        return {
            icon: '🐉',
            title: 'Фантастические Миры',
            color1: '#8b5cf6',
            color2: '#ec4899'
        };
    }
    
    // Логотипы/бизнес
    if (lowerPrompt.includes('логотип') || lowerPrompt.includes('компани') || lowerPrompt.includes('бренд')) {
        return {
            icon: '💼',
            title: 'Корпоративный Дизайн',
            color1: '#dc2626',
            color2: '#1f2937'
        };
    }
    
    // По умолчанию - творческая тематика
    return {
        icon: '🎨',
        title: 'Творческое Воображение',
        color1: '#dc2626',
        color2: '#f87171'
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