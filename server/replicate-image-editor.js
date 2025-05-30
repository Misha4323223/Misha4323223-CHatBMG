/**
 * Replicate AI Image Editor - настоящее редактирование изображений
 * Использует мощные AI модели для удаления объектов, замены фона и других операций
 */

const fetch = require('node-fetch');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

/**
 * Проверка наличия API токена
 */
function checkReplicateToken() {
    if (!REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN не найден в переменных окружения');
    }
    return true;
}

/**
 * Удаление объектов с изображения (inpainting)
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} maskDescription - Описание области для удаления
 * @returns {Promise<Object>} Результат обработки
 */
async function removeObjectFromImage(imageUrl, maskDescription) {
    try {
        checkReplicateToken();
        
        const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68a5",
                input: {
                    image: imageUrl,
                    prompt: `Remove ${maskDescription} from the image, fill the area naturally`,
                    negative_prompt: "blurry, distorted, low quality"
                }
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Replicate API error: ${result.detail || 'Unknown error'}`);
        }

        // Ожидание завершения обработки
        const finalResult = await waitForPrediction(result.id);
        
        return {
            success: true,
            imageUrl: finalResult.output?.[0] || finalResult.output,
            operation: 'remove_object',
            description: `Удален объект: ${maskDescription}`
        };
        
    } catch (error) {
        console.error('Ошибка удаления объекта:', error);
        return {
            success: false,
            error: error.message,
            operation: 'remove_object'
        };
    }
}

/**
 * Удаление фона с изображения
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function removeBackground(imageUrl) {
    try {
        checkReplicateToken();
        
        const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
                input: {
                    image: imageUrl
                }
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Replicate API error: ${result.detail || 'Unknown error'}`);
        }

        const finalResult = await waitForPrediction(result.id);
        
        return {
            success: true,
            imageUrl: finalResult.output,
            operation: 'remove_background',
            description: 'Фон удален'
        };
        
    } catch (error) {
        console.error('Ошибка удаления фона:', error);
        return {
            success: false,
            error: error.message,
            operation: 'remove_background'
        };
    }
}

/**
 * Замена фона изображения
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} newBackground - Описание нового фона
 * @returns {Promise<Object>} Результат обработки
 */
async function replaceBackground(imageUrl, newBackground) {
    try {
        checkReplicateToken();
        
        const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68a5",
                input: {
                    image: imageUrl,
                    prompt: `Change background to ${newBackground}, keep the main subject unchanged`,
                    negative_prompt: "blurry, distorted, low quality, merged objects"
                }
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Replicate API error: ${result.detail || 'Unknown error'}`);
        }

        const finalResult = await waitForPrediction(result.id);
        
        return {
            success: true,
            imageUrl: finalResult.output?.[0] || finalResult.output,
            operation: 'replace_background',
            description: `Фон заменен на: ${newBackground}`
        };
        
    } catch (error) {
        console.error('Ошибка замены фона:', error);
        return {
            success: false,
            error: error.message,
            operation: 'replace_background'
        };
    }
}

/**
 * Улучшение качества изображения
 * @param {string} imageUrl - URL исходного изображения
 * @returns {Promise<Object>} Результат обработки
 */
async function enhanceImage(imageUrl) {
    try {
        checkReplicateToken();
        
        const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
                input: {
                    image: imageUrl,
                    scale: 2
                }
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Replicate API error: ${result.detail || 'Unknown error'}`);
        }

        const finalResult = await waitForPrediction(result.id);
        
        return {
            success: true,
            imageUrl: finalResult.output,
            operation: 'enhance',
            description: 'Качество изображения улучшено'
        };
        
    } catch (error) {
        console.error('Ошибка улучшения изображения:', error);
        return {
            success: false,
            error: error.message,
            operation: 'enhance'
        };
    }
}

/**
 * Изменение стиля изображения
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} styleDescription - Описание желаемого стиля
 * @returns {Promise<Object>} Результат обработки
 */
async function changeStyle(imageUrl, styleDescription) {
    try {
        checkReplicateToken();
        
        const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68a5",
                input: {
                    image: imageUrl,
                    prompt: `Transform the image style to ${styleDescription}, maintain the composition and main elements`,
                    negative_prompt: "blurry, distorted, low quality"
                }
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Replicate API error: ${result.detail || 'Unknown error'}`);
        }

        const finalResult = await waitForPrediction(result.id);
        
        return {
            success: true,
            imageUrl: finalResult.output?.[0] || finalResult.output,
            operation: 'style_transfer',
            description: `Стиль изменен на: ${styleDescription}`
        };
        
    } catch (error) {
        console.error('Ошибка изменения стиля:', error);
        return {
            success: false,
            error: error.message,
            operation: 'style_transfer'
        };
    }
}

/**
 * Ожидание завершения обработки
 * @param {string} predictionId - ID предсказания
 * @returns {Promise<Object>} Результат обработки
 */
async function waitForPrediction(predictionId) {
    const maxAttempts = 60; // 5 минут максимум
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
                headers: {
                    'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'succeeded') {
                return result;
            } else if (result.status === 'failed') {
                throw new Error(`Prediction failed: ${result.error || 'Unknown error'}`);
            }
            
            // Ждем 5 секунд перед следующей проверкой
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            throw error;
        }
    }
    
    throw new Error('Timeout: обработка заняла слишком много времени');
}

/**
 * Анализ запроса для определения типа редактирования
 * @param {string} request - Запрос пользователя
 * @returns {Object} Тип операции и параметры
 */
function parseEditRequest(request) {
    const lowerRequest = request.toLowerCase();
    
    // Удаление объектов
    if (lowerRequest.includes('убери') || lowerRequest.includes('удали') || 
        lowerRequest.includes('remove') || lowerRequest.includes('delete')) {
        
        // Специальный случай для фона
        if (lowerRequest.includes('фон') || lowerRequest.includes('background')) {
            return {
                type: 'remove_background',
                description: 'Удаление фона'
            };
        }
        
        // Извлекаем объект для удаления
        const objectMatch = request.match(/убери\s+(.+?)(?:\s+с\s+|$)/i) || 
                          request.match(/удали\s+(.+?)(?:\s+с\s+|$)/i) ||
                          request.match(/remove\s+(.+?)(?:\s+from\s+|$)/i);
        
        return {
            type: 'remove_object',
            target: objectMatch ? objectMatch[1].trim() : 'объект',
            description: `Удаление: ${objectMatch ? objectMatch[1].trim() : 'объект'}`
        };
    }
    
    // Замена фона
    if (lowerRequest.includes('замени фон') || lowerRequest.includes('поменяй фон') ||
        lowerRequest.includes('replace background') || lowerRequest.includes('change background')) {
        
        const backgroundMatch = request.match(/(?:замени|поменяй)\s+фон\s+на\s+(.+)/i) ||
                              request.match(/replace\s+background\s+(?:with|to)\s+(.+)/i) ||
                              request.match(/change\s+background\s+to\s+(.+)/i);
        
        return {
            type: 'replace_background',
            target: backgroundMatch ? backgroundMatch[1].trim() : 'новый фон',
            description: `Замена фона на: ${backgroundMatch ? backgroundMatch[1].trim() : 'новый фон'}`
        };
    }
    
    // Изменение стиля
    if (lowerRequest.includes('стиль') || lowerRequest.includes('style') ||
        lowerRequest.includes('сделай') && (lowerRequest.includes('художественн') || lowerRequest.includes('реалистичн'))) {
        
        const styleMatch = request.match(/(?:стиль|style)\s+(.+)/i) ||
                         request.match(/сделай\s+(.+)/i);
        
        return {
            type: 'style_transfer',
            target: styleMatch ? styleMatch[1].trim() : 'новый стиль',
            description: `Изменение стиля: ${styleMatch ? styleMatch[1].trim() : 'новый стиль'}`
        };
    }
    
    // Улучшение качества
    if (lowerRequest.includes('улучши') || lowerRequest.includes('повыси качество') ||
        lowerRequest.includes('enhance') || lowerRequest.includes('improve quality')) {
        
        return {
            type: 'enhance',
            description: 'Улучшение качества изображения'
        };
    }
    
    // По умолчанию - общее редактирование
    return {
        type: 'general_edit',
        target: request,
        description: `Общее редактирование: ${request}`
    };
}

/**
 * Основная функция обработки редактирования
 * @param {string} imageUrl - URL исходного изображения
 * @param {string} editRequest - Запрос на редактирование
 * @returns {Promise<Object>} Результат обработки
 */
async function processImageEdit(imageUrl, editRequest) {
    try {
        const editInfo = parseEditRequest(editRequest);
        
        console.log(`[Replicate Editor] Обработка: ${editInfo.type} - ${editInfo.description}`);
        
        switch (editInfo.type) {
            case 'remove_background':
                return await removeBackground(imageUrl);
                
            case 'remove_object':
                return await removeObjectFromImage(imageUrl, editInfo.target);
                
            case 'replace_background':
                return await replaceBackground(imageUrl, editInfo.target);
                
            case 'enhance':
                return await enhanceImage(imageUrl);
                
            case 'style_transfer':
                return await changeStyle(imageUrl, editInfo.target);
                
            case 'general_edit':
                // Для общих запросов используем inpainting
                return await removeObjectFromImage(imageUrl, editInfo.target);
                
            default:
                throw new Error(`Неподдерживаемый тип редактирования: ${editInfo.type}`);
        }
        
    } catch (error) {
        console.error('[Replicate Editor] Ошибка обработки:', error);
        return {
            success: false,
            error: error.message,
            operation: 'edit'
        };
    }
}

/**
 * Проверка доступности Replicate API
 * @returns {Promise<boolean>} Доступен ли API
 */
async function checkReplicateAvailability() {
    try {
        checkReplicateToken();
        
        const response = await fetch('https://api.replicate.com/v1/models', {
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            }
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('Replicate недоступен:', error);
        return false;
    }
}

module.exports = {
    processImageEdit,
    removeObjectFromImage,
    removeBackground,
    replaceBackground,
    enhanceImage,
    changeStyle,
    parseEditRequest,
    checkReplicateAvailability
};