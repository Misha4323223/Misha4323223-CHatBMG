/**
 * Система памяти разговоров для поддержания контекста между сообщениями
 */

// Хранилище активных разговоров
const activeConversations = new Map();

/**
 * Структура разговора
 */
class Conversation {
  constructor(userId = 'anonymous') {
    this.userId = userId;
    this.messages = [];
    this.currentProvider = null;
    this.currentModel = null;
    this.category = null;
    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  /**
   * Добавление сообщения в разговор
   */
  addMessage(message, sender, provider = null, model = null) {
    this.messages.push({
      content: message,
      sender,
      provider,
      model,
      timestamp: new Date()
    });
    
    // Обновляем информацию о текущем провайдере
    if (sender === 'ai' && provider) {
      this.currentProvider = provider;
      this.currentModel = model;
    }
    
    this.lastActivity = new Date();
    
    // Ограничиваем историю последними 20 сообщениями для производительности
    if (this.messages.length > 20) {
      this.messages = this.messages.slice(-20);
    }
  }

  /**
   * Получение контекста для AI провайдера
   */
  getContext() {
    if (this.messages.length === 0) return '';
    
    // Берем последние 5 сообщений для контекста
    const recentMessages = this.messages.slice(-5);
    
    let context = 'Контекст предыдущих сообщений:\n';
    recentMessages.forEach(msg => {
      const role = msg.sender === 'user' ? 'Пользователь' : 'AI';
      context += `${role}: ${msg.content}\n`;
    });
    
    return context + '\nТекущий вопрос: ';
  }

  /**
   * Проверка, нужно ли продолжить с тем же провайдером
   */
  shouldContinueWithProvider() {
    // Если есть активный провайдер и последняя активность была недавно (меньше 10 минут)
    const timeSinceLastActivity = new Date() - this.lastActivity;
    return this.currentProvider && timeSinceLastActivity < 10 * 60 * 1000;
  }
}

/**
 * Получение или создание разговора для пользователя
 */
function getConversation(userId = 'anonymous') {
  if (!activeConversations.has(userId)) {
    activeConversations.set(userId, new Conversation(userId));
  }
  return activeConversations.get(userId);
}

/**
 * Добавление сообщения пользователя в разговор
 */
function addUserMessage(userId, message) {
  const conversation = getConversation(userId);
  conversation.addMessage(message, 'user');
  return conversation;
}

/**
 * Добавление ответа AI в разговор
 */
function addAiResponse(userId, response, provider, model) {
  const conversation = getConversation(userId);
  conversation.addMessage(response, 'ai', provider, model);
  return conversation;
}

/**
 * Получение контекста для следующего сообщения
 */
function getMessageContext(userId, newMessage) {
  const conversation = getConversation(userId);
  
  // Добавляем новое сообщение пользователя
  conversation.addMessage(newMessage, 'user');
  
  return {
    context: conversation.getContext(),
    shouldContinueWithProvider: conversation.shouldContinueWithProvider(),
    currentProvider: conversation.currentProvider,
    currentModel: conversation.currentModel,
    messageHistory: conversation.messages
  };
}

/**
 * Очистка старых разговоров (запускается периодически)
 */
function cleanupOldConversations() {
  const now = new Date();
  const maxAge = 60 * 60 * 1000; // 1 час
  
  for (const [userId, conversation] of activeConversations.entries()) {
    if (now - conversation.lastActivity > maxAge) {
      activeConversations.delete(userId);
      console.log(`🧹 Очищен старый разговор для пользователя ${userId}`);
    }
  }
}

/**
 * Создание нового разговора (сброс контекста)
 */
function startNewConversation(userId = 'anonymous') {
  activeConversations.set(userId, new Conversation(userId));
  console.log(`🆕 Начат новый разговор для пользователя ${userId}`);
  return activeConversations.get(userId);
}

/**
 * Получение статистики разговоров
 */
function getConversationStats() {
  return {
    activeConversations: activeConversations.size,
    conversations: Array.from(activeConversations.entries()).map(([userId, conv]) => ({
      userId,
      messageCount: conv.messages.length,
      currentProvider: conv.currentProvider,
      lastActivity: conv.lastActivity
    }))
  };
}

// Автоматическая очистка каждые 30 минут
setInterval(cleanupOldConversations, 30 * 60 * 1000);

module.exports = {
  getConversation,
  addUserMessage,
  addAiResponse,
  getMessageContext,
  startNewConversation,
  getConversationStats,
  cleanupOldConversations
};