/**
 * Библиотека полностью бесплатных генераторов изображений
 * Работает без API ключей и регистрации
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Директория для сохранения изображений
const IMAGES_DIR = path.join(__dirname, '../public/generated-images');

// Убедимся, что директория существует
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Генерация уникального ID для изображения
 */
function generateImageId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Улучшение промпта для лучших результатов
 */
function enhancePrompt(prompt, style = 'realistic') {
    const styleEnhancements = {
        realistic: 'photorealistic, high quality, detailed, 4k resolution',
        artistic: 'artistic, beautiful, creative, masterpiece',
        anime: 'anime style, manga, japanese art, colorful',
        cyberpunk: 'cyberpunk, neon lights, futuristic, dark atmosphere',
        fantasy: 'fantasy art, magical, epic, detailed fantasy world'
    };
    
    const enhancement = styleEnhancements[style] || styleEnhancements.realistic;
    return `${prompt}, ${enhancement}`;
}

/**
 * 1. Pollinations AI - самый надежный бесплатный генератор
 */
async function generateWithPollinations(prompt, style, imageId) {
    console.log('🌸 Генерация через Pollinations AI...');
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Pollinations предоставляет прямой URL для генерации
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'BOOOMERANGS-AI-Chat/1.0'
            }
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
                prompt: prompt
            };
        }
        
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.log('❌ Pollinations недоступен:', error.message);
        throw error;
    }
}

/**
 * 2. Craiyon (бывший DALL-E mini) - бесплатный генератор
 */
async function generateWithCraiyon(prompt, style, imageId) {
    console.log('🎨 Генерация через Craiyon...');
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    try {
        const response = await fetch('https://backend.craiyon.com/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'BOOOMERANGS-AI-Chat/1.0'
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                model: 'art',
                negative_prompt: 'blurry, low quality, distorted'
            }),
            timeout: 45000
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.images && data.images.length > 0) {
                // Craiyon возвращает base64 изображения
                const base64Image = data.images[0];
                const imageBuffer = Buffer.from(base64Image, 'base64');
                
                const filename = `craiyon_${imageId}.jpg`;
                const filepath = path.join(IMAGES_DIR, filename);
                
                fs.writeFileSync(filepath, imageBuffer);
                console.log('✅ Craiyon: изображение сохранено');
                
                return {
                    success: true,
                    imageUrl: `/generated-images/${filename}`,
                    provider: 'Craiyon',
                    prompt: prompt
                };
            }
        }
        
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.log('❌ Craiyon недоступен:', error.message);
        throw error;
    }
}

/**
 * 3. DeepAI - бесплатный лимит без ключа
 */
async function generateWithDeepAI(prompt, style, imageId) {
    console.log('🧠 Генерация через DeepAI...');
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    try {
        const response = await fetch('https://api.deepai.org/api/text2img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'BOOOMERANGS-AI-Chat/1.0'
            },
            body: `text=${encodeURIComponent(enhancedPrompt)}`,
            timeout: 35000
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.output_url) {
                // Скачиваем изображение по URL
                const imageResponse = await fetch(data.output_url);
                const imageBuffer = await imageResponse.buffer();
                
                const filename = `deepai_${imageId}.jpg`;
                const filepath = path.join(IMAGES_DIR, filename);
                
                fs.writeFileSync(filepath, imageBuffer);
                console.log('✅ DeepAI: изображение сохранено');
                
                return {
                    success: true,
                    imageUrl: `/generated-images/${filename}`,
                    provider: 'DeepAI',
                    prompt: prompt
                };
            }
        }
        
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.log('❌ DeepAI недоступен:', error.message);
        throw error;
    }
}

/**
 * 4. Stable Diffusion через публичные API
 */
async function generateWithStableDiffusionAPI(prompt, style, imageId) {
    console.log('🎭 Генерация через Stable Diffusion API...');
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    // Используем публичный API endpoint
    const endpoints = [
        'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image',
        'https://stablediffusionapi.com/api/v3/text2img'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'BOOOMERANGS-AI-Chat/1.0'
                },
                body: JSON.stringify({
                    text_prompts: [{ text: enhancedPrompt }],
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    samples: 1,
                    steps: 20
                }),
                timeout: 40000
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Обрабатываем разные форматы ответов
                let imageData = null;
                if (data.artifacts && data.artifacts[0]) {
                    imageData = data.artifacts[0].base64;
                } else if (data.output && data.output[0]) {
                    imageData = data.output[0];
                }
                
                if (imageData) {
                    const imageBuffer = Buffer.from(imageData, 'base64');
                    const filename = `stable_${imageId}.jpg`;
                    const filepath = path.join(IMAGES_DIR, filename);
                    
                    fs.writeFileSync(filepath, imageBuffer);
                    console.log('✅ Stable Diffusion: изображение сохранено');
                    
                    return {
                        success: true,
                        imageUrl: `/generated-images/${filename}`,
                        provider: 'Stable Diffusion API',
                        prompt: prompt
                    };
                }
            }
        } catch (error) {
            console.log(`❌ ${endpoint} недоступен:`, error.message);
            continue;
        }
    }
    
    throw new Error('Все Stable Diffusion API недоступны');
}

/**
 * Основная функция генерации изображений
 * Пробует все доступные бесплатные генераторы по очереди
 */
async function generateFreeImage(prompt, style = 'realistic') {
    const imageId = generateImageId();
    
    console.log(`🎨 Начинаем генерацию: "${prompt}" в стиле "${style}"`);
    
    // Список бесплатных генераторов в порядке приоритета
    const generators = [
        () => generateWithPollinations(prompt, style, imageId),
        () => generateWithCraiyon(prompt, style, imageId),
        () => generateWithDeepAI(prompt, style, imageId),
        () => generateWithStableDiffusionAPI(prompt, style, imageId)
    ];
    
    let lastError = null;
    
    for (let i = 0; i < generators.length; i++) {
        try {
            console.log(`🔄 Попытка ${i + 1}/${generators.length}`);
            const result = await generators[i]();
            
            if (result.success) {
                console.log(`✅ Успешно сгенерировано через ${result.provider}`);
                return result;
            }
        } catch (error) {
            lastError = error;
            console.log(`❌ Генератор ${i + 1} не сработал:`, error.message);
            
            // Небольшая задержка перед следующей попыткой
            if (i < generators.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    // Если все генераторы не сработали, возвращаем ошибку
    throw new Error(`Не удалось сгенерировать изображение: ${lastError?.message || 'Все сервисы недоступны'}`);
}

/**
 * Проверка доступности бесплатных генераторов
 */
async function checkFreeGeneratorsStatus() {
    const results = {
        pollinations: false,
        craiyon: false,
        deepai: false,
        stable: false
    };
    
    // Проверяем Pollinations
    try {
        const response = await fetch('https://image.pollinations.ai/prompt/test?width=64&height=64', {
            method: 'GET',
            timeout: 5000
        });
        results.pollinations = response.ok;
    } catch (error) {
        results.pollinations = false;
    }
    
    // Проверяем Craiyon
    try {
        const response = await fetch('https://backend.craiyon.com/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'test' }),
            timeout: 5000
        });
        results.craiyon = response.status !== 404;
    } catch (error) {
        results.craiyon = false;
    }
    
    // Проверяем DeepAI
    try {
        const response = await fetch('https://api.deepai.org/api/text2img', {
            method: 'POST',
            timeout: 5000
        });
        results.deepai = response.status !== 404;
    } catch (error) {
        results.deepai = false;
    }
    
    return results;
}

module.exports = {
    generateFreeImage,
    checkFreeGeneratorsStatus,
    generateWithPollinations,
    generateWithCraiyon,
    generateWithDeepAI,
    generateWithStableDiffusionAPI
};