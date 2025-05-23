// BOOOMERANGS Smart Chat - UI компоненты с оптимизацией производительности

class ChatUI {
    constructor(chatCore) {
        this.core = chatCore;
        this.elements = {};
        this.messagePool = new MessagePool();
        this.virtualizer = new VirtualScroller();
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.bindStateChanges();
        
        this.core.logger.interface('ChatUI инициализирован');
    }

    // Кэширование DOM элементов
    cacheElements() {
        this.elements = {
            sidebar: document.querySelector('.sidebar'),
            messagesArea: document.querySelector('.messages-area'),
            messageInput: document.querySelector('.message-input'),
            sendButton: document.querySelector('.send-button'),
            chatHistory: document.querySelector('.chat-history'),
            sidebarToggle: document.querySelector('.sidebar-toggle'),
            newChatBtn: document.querySelector('.new-chat-btn')
        };
    }

    // Настройка слушателей событий
    setupEventListeners() {
        // Отправка сообщения
        this.elements.sendButton?.addEventListener('click', () => this.handleSendMessage());
        this.elements.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Автосохранение черновика
        this.elements.messageInput?.addEventListener('input', (e) => {
            this.core.emit('draftChange', e.target.value);
        });

        // Создание нового чата
        this.elements.newChatBtn?.addEventListener('click', () => {
            this.core.createNewSession();
        });

        // Переключение боковой панели
        this.elements.sidebarToggle?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Клавиатурные сокращения
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.core.createNewSession();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.elements.messageInput?.focus();
                        break;
                }
            }
        });
    }

    // Связывание с изменениями состояния
    bindStateChanges() {
        this.core.on('stateChange', ({ newState }) => {
            this.updateUI(newState);
        });

        this.core.on('sessionSwitched', ({ messages }) => {
            this.renderMessages(messages);
        });

        this.core.on('messageAdded', (message) => {
            this.addMessageToUI(message);
        });

        this.core.on('sessionCreated', () => {
            this.updateSessionsList();
        });
    }

    // Обработка отправки сообщения
    async handleSendMessage() {
        const text = this.elements.messageInput?.value.trim();
        if (!text) return;

        try {
            this.elements.messageInput.value = '';
            this.updateSendButton(true);
            
            await this.core.sendMessage(text);
        } catch (error) {
            this.showError('Ошибка отправки сообщения');
        } finally {
            this.updateSendButton(false);
        }
    }

    // Обновление UI на основе состояния
    updateUI(state) {
        // Обновление загрузки
        this.updateSendButton(state.isLoading);
        
        // Обновление черновика
        if (this.elements.messageInput && this.elements.messageInput.value !== state.draft) {
            this.elements.messageInput.value = state.draft;
        }
    }

    // Рендеринг сообщений с виртуализацией для больших списков
    renderMessages(messages) {
        if (!this.elements.messagesArea) return;

        // Очищаем область сообщений
        this.elements.messagesArea.innerHTML = '';

        if (messages.length === 0) {
            this.showWelcomeScreen();
            return;
        }

        // Используем виртуализацию для больших списков
        if (messages.length > 100) {
            this.virtualizer.render(messages, this.elements.messagesArea);
        } else {
            this.renderMessagesDirectly(messages);
        }

        // Прокрутка к последнему сообщению
        setTimeout(() => this.scrollToBottom(), 100);
    }

    // Прямой рендеринг для небольших списков
    renderMessagesDirectly(messages) {
        const fragment = document.createDocumentFragment();
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            fragment.appendChild(messageElement);
        });
        
        this.elements.messagesArea.appendChild(fragment);
    }

    // Добавление нового сообщения в UI
    addMessageToUI(message) {
        if (!this.elements.messagesArea) return;

        // Удаляем приветственный экран если он есть
        const welcomeScreen = this.elements.messagesArea.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.remove();
        }

        const messageElement = this.createMessageElement(message);
        this.elements.messagesArea.appendChild(messageElement);
        
        setTimeout(() => this.scrollToBottom(), 100);
    }

    // Создание элемента сообщения с пулом объектов
    createMessageElement(message) {
        const messageEl = this.messagePool.get();
        
        messageEl.className = `message ${message.sender}`;
        messageEl.innerHTML = `
            <div class="message-content">
                ${this.sanitizeHTML(message.text)}
            </div>
            <div class="message-meta">
                ${this.formatTimestamp(message.timestamp)}
                ${message.provider ? ` • ${message.provider}` : ''}
                ${message.model ? ` • ${message.model}` : ''}
            </div>
        `;
        
        return messageEl;
    }

    // Безопасная санитизация HTML
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // Форматирование времени
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Показ приветственного экрана
    showWelcomeScreen() {
        this.elements.messagesArea.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-logo">🪃</div>
                <h1 class="welcome-title">BOOOMERANGS</h1>
                <p class="welcome-subtitle">
                    Добро пожаловать в современный AI чат!<br>
                    Начните диалог, отправив сообщение ниже.
                </p>
            </div>
        `;
    }

    // Обновление списка сессий
    async updateSessionsList() {
        const sessions = this.core.getState().sessions;
        
        if (!this.elements.chatHistory) return;

        this.elements.chatHistory.innerHTML = sessions.map(session => `
            <div class="chat-item ${session.id === this.core.getState().currentSessionId ? 'active' : ''}" 
                 data-session-id="${session.id}"
                 onclick="chatUI.switchToSession(${session.id})">
                <div class="chat-title">${this.escapeHTML(session.title)}</div>
                <div class="chat-preview">${this.escapeHTML(session.lastMessage || 'Новый чат')}</div>
            </div>
        `).join('');
    }

    // Переключение на сессию
    switchToSession(sessionId) {
        this.core.switchToSession(sessionId);
        this.updateSessionsList(); // Обновляем активную сессию
    }

    // Переключение боковой панели
    toggleSidebar() {
        this.elements.sidebar?.classList.toggle('hidden');
        
        // Обновляем стили для поля ввода
        const inputArea = document.querySelector('.input-area');
        if (inputArea) {
            inputArea.style.left = this.elements.sidebar?.classList.contains('hidden') ? '0' : '300px';
        }
    }

    // Обновление кнопки отправки
    updateSendButton(isLoading) {
        if (!this.elements.sendButton) return;
        
        this.elements.sendButton.disabled = isLoading;
        this.elements.sendButton.innerHTML = isLoading ? '⏳' : '➤';
    }

    // Прокрутка к низу
    scrollToBottom() {
        if (this.elements.messagesArea) {
            this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
        }
    }

    // Показ ошибки
    showError(message) {
        console.error(message);
        // Можно добавить toast уведомления
    }

    // Экранирование HTML
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Пул объектов для сообщений (оптимизация памяти)
class MessagePool {
    constructor() {
        this.pool = [];
        this.maxSize = 50;
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        
        const element = document.createElement('div');
        return element;
    }

    release(element) {
        if (this.pool.length < this.maxSize) {
            element.innerHTML = '';
            element.className = '';
            this.pool.push(element);
        }
    }
}

// Виртуальный скроллер для больших списков
class VirtualScroller {
    constructor() {
        this.itemHeight = 80; // Примерная высота сообщения
        this.visibleRange = { start: 0, end: 0 };
    }

    render(items, container) {
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / this.itemHeight) + 5; // Буфер
        
        const scrollTop = container.scrollTop;
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Создаем spacer сверху
        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * this.itemHeight}px`;
        container.appendChild(topSpacer);
        
        // Рендерим видимые элементы
        for (let i = startIndex; i < endIndex; i++) {
            const messageElement = this.createMessageElement(items[i]);
            container.appendChild(messageElement);
        }
        
        // Создаем spacer снизу
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${(items.length - endIndex) * this.itemHeight}px`;
        container.appendChild(bottomSpacer);
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender}`;
        div.style.height = `${this.itemHeight}px`;
        div.innerHTML = `
            <div class="message-content">${message.text}</div>
            <div class="message-meta">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
        return div;
    }
}

// Экспорт
window.ChatUI = ChatUI;