const { db } = require("./db");
const { chatSessions, aiMessages } = require("@shared/schema");
const { eq, desc } = require("drizzle-orm");

/**
 * Получение числового ID из имени пользователя (хеш-функция)
 */
function getUserIdFromName(username: string): number {
  // Простая хеш-функция: сумма кодов символов
  let numericId = 0;
  for (let i = 0; i < username.length; i++) {
    numericId += username.charCodeAt(i);
  }
  // Добавляем базовое число, чтобы ID были более разнообразными
  return numericId + 1000;
}

/**
 * Создание новой сессии чата
 */
async function createChatSession(username: any, title: string) {
  // Преобразуем имя пользователя в числовой ID
  const userId = typeof username === 'number' ? username : getUserIdFromName(String(username));
  
  console.log(`📝 Создание чат-сессии для пользователя ${username} (ID: ${userId})`);
  
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
async function getUserChatSessions(username: any) {
  // Преобразуем имя пользователя в числовой ID
  const userId = typeof username === 'number' ? username : getUserIdFromName(String(username));
  
  console.log(`📋 Получение всех чатов для пользователя ${username} (ID: ${userId})`);
  
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
  console.log('💾 Попытка сохранения сообщения:', JSON.stringify(messageData, null, 2));
  
  try {
    const [message] = await db
      .insert(aiMessages)
      .values(messageData)
      .returning();
    
    console.log('✅ Сообщение успешно сохранено:', message.id);
    
    // Проверяем что сообщение действительно сохранилось
    const savedMessage = await db.select().from(aiMessages).where(eq(aiMessages.id, message.id));
    console.log('🔍 Проверка сохранения:', savedMessage.length > 0 ? 'найдено в БД' : 'НЕ НАЙДЕНО В БД');
    
    return message;
  } catch (error) {
    console.error('❌ Ошибка сохранения сообщения:', error);
    throw error;
  }
  
  // Обновляем время последнего сообщения в сессии
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, messageData.sessionId));
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
    provider: msg.provider,
    imageUrl: msg.imageUrl // Добавляем поле imageUrl
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
  console.log(`🗑️ Начинаем удаление сессии ${sessionId} из базы данных...`);
  
  try {
    // Сначала удаляем все сообщения
    const deletedMessages = await db
      .delete(aiMessages)
      .where(eq(aiMessages.sessionId, parseInt(sessionId)))
      .returning();
    console.log(`📧 Удалено ${deletedMessages.length} сообщений из сессии ${sessionId}`);
    
    // Затем удаляем сессию
    const deletedSessions = await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, parseInt(sessionId)))
      .returning();
    console.log(`🗂️ Удалено ${deletedSessions.length} сессий с ID ${sessionId}`);
    
    if (deletedSessions.length === 0) {
      console.log(`⚠️ Сессия ${sessionId} не была найдена в базе данных`);
    } else {
      console.log(`✅ Сессия ${sessionId} успешно удалена из базы данных`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при удалении сессии ${sessionId}:`, error);
    throw error;
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