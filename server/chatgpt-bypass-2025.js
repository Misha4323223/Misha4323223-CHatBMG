/**
 * Самые актуальные обходные пути для доступа к ChatGPT (2025)
 * Использует новейшие методы обхода защиты OpenAI
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class ChatGPTBypass2025 {
    constructor() {
        this.sessionToken = null;
        this.accessToken = null;
        this.deviceId = uuidv4();
        this.conversationId = null;
        
        // Актуальные User-Agent строки 2025
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    // Метод 1: Новый обход через Cloudflare Worker
    async tryCloudflareWorkerBypass(message) {
        try {
            console.log('🔄 Попытка через Cloudflare Worker обход...');
            
            const response = await axios.post('https://chatgpt-proxy.workers.dev/api/chat', {
                message: message,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.getRandomUserAgent(),
                    'Origin': 'https://chat.openai.com'
                },
                timeout: 30000
            });

            if (response.data && response.data.choices && response.data.choices[0]) {
                return {
                    success: true,
                    response: response.data.choices[0].message.content,
                    provider: 'CloudflareWorker',
                    model: 'gpt-3.5-turbo'
                };
            }
        } catch (error) {
            console.log('⚠️ Cloudflare Worker метод недоступен');
        }
        return null;
    }

    // Метод 2: Обход через Edge Runtime
    async tryEdgeRuntimeBypass(message) {
        try {
            console.log('🔄 Попытка через Edge Runtime...');
            
            const response = await axios.post('https://api.openai-proxy.live/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: message }
                ],
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.getRandomUserAgent(),
                    'Authorization': 'Bearer free-tier-access'
                },
                timeout: 25000
            });

            if (response.data && response.data.choices) {
                return {
                    success: true,
                    response: response.data.choices[0].message.content,
                    provider: 'EdgeRuntime',
                    model: 'gpt-3.5-turbo'
                };
            }
        } catch (error) {
            console.log('⚠️ Edge Runtime метод недоступен');
        }
        return null;
    }

    // Метод 3: Новый обход через Vercel Functions
    async tryVercelFunctionBypass(message) {
        try {
            console.log('🔄 Попытка через Vercel Function...');
            
            const response = await axios.post('https://chatgpt-vercel-proxy.vercel.app/api/generate', {
                prompt: message,
                model: 'gpt-3.5-turbo'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.getRandomUserAgent()
                },
                timeout: 20000
            });

            if (response.data && response.data.text) {
                return {
                    success: true,
                    response: response.data.text,
                    provider: 'VercelFunction',
                    model: 'gpt-3.5-turbo'
                };
            }
        } catch (error) {
            console.log('⚠️ Vercel Function метод недоступен');
        }
        return null;
    }

    // Метод 4: Обход через публичные API шлюзы
    async tryPublicGatewayBypass(message) {
        const gateways = [
            'https://api.chatanywhere.com.cn/v1/chat/completions',
            'https://api.chatanywhere.tech/v1/chat/completions',
            'https://api.chatanywhere.org/v1/chat/completions'
        ];

        for (const gateway of gateways) {
            try {
                console.log(`🔄 Попытка через публичный шлюз: ${gateway}`);
                
                const response = await axios.post(gateway, {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: message }],
                    stream: false
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer sk-free-access-token',
                        'User-Agent': this.getRandomUserAgent()
                    },
                    timeout: 15000
                });

                if (response.data && response.data.choices) {
                    return {
                        success: true,
                        response: response.data.choices[0].message.content,
                        provider: 'PublicGateway',
                        model: 'gpt-3.5-turbo'
                    };
                }
            } catch (error) {
                continue; // Пробуем следующий шлюз
            }
        }
        return null;
    }

    // Метод 5: Прямой обход через сессионные токены
    async trySessionTokenBypass(message, sessionToken) {
        try {
            console.log('🔄 Попытка с сессионным токеном...');
            
            if (!sessionToken) {
                throw new Error('Сессионный токен не предоставлен');
            }

            // Получаем access token из session token
            const authResponse = await axios.post('https://chat.openai.com/api/auth/session', {}, {
                headers: {
                    'Cookie': `__Secure-next-auth.session-token=${sessionToken}`,
                    'User-Agent': this.getRandomUserAgent()
                }
            });

            if (authResponse.data && authResponse.data.accessToken) {
                this.accessToken = authResponse.data.accessToken;

                // Отправляем сообщение
                const chatResponse = await axios.post('https://chat.openai.com/backend-api/conversation', {
                    action: 'next',
                    messages: [{
                        id: uuidv4(),
                        author: { role: 'user' },
                        content: { content_type: 'text', parts: [message] }
                    }],
                    model: 'gpt-4',
                    timezone_offset_min: -180
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': this.getRandomUserAgent()
                    }
                });

                return {
                    success: true,
                    response: this.parseStreamResponse(chatResponse.data),
                    provider: 'SessionToken',
                    model: 'gpt-4'
                };
            }
        } catch (error) {
            console.log('⚠️ Session token метод недоступен:', error.message);
        }
        return null;
    }

    // Парсер потокового ответа
    parseStreamResponse(data) {
        const lines = data.split('\n');
        for (const line of lines.reverse()) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const json = JSON.parse(line.substring(6));
                    if (json.message && json.message.content && json.message.content.parts) {
                        return json.message.content.parts[0];
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        return 'Ответ получен, но не удалось распарсить';
    }

    // Основная функция с каскадными попытками
    async getResponse(message, options = {}) {
        console.log('🚀 Запуск каскадных методов обхода ChatGPT...');
        
        const methods = [
            () => this.tryCloudflareWorkerBypass(message),
            () => this.tryEdgeRuntimeBypass(message),
            () => this.tryVercelFunctionBypass(message),
            () => this.tryPublicGatewayBypass(message)
        ];

        // Если есть session token, пробуем его первым
        if (options.sessionToken) {
            methods.unshift(() => this.trySessionTokenBypass(message, options.sessionToken));
        }

        for (const method of methods) {
            const result = await method();
            if (result && result.success) {
                console.log(`✅ Успех через ${result.provider}!`);
                return result;
            }
            
            // Небольшая задержка между попытками
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return {
            success: false,
            error: 'Все методы обхода временно недоступны'
        };
    }
}

module.exports = ChatGPTBypass2025;