/**
 * Быстрые AI провайдеры для ускорения ответов
 * Специально оптимизированы для минимальных задержек
 */

const axios = require('axios');

/**
 * Быстрый провайдер 1: ChatGPT Free (без ограничений)
 */
async function getFastChatGPTResponse(message) {
    try {
        const response = await axios.post('https://chatgpt4online.org/wp-json/mwai-ui/v1/chats/submit', {
            botId: 'default',
            customId: null,
            session: 'N/A',
            chatId: `chatcmpl-${Date.now()}`,
            contextId: 1,
            messages: [{ role: 'user', content: message }],
            newMessage: message,
            stream: false
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 секунд максимум
        });

        if (response.data && response.data.reply) {
            return {
                success: true,
                response: response.data.reply,
                provider: 'Fast-ChatGPT',
                model: 'gpt-3.5-turbo'
            };
        }

        throw new Error('Нет ответа от Fast ChatGPT');
    } catch (error) {
        console.log('❌ Fast ChatGPT недоступен:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Быстрый провайдер 2: HuggingChat Express
 */
async function getFastHuggingChatResponse(message) {
    try {
        const response = await axios.post('https://huggingface.co/chat/conversation', {
            inputs: message,
            parameters: {
                temperature: 0.7,
                max_new_tokens: 512,
                top_p: 0.95,
                repetition_penalty: 1.1
            },
            stream: false
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
            },
            timeout: 8000 // 8 секунд
        });

        if (response.data && response.data.generated_text) {
            return {
                success: true,
                response: response.data.generated_text,
                provider: 'Fast-HuggingChat',
                model: 'mistral-7b'
            };
        }

        throw new Error('Нет ответа от Fast HuggingChat');
    } catch (error) {
        console.log('❌ Fast HuggingChat недоступен:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Быстрый провайдер 3: DeepAI Express
 */
async function getFastDeepAIResponse(message) {
    try {
        const response = await axios.post('https://api.deepai.org/api/text-generator', {
            text: message
        }, {
            headers: {
                'Api-Key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 7000 // 7 секунд
        });

        if (response.data && response.data.output) {
            return {
                success: true,
                response: response.data.output,
                provider: 'Fast-DeepAI',
                model: 'text-generator'
            };
        }

        throw new Error('Нет ответа от Fast DeepAI');
    } catch (error) {
        console.log('❌ Fast DeepAI недоступен:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Главная функция для получения быстрого ответа
 * Пробует провайдеры по порядку скорости
 */
async function getFastAIResponse(message) {
    console.log('🚀 Ищем быстрый ответ от AI...');
    
    const fastProviders = [
        { name: 'Fast-DeepAI', func: getFastDeepAIResponse },
        { name: 'Fast-HuggingChat', func: getFastHuggingChatResponse },
        { name: 'Fast-ChatGPT', func: getFastChatGPTResponse }
    ];

    for (const provider of fastProviders) {
        try {
            console.log(`⚡ Пробуем ${provider.name}...`);
            const result = await provider.func(message);
            
            if (result.success) {
                console.log(`✅ ${provider.name} ответил быстро!`);
                return result;
            }
        } catch (error) {
            console.log(`❌ ${provider.name} не ответил:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Все быстрые провайдеры недоступны',
        provider: 'Fast-AI-System'
    };
}

module.exports = {
    getFastAIResponse,
    getFastChatGPTResponse,
    getFastHuggingChatResponse,
    getFastDeepAIResponse
};