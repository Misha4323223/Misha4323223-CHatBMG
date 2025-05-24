/**
 * Прямой доступ к ChatGPT через веб-интерфейс
 * Имитирует браузерные запросы к chat.openai.com
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Файл для сохранения сессии
const SESSION_FILE = path.join(__dirname, 'chatgpt-session.json');

class ChatGPTWebScraper {
    constructor() {
        this.accessToken = null;
        this.sessionToken = null;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/event-stream',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://chat.openai.com/',
            'Origin': 'https://chat.openai.com',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        };
        this.loadSession();
    }

    // Загрузка сохраненной сессии
    loadSession() {
        try {
            if (fs.existsSync(SESSION_FILE)) {
                const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
                this.accessToken = session.accessToken;
                this.sessionToken = session.sessionToken;
                console.log('✅ Загружена сохраненная сессия ChatGPT');
            }
        } catch (error) {
            console.log('⚠️ Не удалось загрузить сессию:', error.message);
        }
    }

    // Сохранение сессии
    saveSession() {
        try {
            const session = {
                accessToken: this.accessToken,
                sessionToken: this.sessionToken,
                savedAt: new Date().toISOString()
            };
            fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
            console.log('💾 Сессия ChatGPT сохранена');
        } catch (error) {
            console.log('❌ Ошибка сохранения сессии:', error.message);
        }
    }

    // Улучшенная авторизация через логин/пароль с обходом защиты
    async login(email, password) {
        try {
            console.log('🔐 Попытка авторизации в ChatGPT с улучшенными заголовками...');

            // Улучшенные заголовки для имитации реального браузера
            const enhancedHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://chat.openai.com/',
                'Origin': 'https://chat.openai.com',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            };

            // Метод 1: Попытка через основной Auth0 endpoint
            try {
                console.log('🔄 Метод 1: Прямая авторизация через Auth0...');
                
                const auth0Response = await axios.post('https://auth0.openai.com/u/login', {
                    client_id: 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
                    connection: 'auth0-connection-main',
                    username: email,
                    password: password,
                    grant_type: 'password',
                    scope: 'openid profile email'
                }, {
                    headers: {
                        ...enhancedHeaders,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });

                if (auth0Response.data.access_token) {
                    this.accessToken = auth0Response.data.access_token;
                    this.saveSession();
                    console.log('✅ Успешная авторизация через Auth0!');
                    return true;
                }
            } catch (auth0Error) {
                console.log('⚠️ Auth0 метод не сработал:', auth0Error.response?.status);
            }

            // Метод 2: Альтернативный endpoint
            try {
                console.log('🔄 Метод 2: Альтернативная авторизация...');
                
                const altResponse = await axios.post('https://chat.openai.com/api/auth/signin', {
                    username: email,
                    password: password
                }, {
                    headers: {
                        ...enhancedHeaders,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });

                if (altResponse.data.user) {
                    // Получаем сессионные данные
                    const sessionResponse = await axios.get('https://chat.openai.com/api/auth/session', {
                        headers: enhancedHeaders
                    });

                    if (sessionResponse.data.accessToken) {
                        this.accessToken = sessionResponse.data.accessToken;
                        this.saveSession();
                        console.log('✅ Успешная авторизация через альтернативный метод!');
                        return true;
                    }
                }
            } catch (altError) {
                console.log('⚠️ Альтернативный метод не сработал:', altError.response?.status);
            }

            throw new Error('Все методы авторизации не сработали - возможно требуется 2FA или CAPTCHA');

        } catch (error) {
            console.log('❌ Ошибка авторизации:', error.message);
            return false;
        }
    }

    // Авторизация через session token
    async setSessionToken(sessionToken) {
        try {
            this.sessionToken = sessionToken;
            
            // Проверяем валидность токена
            const response = await axios.get('https://chat.openai.com/api/auth/session', {
                headers: {
                    ...this.headers,
                    'Authorization': `Bearer ${sessionToken}`
                }
            });

            if (response.data && response.data.accessToken) {
                this.accessToken = response.data.accessToken;
                this.saveSession();
                console.log('✅ Session token принят!');
                return true;
            }

            throw new Error('Невалидный session token');
        } catch (error) {
            console.log('❌ Ошибка session token:', error.message);
            return false;
        }
    }

    // Отправка сообщения в ChatGPT
    async sendMessage(message, conversationId = null) {
        try {
            if (!this.accessToken) {
                throw new Error('Нет access token. Необходима авторизация.');
            }

            console.log('💭 Отправка сообщения в ChatGPT...');

            const payload = {
                action: 'next',
                messages: [{
                    id: this.generateMessageId(),
                    author: { role: 'user' },
                    content: { content_type: 'text', parts: [message] },
                    metadata: {}
                }],
                conversation_id: conversationId,
                parent_message_id: this.generateMessageId(),
                model: 'gpt-4',
                timezone_offset_min: -180,
                suggestions: [],
                history_and_training_disabled: false,
                arkose_token: null
            };

            const response = await axios.post('https://chat.openai.com/backend-api/conversation', payload, {
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                timeout: 60000
            });

            // Парсим SSE ответ
            const lines = response.data.split('\n');
            let lastValidData = null;

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.message && data.message.content && data.message.content.parts) {
                            lastValidData = data;
                        }
                    } catch (e) {
                        // Игнорируем невалидный JSON
                    }
                }
            }

            if (lastValidData && lastValidData.message.content.parts[0]) {
                return {
                    success: true,
                    response: lastValidData.message.content.parts[0],
                    conversationId: lastValidData.conversation_id,
                    provider: 'ChatGPT Official',
                    model: 'gpt-4'
                };
            }

            throw new Error('Не удалось получить ответ от ChatGPT');

        } catch (error) {
            console.log('❌ Ошибка отправки сообщения:', error.message);
            
            // Если токен истек, пробуем обновить
            if (error.response && error.response.status === 401) {
                console.log('🔄 Токен истек, требуется повторная авторизация');
                this.accessToken = null;
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Генерация ID для сообщений
    generateMessageId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Проверка статуса авторизации
    isAuthenticated() {
        return !!this.accessToken;
    }

    // Получение информации о лимитах
    async getLimits() {
        try {
            if (!this.accessToken) {
                return { error: 'Не авторизован' };
            }

            const response = await axios.get('https://chat.openai.com/backend-api/accounts/check', {
                headers: {
                    ...this.headers,
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return {
                success: true,
                limits: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Глобальный экземпляр
const chatgptScraper = new ChatGPTWebScraper();

module.exports = {
    ChatGPTWebScraper,
    chatgptScraper
};