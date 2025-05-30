/**
 * Генератор изображений через Hugging Face API
 * Использует модели Stable Diffusion на платформе Hugging Face
 */

import fetch from 'node-fetch';

/**
 * Генерация изображения через Hugging Face Inference API
 * @param {string} prompt - Текстовый запрос
 * @param {string} model - Модель для генерации (по умолчанию stable-diffusion)
 * @returns {Promise<Object>} Результат генерации
 */
async function generateImageWithHuggingFace(prompt, model = 'runwayml/stable-diffusion-v1-5') {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
        throw new Error('HUGGINGFACE_API_KEY не найден в переменных окружения');
    }

    try {
        console.log(`🤗 [HuggingFace] Генерируем изображение с моделью: ${model}`);
        console.log(`📝 [HuggingFace] Промпт: ${prompt}`);

        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    width: 512,
                    height: 512
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка API Hugging Face: ${response.status} - ${errorText}`);
        }

        // Получаем изображение как Buffer
        const imageBuffer = await response.buffer();
        
        // Сохраняем изображение
        const fs = await import('fs');
        const path = await import('path');
        
        const imageId = Date.now();
        const filename = `hf_generated_${imageId}.png`;
        const filepath = path.join(process.cwd(), 'public', 'generated', filename);
        
        // Создаем папку если не существует
        const outputDir = path.dirname(filepath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, imageBuffer);
        
        const imageUrl = `/generated/${filename}`;
        
        console.log(`✅ [HuggingFace] Изображение сохранено: ${imageUrl}`);
        
        return {
            success: true,
            imageUrl: imageUrl,
            provider: 'HuggingFace',
            model: model,
            filename: filename
        };

    } catch (error) {
        console.error(`❌ [HuggingFace] Ошибка генерации:`, error.message);
        return {
            success: false,
            error: error.message,
            provider: 'HuggingFace'
        };
    }
}

/**
 * Список доступных моделей Stable Diffusion на Hugging Face
 */
const AVAILABLE_MODELS = [
    'runwayml/stable-diffusion-v1-5',
    'stabilityai/stable-diffusion-2-1',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'CompVis/stable-diffusion-v1-4'
];

/**
 * Получение информации о доступных моделях
 */
function getAvailableModels() {
    return AVAILABLE_MODELS;
}

/**
 * Проверка доступности Hugging Face API
 */
async function checkHuggingFaceAvailability() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
        return {
            available: false,
            reason: 'HUGGINGFACE_API_KEY не настроен'
        };
    }

    try {
        const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        return {
            available: response.ok,
            reason: response.ok ? 'API доступен' : `Ошибка: ${response.status}`
        };
    } catch (error) {
        return {
            available: false,
            reason: `Ошибка подключения: ${error.message}`
        };
    }
}

export {
    generateImageWithHuggingFace,
    getAvailableModels,
    checkHuggingFaceAvailability
};