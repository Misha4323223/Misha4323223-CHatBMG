// BOOOMERANGS Smart Chat - Основной модуль управления состоянием

class ChatCore {
    constructor() {
        this.state = {
            currentUser: 'anna',
            currentSessionId: null,
            currentTab: 'chat',
            isLoading: false,
            messages: [],
            sessions: [],
            draft: ''
        };
        
        this.eventHandlers = new Map();
        this.logger = new Logger();
        this.api = new ChatAPI();
        
        this.init();
    }

    // Инициализация
    async init() {
        this.logger.interface('Инициализация ChatCore');
        
        try {
            await this.loadSessions();
            this.loadDraft();
            this.setupEventListeners();
            
            this.logger.performance('ChatCore инициализирован', 0);
        } catch (error) {
            this.logger.error('Ошибка инициализации', error);
        }
    }

    // Управление состоянием
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        this.emit('stateChange', { oldState, newState: this.state });
        this.logger.interface('Состояние обновлено', { changes: newState });
    }

    getState() {
        return { ...this.state };
    }

    // Система событий
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                this.logger.error(`Ошибка в обработчике события ${event}`, error);
            }
        });
    }

    // Управление сессиями
    async loadSessions() {
        this.setState({ isLoading: true });
        
        try {
            const sessions = await this.api.getSessions(this.state.currentUser);
            this.setState({ sessions, isLoading: false });
            
            this.logger.chat('Сессии загружены', '', { count: sessions.length });
            return sessions;
        } catch (error) {
            this.logger.error('Ошибка загрузки сессий', error);
            this.setState({ isLoading: false });
            throw error;
        }
    }

    async createNewSession() {
        try {
            const session = await this.api.createSession(this.state.currentUser);
            
            this.setState({
                currentSessionId: session.id,
                messages: [],
                sessions: [session, ...this.state.sessions]
            });
            
            this.logger.chat('Новая сессия создана', session.id);
            this.emit('sessionCreated', session);
            
            return session;
        } catch (error) {
            this.logger.error('Ошибка создания сессии', error);
            throw error;
        }
    }

    async switchToSession(sessionId) {
        if (this.state.currentSessionId === sessionId) return;
        
        this.setState({ isLoading: true, currentSessionId: sessionId });
        
        try {
            const messages = await this.api.getMessages(sessionId);
            this.setState({ messages, isLoading: false });
            
            this.logger.chat('Переключение на сессию', sessionId, { messageCount: messages.length });
            this.emit('sessionSwitched', { sessionId, messages });
            
        } catch (error) {
            this.logger.error('Ошибка переключения сессии', error);
            this.setState({ isLoading: false });
        }
    }

    // Управление сообщениями
    async sendMessage(text) {
        if (!text.trim() || this.state.isLoading) return;
        
        const startTime = performance.now();
        this.setState({ isLoading: true });
        
        try {
            // Если нет активной сессии, создаем новую
            if (!this.state.currentSessionId) {
                await this.createNewSession();
            }

            // Добавляем сообщение пользователя
            const userMessage = {
                text,
                sender: 'user',
                timestamp: new Date().toISOString()
            };
            
            this.addMessage(userMessage);
            await this.api.saveMessage(this.state.currentSessionId, userMessage);
            
            this.logger.user('Сообщение отправлено', { 
                length: text.length, 
                sessionId: this.state.currentSessionId 
            });

            // Получаем ответ от AI
            const aiResponse = await this.api.getAIResponse(text, this.state.currentUser);
            
            if (aiResponse.success) {
                const aiMessage = {
                    text: aiResponse.response,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    provider: aiResponse.provider,
                    model: aiResponse.model
                };
                
                this.addMessage(aiMessage);
                await this.api.saveMessage(this.state.currentSessionId, aiMessage);
                
                const responseTime = performance.now() - startTime;
                this.logger.ai('Ответ получен', aiResponse.provider, aiResponse.model, {
                    responseTime: Math.round(responseTime),
                    length: aiResponse.response.length
                });
            }
            
            this.clearDraft();
            this.setState({ isLoading: false });
            
        } catch (error) {
            this.logger.error('Ошибка отправки сообщения', error);
            this.setState({ isLoading: false });
            throw error;
        }
    }

    addMessage(message) {
        const messages = [...this.state.messages, message];
        this.setState({ messages });
        this.emit('messageAdded', message);
    }

    // Управление черновиками
    saveDraft(text) {
        this.setState({ draft: text });
        localStorage.setItem('chatDraft', text);
    }

    loadDraft() {
        const draft = localStorage.getItem('chatDraft') || '';
        this.setState({ draft });
        return draft;
    }

    clearDraft() {
        this.setState({ draft: '' });
        localStorage.removeItem('chatDraft');
    }

    // Настройка слушателей событий
    setupEventListeners() {
        // Автосохранение черновика
        this.on('draftChange', (text) => {
            clearTimeout(this.draftTimeout);
            this.draftTimeout = setTimeout(() => {
                this.saveDraft(text);
            }, 1000);
        });

        // Автопрокрутка при новых сообщениях
        this.on('messageAdded', () => {
            setTimeout(() => {
                const messagesArea = document.querySelector('.messages-area');
                if (messagesArea) {
                    messagesArea.scrollTop = messagesArea.scrollHeight;
                }
            }, 100);
        });
    }
}

// API класс для работы с сервером
class ChatAPI {
    constructor() {
        this.baseURL = '';
    }

    async getSessions(username) {
        const response = await fetch('/api/chat/sessions?' + new URLSearchParams({ username }));
        const data = await response.json();
        return data.sessions || [];
    }

    async createSession(username) {
        const response = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                title: `Чат ${new Date().toLocaleString('ru')}` 
            })
        });
        const data = await response.json();
        return data.session;
    }

    async getMessages(sessionId) {
        const response = await fetch(`/api/chat/sessions/${sessionId}/messages`);
        const data = await response.json();
        return data.messages || [];
    }

    async saveMessage(sessionId, message) {
        const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: parseInt(sessionId),
                content: message.text,
                sender: message.sender,
                userId: message.userId || 'anna',
                provider: message.provider,
                model: message.model
            })
        });
        return response.json();
    }

    async getAIResponse(message, username) {
        const response = await fetch('/api/g4f/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, username })
        });
        return response.json();
    }
}

// Система логирования (улучшенная версия)
class Logger {
    constructor() {
        this.sessionMetrics = {
            messagesCount: 0,
            totalResponseTime: 0,
            sessionStart: Date.now()
        };
    }

    interface(action, details = {}) {
        console.log(`🎨 [INTERFACE] ${action}:`, details);
    }
    
    ai(action, provider = '', model = '', details = {}) {
        console.log(`🤖 [AI-${provider}] ${action} (${model}):`, details);
        
        if (details.responseTime) {
            this.updateMetrics(details.responseTime);
        }
    }
    
    chat(action, sessionId = '', details = {}) {
        console.log(`💬 [CHAT-${sessionId}] ${action}:`, details);
    }
    
    user(action, details = {}) {
        console.log(`👤 [USER] ${action}:`, details);
    }
    
    performance(action, time = 0, details = {}) {
        console.log(`⚡ [PERF] ${action} (${time}ms):`, details);
    }
    
    error(action, error, details = {}) {
        console.error(`❌ [ERROR] ${action}:`, error, details);
    }

    updateMetrics(responseTime) {
        this.sessionMetrics.messagesCount++;
        this.sessionMetrics.totalResponseTime += responseTime;
        
        const avgTime = Math.round(this.sessionMetrics.totalResponseTime / this.sessionMetrics.messagesCount);
        const sessionDuration = Math.round((Date.now() - this.sessionMetrics.sessionStart) / 1000);
        
        this.performance('Метрики сессии', 0, {
            messages: this.sessionMetrics.messagesCount,
            avgResponseTime: avgTime,
            sessionDuration: sessionDuration + 's'
        });
    }
}

// Экспорт для использования
window.ChatCore = ChatCore;
window.Logger = Logger;