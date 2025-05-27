/**
 * Умный анализатор намерений для команд редактирования изображений
 * Использует AI для понимания смысла команд без жестких паттернов
 */

/**
 * Анализирует сообщение пользователя на предмет команд редактирования изображений
 * @param {string} message - Сообщение пользователя
 * @param {string} context - Контекст разговора (если есть)
 * @returns {Promise<Object>} Результат анализа намерений
 */
async function analyzeIntentWithAI(message, context = '') {
  try {
    console.log('🧠 [INTENT] Анализируем намерение сообщения:', message);
    
    // Системный промпт для анализа намерений
    const systemPrompt = `Ты эксперт по анализу намерений пользователя для системы редактирования изображений.

Твоя задача: определить, является ли сообщение пользователя командой для редактирования/создания изображения.

АНАЛИЗИРУЙ:
- Команды создания: "создай", "нарисуй", "сгенерируй", "дизайн", "принт"
- Команды редактирования: "убери", "удали", "добавь", "измени", "поменяй", "без", "сделай"
- Объекты: "меч", "шлем", "оружие", "фон", "цвет", "надпись", "текст"

ОТВЕЧАЙ ТОЛЬКО В JSON ФОРМАТЕ:
{
  "isImageCommand": true/false,
  "action": "create/edit/null",
  "target": "меч/шлем/фон/цвет/null",
  "operation": "убрать/добавить/изменить/создать/null",
  "confidence": 0.0-1.0,
  "enhancedPrompt": "улучшенный промпт для генератора"
}`;

    const userPrompt = `Контекст: ${context}
Сообщение пользователя: "${message}"

Проанализируй намерение и ответь в JSON формате.`;

    // Используем Claude для анализа намерений (он лучше всего понимает контекст)
    const g4fProvider = require('./g4f-provider');
    
    const response = await g4fProvider.getResponse(userPrompt, {
      systemPrompt: systemPrompt,
      provider: 'Claude', // Claude отлично анализирует намерения
      temperature: 0.1, // Низкая температура для точного анализа
      timeout: 10000
    });

    if (response.success && response.text) {
      console.log('🧠 [INTENT] Ответ AI:', response.text);
      
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intentData = JSON.parse(jsonMatch[0]);
        console.log('🧠 [INTENT] Проанализированное намерение:', intentData);
        return intentData;
      }
    }

    // Fallback: если AI не ответил, используем простую проверку
    return simpleIntentAnalysis(message);

  } catch (error) {
    console.error('🧠 [INTENT] Ошибка анализа намерений:', error);
    // Fallback на простой анализ
    return simpleIntentAnalysis(message);
  }
}

/**
 * Простой анализ намерений как fallback
 * @param {string} message - Сообщение пользователя
 * @returns {Object} Результат простого анализа
 */
function simpleIntentAnalysis(message) {
  const msg = message.toLowerCase();
  
  // Проверяем команды создания
  const createPatterns = [
    /создай.*принт/i, /нарисуй/i, /сгенерируй.*картинк/i,
    /дизайн.*футболк/i, /принт.*футболк/i, /создай.*изображение/i,
    /логотип/i, /рисунок/i, /макет/i, /концепт/i
  ];
  
  // Проверяем команды редактирования
  const editPatterns = [
    /убери.*мечи/i, /убери.*меч/i, /убери.*шлем/i, /убери.*надпись/i,
    /удали.*мечи/i, /удали.*меч/i, /удали.*шлем/i, /удали.*текст/i,
    /измени.*цвет/i, /измени.*шлем/i, /добавь.*на.*фон/i,
    /добавь.*грибы/i, /добавь.*цветы/i, /без.*мечей/i, /без.*шлема/i
  ];
  
  const isCreate = createPatterns.some(pattern => pattern.test(message));
  const isEdit = editPatterns.some(pattern => pattern.test(message));
  
  if (isCreate) {
    return {
      isImageCommand: true,
      action: 'create',
      target: null,
      operation: 'создать',
      confidence: 0.8,
      enhancedPrompt: message
    };
  }
  
  if (isEdit) {
    let target = null;
    let operation = null;
    
    if (/меч|оружие|клинок|катана/i.test(msg)) target = 'меч';
    if (/шлем|каска|головной убор/i.test(msg)) target = 'шлем';
    if (/фон|задний план/i.test(msg)) target = 'фон';
    if (/цвет|окрас/i.test(msg)) target = 'цвет';
    
    if (/убери|удали|без/i.test(msg)) operation = 'убрать';
    if (/добавь|поставь/i.test(msg)) operation = 'добавить';
    if (/измени|поменяй/i.test(msg)) operation = 'изменить';
    
    return {
      isImageCommand: true,
      action: 'edit',
      target: target,
      operation: operation,
      confidence: 0.7,
      enhancedPrompt: `Отредактируй изображение техносамурая: ${message}. Сохрани общий стиль и композицию.`
    };
  }
  
  return {
    isImageCommand: false,
    action: null,
    target: null,
    operation: null,
    confidence: 0.0,
    enhancedPrompt: null
  };
}

/**
 * Быстрая проверка - является ли сообщение командой для изображений
 * @param {string} message - Сообщение пользователя
 * @returns {boolean} Является ли командой для изображений
 */
function isLikelyImageCommand(message) {
  const imageKeywords = [
    'создай', 'нарисуй', 'сгенерируй', 'дизайн', 'принт', 'логотип',
    'убери', 'удали', 'добавь', 'измени', 'поменяй', 'замени', 'без', 'сделай',
    'меч', 'шлем', 'оружие', 'фон', 'цвет', 'изображение', 'картинк', 'железка'
  ];
  
  const msg = message.toLowerCase();
  return imageKeywords.some(keyword => msg.includes(keyword));
}

module.exports = {
  analyzeIntentWithAI,
  simpleIntentAnalysis,
  isLikelyImageCommand
};