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
  const formattedMessages = aiMessagesData.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: msg.sender, // 'user' или 'ai'
    timestamp: msg.createdAt,
    provider: msg.provider
  }));
    
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
  console.log(`🗑️ Начинаем удаление сессии ${sessionId} из БД`);
  
  // Сначала удаляем все сообщения
  const deletedMessages = await db
    .delete(aiMessages)
    .where(eq(aiMessages.sessionId, sessionId))
    .returning();
  
  console.log(`🗑️ Удалено ${deletedMessages.length} сообщений из сессии ${sessionId}`);
  
  // Затем удаляем сессию
  const deletedSession = await db
    .delete(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .returning();
  
  if (deletedSession.length > 0) {
    console.log(`✅ Сессия ${sessionId} успешно удалена из БД`);
    return true;
  } else {
    console.log(`⚠️ Сессия ${sessionId} не найдена в БД`);
    return false;
  }
}

module.exports = {
  createChatSession,
  getUserChatSessions,
  saveMessage,
  getSessionMessages,
  updateSessionTitle,
  deleteSession
};