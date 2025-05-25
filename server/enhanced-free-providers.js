/**
 * Расширенная система бесплатных AI провайдеров
 * Фокус на простых, надежных провайдерах без сложных зависимостей
 */

const axios = require('axios');

// Список проверенных бесплатных провайдеров
const FREE_PROVIDERS = {
    // Простые и надежные бесплатные провайдеры
    'ChatFree': {
        url: 'https://chatfree.cc/api/chat',
        model: 'gpt-3.5-turbo',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    },
    'GPT4Free': {
        url: 'https://gpt4free.online/api/chat',
        model: 'gpt-4',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://gpt4free.online'
        }
    },
    'FreeGPT': {
        url: 'https://freegpt.one/api/openai/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer free-key'
        }
    },
    'AIChat': {
        url: 'https://api.aichat.online/chat',
        model: 'gpt-4',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://aichat.online'
        }
    },
    'YouChat': {
        url: 'https://you.com/api/streamingSearch',
        model: 'gpt-4',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; YouBot/1.0)'
        }
    }
};

/**
 * Отправка запроса к бесплатному провайдеру
 */
async function queryFreeProvider(providerName, message, timeout = 15000) {
    const provider = FREE_PROVIDERS[providerName];
    if (!provider) {
        throw new Error(`Провайдер ${providerName} не найден`);
    }

    console.log(`🔄 Запрос к ${providerName}...`);

    try {
        const requestData = {
            messages: [
                { role: 'user', content: message }
            ],
            model: provider.model,
            temperature: 0.7,
            max_tokens: 2000
        };

        const response = await axios.post(provider.url, requestData, {
            headers: provider.headers,
            timeout: timeout,
            validateStatus: function (status) {
                return status < 500; // Принимаем коды до 500
            }
        });

        if (response.data && response.data.choices && response.data.choices[0]) {
            const content = response.data.choices[0].message.content;
            console.log(`✅ ${providerName} успешно ответил`);
            return {
                success: true,
                response: content,
                provider: providerName,
                model: provider.model
            };
        } else if (response.data && response.data.response) {
            // Альтернативный формат ответа
            console.log(`✅ ${providerName} успешно ответил (формат 2)`);
            return {
                success: true,
                response: response.data.response,
                provider: providerName,
                model: provider.model
            };
        } else {
            throw new Error('Неожиданный формат ответа');
        }

    } catch (error) {
        console.log(`❌ Ошибка ${providerName}: ${error.message}`);
        return {
            success: false,
            error: error.message,
            provider: providerName
        };
    }
}

/**
 * Система резервных провайдеров
 */
async function getFreeProviderResponse(message, preferredProvider = null) {
    const providerList = preferredProvider 
        ? [preferredProvider, ...Object.keys(FREE_PROVIDERS).filter(p => p !== preferredProvider)]
        : Object.keys(FREE_PROVIDERS);

    console.log(`🎯 Пробуем бесплатные провайдеры: ${providerList.join(', ')}`);

    for (const providerName of providerList) {
        try {
            const result = await queryFreeProvider(providerName, message);
            if (result.success) {
                return result;
            }
        } catch (error) {
            console.log(`❌ Провайдер ${providerName} недоступен: ${error.message}`);
            continue;
        }
    }

    // Если все провайдеры недоступны
    return {
        success: false,
        error: 'Все бесплатные провайдеры недоступны',
        response: 'К сожалению, все бесплатные AI провайдеры временно недоступны. Попробуйте позже.',
        provider: 'FallbackSystem'
    };
}

/**
 * Проверка доступности всех провайдеров
 */
async function checkAllProviders() {
    console.log('🔍 Проверка доступности бесплатных провайдеров...');
    const results = {};

    for (const providerName of Object.keys(FREE_PROVIDERS)) {
        try {
            const result = await queryFreeProvider(providerName, 'Тест', 5000);
            results[providerName] = result.success;
            console.log(`${result.success ? '✅' : '❌'} ${providerName}: ${result.success ? 'Работает' : 'Недоступен'}`);
        } catch (error) {
            results[providerName] = false;
            console.log(`❌ ${providerName}: ${error.message}`);
        }
    }

    return results;
}

module.exports = {
    getFreeProviderResponse,
    queryFreeProvider,
    checkAllProviders,
    FREE_PROVIDERS
};