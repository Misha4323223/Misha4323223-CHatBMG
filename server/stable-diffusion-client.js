/**
 * Клиент для Stable Diffusion WebUI API
 * Обеспечивает генерацию и редактирование изображений локально
 */

import fetch from 'node-fetch';

const SD_API_URL = 'http://127.0.0.1:7860';

/**
 * Проверка доступности Stable Diffusion WebUI
 */
async function checkSDAvailability() {
    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/options`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Генерация изображения через Stable Diffusion
 */
async function generateImage(prompt, options = {}) {
    try {
        const payload = {
            prompt: prompt,
            negative_prompt: options.negative_prompt || "blurry, low quality, distorted",
            width: options.width || 512,
            height: options.height || 512,
            steps: options.steps || 20,
            cfg_scale: options.cfg_scale || 7,
            sampler_index: options.sampler || "Euler a",
            seed: options.seed || -1,
            batch_size: 1,
            n_iter: 1
        };

        const response = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`SD API error: ${response.status}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            images: result.images,
            info: JSON.parse(result.info),
            operation: 'generate'
        };

    } catch (error) {
        console.error('Ошибка генерации SD:', error);
        return {
            success: false,
            error: error.message,
            operation: 'generate'
        };
    }
}

/**
 * Редактирование изображения (img2img)
 */
async function editImage(imageBase64, prompt, options = {}) {
    try {
        const payload = {
            init_images: [imageBase64],
            prompt: prompt,
            negative_prompt: options.negative_prompt || "blurry, low quality, distorted",
            width: options.width || 512,
            height: options.height || 512,
            steps: options.steps || 20,
            cfg_scale: options.cfg_scale || 7,
            denoising_strength: options.denoising_strength || 0.7,
            sampler_index: options.sampler || "Euler a",
            seed: options.seed || -1,
            batch_size: 1,
            n_iter: 1
        };

        const response = await fetch(`${SD_API_URL}/sdapi/v1/img2img`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`SD API error: ${response.status}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            images: result.images,
            info: JSON.parse(result.info),
            operation: 'edit'
        };

    } catch (error) {
        console.error('Ошибка редактирования SD:', error);
        return {
            success: false,
            error: error.message,
            operation: 'edit'
        };
    }
}

/**
 * Inpainting - удаление/замена объектов с маской
 */
async function inpaintImage(imageBase64, maskBase64, prompt, options = {}) {
    try {
        const payload = {
            init_images: [imageBase64],
            mask: maskBase64,
            prompt: prompt,
            negative_prompt: options.negative_prompt || "blurry, low quality, distorted",
            width: options.width || 512,
            height: options.height || 512,
            steps: options.steps || 20,
            cfg_scale: options.cfg_scale || 7,
            denoising_strength: options.denoising_strength || 1.0,
            inpaint_full_res: options.full_res || false,
            inpainting_fill: options.fill_mode || 1, // 1 = fill with image content
            sampler_index: options.sampler || "Euler a",
            seed: options.seed || -1,
            batch_size: 1,
            n_iter: 1
        };

        const response = await fetch(`${SD_API_URL}/sdapi/v1/img2img`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`SD API error: ${response.status}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            images: result.images,
            info: JSON.parse(result.info),
            operation: 'inpaint'
        };

    } catch (error) {
        console.error('Ошибка inpainting SD:', error);
        return {
            success: false,
            error: error.message,
            operation: 'inpaint'
        };
    }
}

/**
 * Получение доступных моделей
 */
async function getModels() {
    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`);
        
        if (!response.ok) {
            throw new Error(`SD API error: ${response.status}`);
        }

        const models = await response.json();
        return {
            success: true,
            models: models
        };

    } catch (error) {
        console.error('Ошибка получения моделей SD:', error);
        return {
            success: false,
            error: error.message,
            models: []
        };
    }
}

/**
 * Конвертация URL изображения в base64
 */
async function imageUrlToBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const buffer = await response.buffer();
        return buffer.toString('base64');
    } catch (error) {
        throw new Error(`Ошибка конвертации изображения: ${error.message}`);
    }
}

/**
 * Сохранение base64 изображения в файл
 */
async function saveBase64Image(base64Data, filename) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const outputDir = './output';
    await fs.mkdir(outputDir, { recursive: true });
    
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, base64Data, 'base64');
    
    return filePath;
}

export {
    checkSDAvailability,
    generateImage,
    editImage,
    inpaintImage,
    getModels,
    imageUrlToBase64,
    saveBase64Image
};