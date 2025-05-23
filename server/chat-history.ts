const { db } = require("./db");
const { chatSessions, aiMessages } = require("@shared/schema");
const { eq, desc } = require("drizzle-orm");

/**
 * Создание новой сессии чата
 */
async function createChatSession(userId: number, title: string) {
  const [session] = await db
    .insert(chatSessions)
    .values({
      userId,
      title,
    })
    .returning();
  
  return session;
}

/**
 * Получение всех сессий пользователя
 */
async function getUserChatSessions(userId) {
  return await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt));
}

/**
 * Сохранение сообщения в чат
 */
async function saveMessage(messageData) {
  const [message] = await db
    .insert(aiMessages)
    .values(messageData)
    .returning();
  
  // Обновляем время последнего сообщения в сессии
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, messageData.sessionId));
  
  return message;
}

/**
 * Получение сообщений из сессии
 */
async function getSessionMessages(sessionId) {
  // Получаем AI сообщения из базы данных
  const aiMessagesData = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionId))
    .orderBy(aiMessages.createdAt);
    
  // Преобразуем в формат для отображения в чате
  const formattedMessages = aiMessagesData.flatMap(msg => {
    const messages = [];
    
    // Добавляем сообщение пользователя
    if (msg.userMessage) {
      messages.push({
        id: `user_${msg.id}`,
        text: msg.userMessage,
        sender: 'user',
        timestamp: msg.createdAt,
        provider: null
      });
    }
    
    // Добавляем ответ AI
    if (msg.aiResponse) {
      messages.push({
        id: `ai_${msg.id}`,
        text: msg.aiResponse,
        sender: 'ai',
        timestamp: msg.createdAt,
        provider: msg.provider
      });
    }
    
    return messages;
  });
    
  return formattedMessages;
}

/**
 * Обновление заголовка сессии
 */
async function updateSessionTitle(sessionId, title) {
  const [session] = await db
    .update(chatSessions)
    .set({ 
      title,
      updatedAt: new Date()
    })
    .where(eq(chatSessions.id, sessionId))
    .returning();
  
  return session;
}

/**
 * Удаление сессии и всех её сообщений
 */
async function deleteSession(sessionId) {
  // Сначала удаляем все сообщения
  await db
    .delete(aiMessages)
    .where(eq(aiMessages.sessionId, sessionId));
  
  // Затем удаляем сессию
  await db
    .delete(chatSessions)
    .where(eq(chatSessions.id, sessionId));
}

module.exports = {
  createChatSession,
  getUserChatSessions,
  saveMessage,
  getSessionMessages,
  updateSessionTitle,
  deleteSession
};