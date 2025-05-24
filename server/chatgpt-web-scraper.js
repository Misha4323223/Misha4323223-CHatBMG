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

    // Авторизация через логин/пароль
    async login(email, password) {
        try {
            console.log('🔐 Авторизация в ChatGPT...');

            // 1. Получаем страницу логина
            const authPage = await axios.get('https://chat.openai.com/auth/login', {
                headers: this.headers
            });

            // 2. Получаем CSRF токен
            const csrfMatch = authPage.data.match(/name="csrf-token" content="([^"]+)"/);
            const csrfToken = csrfMatch ? csrfMatch[1] : null;

            if (!csrfToken) {
                throw new Error('Не удалось получить CSRF токен');
            }

            // 3. Отправляем данные логина
            const loginResponse = await axios.post('https://chat.openai.com/api/auth/signin/auth0', {
                email: email,
                password: password,
                csrf_token: csrfToken
            }, {
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                withCredentials: true
            });

            if (loginResponse.data.url) {
                // 4. Получаем access token из callback
                const callbackResponse = await axios.get(loginResponse.data.url, {
                    headers: this.headers,
                    withCredentials: true
                });

                // Извлекаем токен из ответа
                const tokenMatch = callbackResponse.data.match(/accessToken":"([^"]+)"/);
                if (tokenMatch) {
                    this.accessToken = tokenMatch[1];
                    this.saveSession();
                    console.log('✅ Успешная авторизация в ChatGPT!');
                    return true;
                }
            }

            throw new Error('Не удалось получить access token');

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