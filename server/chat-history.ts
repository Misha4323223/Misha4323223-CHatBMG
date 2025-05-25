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
 * Умное определение темы чата на основе сообщения пользователя
 */
function generateChatTitle(userMessage: string): string {
  // Очищаем сообщение от лишних символов
  const cleanMessage = userMessage.trim().replace(/[^\w\s\u0400-\u04FF]/g, '');
  
  // Ключевые слова для разных типов запросов
  const patterns = {
    'Генерация изображений': /(?:создай|нарисуй|сгенерируй|изображение|картинку|фото)/i,
    'Анализ кода': /(?:код|программ|разработ|функци|алгоритм|javascript|python|css|html)/i,
    'Творческие задачи': /(?:стих|рассказ|письмо|текст|сочин|креатив|идея)/i,
    'Переводы': /(?:перевед|translate|переводи|на английский|на русский)/i,
    'Вопросы и ответы': /(?:что|как|где|когда|почему|зачем|объясни|расскажи)/i,
    'Анализ документов': /(?:анализ|документ|файл|pdf|изучи|прочитай)/i,
    'Обучение': /(?:учеб|урок|объясн|изуч|пониман|научи)/i
  };

  // Проверяем паттерны
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanMessage)) {
      const firstWords = cleanMessage.split(' ').slice(0, 4).join(' ');
      return `${category}: ${firstWords}...`.substring(0, 50);
    }
  }

  // Если паттерн не найден, берем первые слова
  const firstWords = cleanMessage.split(' ').slice(0, 6).join(' ');
  
  // Ограничиваем длину
  if (firstWords.length > 40) {
    return firstWords.substring(0, 37) + '...';
  }
  
  return firstWords || 'Новый чат';
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
 * Функция для получения красивых названий провайдеров
 */
function getBeautifulProviderName(technicalName: string): string {
  const providerMap: { [key: string]: string } = {
    'Qwen_Qwen_2_5_Max': '🧠 Qwen AI Pro',
    'Qwen_Qwen_2_5': '🧠 Qwen AI',
    'Phind': '💻 Phind Code Expert',
    'Gemini': '✨ Google Gemini',
    'GeminiPro': '✨ Google Gemini Pro',
    'Anthropic': '🤖 Claude AI',
    'Claude': '🤖 Claude AI',
    'ChatGpt': '🔥 ChatGPT Plus',
    'OpenaiChat': '🔥 ChatGPT Plus',
    'You': '🔍 You.com AI',
    'DeepInfra': '⚡ DeepInfra Speed',
    'Groq': '🚀 Groq Lightning',
    'PerplexityApi': '📚 Perplexity Search',
    'DeepSeek': '🛠️ DeepSeek Coder',
    'HuggingChat': '🤗 Hugging Face',
    'Ollama': '🦙 Llama AI',
    'PythonG4F-Stream': '🧠 Qwen AI Pro',
    'auto': '🎯 Smart Auto'
  };

  return providerMap[technicalName] || `🤖 ${technicalName}`;
}

/**
 * Сохранение сообщения в чат
 */
async function saveMessage(messageData: any) {
  try {
    // Заменяем техническое название провайдера на красивое
    if (messageData.provider) {
      messageData.provider = getBeautifulProviderName(messageData.provider);
    }
    
    const [message] = await db
      .insert(aiMessages)
      .values(messageData)
      .returning();
    
    console.log('✅ Сообщение сохранено:', message.id);
    
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
  console.log(`🔍 НАЧАЛО getSessionMessages для сессии ${sessionId}`);
  // Получаем AI сообщения из базы данных
  const aiMessagesData = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionId))
    .orderBy(aiMessages.createdAt);
    
  console.log('🔍 Сырые данные из БД:', JSON.stringify(aiMessagesData, null, 2));
    
  // Преобразуем в формат для отображения в чате
  const formattedMessages = aiMessagesData.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: msg.sender, // 'user' или 'ai'
    timestamp: msg.createdAt,
    provider: msg.provider,
    imageUrl: msg.imageUrl // Используем правильное имя поля из схемы БД
  }));
  
  console.log('📋 Отформатированные сообщения:', JSON.stringify(formattedMessages, null, 2));
    
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
  deleteSession,
  generateChatTitle
};