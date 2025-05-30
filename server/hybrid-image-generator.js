/**
 * Гибридная система генерации изображений
 * Приоритет: SD WebUI -> Pollinations.ai
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { sdClient } from './sd-webui-client.js';

/**
 * Основная функция генерации изображений
 */
async function generateImage(prompt, style = 'realistic', previousImage = null, sessionId = null, userId = null) {
    console.log('🎨 [HYBRID] Запуск гибридной генерации изображений...');
    console.log('📝 [HYBRID] Промпт:', prompt);
    
    // Сначала пробуем SD WebUI
    const sdAvailable = await sdClient.checkAvailability();
    
    if (sdAvailable) {
        console.log('✅ [HYBRID] SD WebUI доступен, используем его');
        
        try {
            const result = await sdClient.generateImage(prompt, {
                width: 512,
                height: 512,
                steps: 20,
                cfg_scale: 7
            });
            
            if (result.success) {
                console.log('✅ [HYBRID] Изображение создано через SD WebUI');
                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    provider: 'Stable_Diffusion_WebUI',
                    operation: 'generate'
                };
            } else {
                console.log('❌ [HYBRID] SD WebUI не смог создать изображение:', result.error);
            }
        } catch (error) {
            console.log('❌ [HYBRID] Ошибка SD WebUI:', error.message);
        }
    } else {
        console.log('⚠️ [HYBRID] SD WebUI недоступен, используем резервную систему');
    }
    
    // Fallback на Pollinations.ai
    console.log('🔄 [HYBRID] Переключаемся на Pollinations.ai');
    
    try {
        // Прямой вызов Pollinations API
        const enhancedPrompt = `high quality draw ${prompt}, detailed, professional`;
        const imageId = Date.now();
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${imageId}`;
        
        console.log('✅ [HYBRID] Изображение создано через Pollinations.ai');
        return {
            success: true,
            imageUrl: imageUrl,
            provider: 'Pollinations_AI',
            operation: 'generate'
        };
    } catch (error) {
        console.log('❌ [HYBRID] Ошибка Pollinations.ai:', error.message);
        return {
            success: false,
            error: 'Системы генерации изображений недоступны',
            provider: 'none',
            operation: 'generate'
        };
    }
}

/**
 * Редактирование изображений
 */
async function editImage(imageUrl, editPrompt, options = {}) {
    console.log('🎨 [HYBRID] Запуск редактирования изображения...');
    console.log('🖼️ [HYBRID] Исходное изображение:', imageUrl);
    console.log('📝 [HYBRID] Команда редактирования:', editPrompt);
    
    // Проверяем доступность SD WebUI для редактирования
    const sdAvailable = await sdClient.checkAvailability();
    
    if (sdAvailable) {
        console.log('✅ [HYBRID] SD WebUI доступен для редактирования');
        
        try {
            const result = await sdClient.editImage(imageUrl, editPrompt, {
                denoising_strength: 0.7,
                cfg_scale: 7,
                steps: 20
            });
            
            if (result.success) {
                console.log('✅ [HYBRID] Изображение отредактировано через SD WebUI');
                return {
                    success: true,
                    imageUrl: result.imageUrl,
                    provider: 'Stable_Diffusion_WebUI',
                    operation: 'edit',
                    description: `Изображение отредактировано: ${editPrompt}`
                };
            } else {
                console.log('❌ [HYBRID] SD WebUI не смог отредактировать:', result.error);
            }
        } catch (error) {
            console.log('❌ [HYBRID] Ошибка редактирования SD WebUI:', error.message);
        }
    }
    
    // Fallback на локальный редактор
    console.log('🔄 [HYBRID] Используем локальный редактор');
    
    try {
        const { processLocalEdit } = await import('./local-image-editor.js');
        const result = await processLocalEdit(imageUrl, editPrompt);
        
        if (result && result.success) {
            console.log('✅ [HYBRID] Изображение обработано локальным редактором');
            return {
                success: true,
                imageUrl: result.imageUrl,
                provider: 'Local_Editor',
                operation: result.operation,
                description: result.description
            };
        } else {
            throw new Error(result?.error || 'Ошибка локального редактора');
        }
    } catch (error) {
        console.log('❌ [HYBRID] Ошибка локального редактора:', error.message);
        return {
            success: false,
            error: 'Все системы редактирования недоступны',
            provider: 'none',
            operation: 'edit'
        };
    }
}

/**
 * Получение статуса всех систем
 */
async function getSystemStatus() {
    const sdStatus = await sdClient.getStatus();
    
    return {
        stableDiffusion: sdStatus,
        pollinations: {
            status: 'available',
            message: 'Pollinations.ai всегда доступен как резервная система'
        },
        localEditor: {
            status: 'available',
            message: 'Локальный редактор готов для базовых операций'
        }
    };
}

export {
    generateImage,
    editImage,
    getSystemStatus
};