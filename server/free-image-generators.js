/**
 * Библиотека полностью бесплатных генераторов изображений
 * Работает без API ключей и регистрации
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * 1. Pollinations AI - обновленная версия с обходом блокировок
 */
async function generateWithPollinations(prompt, style, imageId) {
    console.log('🌸 Генерация через Pollinations AI...');
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    // Используем несколько endpoints Pollinations
    const endpoints = [
        `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`,
        `https://pollinations.ai/p/${encodedPrompt}?width=512&height=512`,
        `https://image.pollinations.ai/prompt/${encodedPrompt}`
    ];
    
    for (const apiUrl of endpoints) {
        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                timeout: 25000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Referer': 'https://pollinations.ai/'
                }
            });
            
            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                const imageBuffer = await response.arrayBuffer();
                const filename = `pollinations_${imageId}.jpg`;
                const filepath = path.join(IMAGES_DIR, filename);
                
                fs.writeFileSync(filepath, Buffer.from(imageBuffer));
                console.log('✅ Pollinations: изображение сохранено');
                
                return {
                    success: true,
                    imageUrl: `/generated-images/${filename}`,
                    provider: 'Pollinations AI',
                    prompt: prompt
                };
            }
        } catch (error) {
            console.log(`❌ Pollinations endpoint недоступен: ${error.message}`);
            continue;
        }
    }
    
    throw new Error('Все Pollinations endpoints недоступны');
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
 * Альтернативный метод через Hugging Face (работает с ключом)
 */
async function generateWithHuggingFace(prompt, style, imageId) {
    console.log('🤗 Генерация через Hugging Face...');
    
    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY не найден');
    }
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: enhancedPrompt,
            parameters: {
                width: 512,
                height: 512
            }
        }),
        timeout: 30000
    });
    
    if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        const filename = `huggingface_${imageId}.jpg`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        fs.writeFileSync(filepath, Buffer.from(imageBuffer));
        console.log('✅ Hugging Face: изображение сохранено');
        
        return {
            success: true,
            imageUrl: `/generated-images/${filename}`,
            provider: 'Hugging Face',
            prompt: prompt
        };
    }
    
    throw new Error(`Hugging Face API недоступен: ${response.status}`);
}

/**
 * Генерация через Replicate (работает с ключом)
 */
async function generateWithReplicate(prompt, style, imageId) {
    console.log('🔄 Генерация через Replicate...');
    
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN не найден');
    }
    
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e57',
            input: {
                prompt: enhancedPrompt,
                width: 512,
                height: 512,
                num_inference_steps: 20
            }
        }),
        timeout: 60000
    });
    
    if (response.ok) {
        const prediction = await response.json();
        
        // Ждем завершения генерации
        let result = prediction;
        while (result.status === 'starting' || result.status === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: {
                    'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
                }
            });
            
            result = await statusResponse.json();
        }
        
        if (result.status === 'succeeded' && result.output && result.output[0]) {
            const imageUrl = result.output[0];
            const filename = `replicate_${imageId}.jpg`;
            const filepath = path.join(IMAGES_DIR, filename);
            
            // Скачиваем изображение
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            fs.writeFileSync(filepath, Buffer.from(imageBuffer));
            
            console.log('✅ Replicate: изображение сохранено');
            
            return {
                success: true,
                imageUrl: `/generated-images/${filename}`,
                provider: 'Replicate',
                prompt: prompt
            };
        }
    }
    
    throw new Error(`Replicate API недоступен: ${response.status}`);
}

/**
 * Основная функция генерации изображений
 * Использует только проверенные рабочие API сервисы
 */
async function generateFreeImage(prompt, style = 'realistic') {
    const imageId = generateImageId();
    
    console.log(`🎨 Начинаем генерацию: "${prompt}" в стиле "${style}"`);
    
    // Список рабочих генераторов в порядке приоритета
    const generators = [];
    
    // Проверяем наличие API ключей и добавляем соответствующие генераторы
    if (process.env.HUGGINGFACE_API_KEY) {
        generators.push(() => generateWithHuggingFace(prompt, style, imageId));
    }
    
    if (process.env.REPLICATE_API_TOKEN) {
        generators.push(() => generateWithReplicate(prompt, style, imageId));
    }
    
    // Добавляем Pollinations как резервный вариант
    generators.push(() => generateWithPollinations(prompt, style, imageId));
    
    if (generators.length === 0) {
        throw new Error('Нет доступных API для генерации изображений. Требуются HUGGINGFACE_API_KEY или REPLICATE_API_TOKEN');
    }
    
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

export {
    generateFreeImage,
    checkFreeGeneratorsStatus,
    generateWithPollinations,
    generateWithCraiyon,
    generateWithDeepAI,
    generateWithStableDiffusionAPI
};