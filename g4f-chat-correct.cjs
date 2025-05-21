// Правильная интеграция с G4F для BOOOMERANGS
const g4f = require('g4f');

// Создаем экземпляр G4F
const g4fInstance = new g4f.G4F();

// Список приоритетных провайдеров 
// Выбираем только бесплатные, которые не требуют API ключей
const PROVIDERS = [
  { name: 'Bing', models: ['gpt-4'] },
  { name: 'You', models: ['you-chat'] },
  { name: 'GptGo', models: ['gpt-3.5-turbo'] },
  { name: 'ChatgptAi', models: ['gpt-3.5-turbo'] },
  { name: 'Phind', models: ['phind-gpt-4'] },
  { name: 'Qwen', models: ['qwen-max'] },
  { name: 'Cohere', models: ['command-r-plus'] }
];

// Набор предварительно подготовленных ответов для критических сценариев
const DEMO_RESPONSES = [
  {
    prompt: "привет",
    response: "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
  },
  {
    prompt: "расскажи о booomerangs",
    response: "BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом, который объединяет возможности текстовых AI-моделей и генерации изображений. С BOOOMERANGS вы можете бесплатно использовать функции, аналогичные ChatGPT и DALL-E, без необходимости платить за подписки или покупать API ключи. Наше приложение работает напрямую в браузере и оптимизировано для использования на мобильных устройствах."
  },
  {
    prompt: "что ты умеешь",
    response: "Я умею многое! Вот мои основные возможности:\n\n1. Отвечать на ваши вопросы с использованием современных AI-моделей\n2. Генерировать текстовые описания и контент\n3. Помогать с решением проблем\n4. Давать рекомендации\n\nКроме того, BOOOMERANGS приложение позволяет:\n• Создавать изображения по текстовому описанию\n• Конвертировать изображения в SVG формат\n• Использовать различные AI-провайдеры для получения разнообразных ответов"
  },
  {
    prompt: "как генерировать изображения",
    response: "Для генерации изображений в BOOOMERANGS:\n\n1. Перейдите на вкладку 'Генератор Изображений'\n2. Введите текстовое описание изображения, которое хотите создать\n3. Нажмите кнопку 'Сгенерировать изображение'\n4. Дождитесь результата и используйте полученное изображение\n5. При желании конвертируйте его в SVG формат, нажав соответствующую кнопку\n\nСоветы для лучших результатов:\n• Давайте подробные описания\n• Указывайте стиль (акварель, фотореализм, аниме и т.д.)\n• Используйте слова, описывающие настроение и атмосферу"
  }
];

/**
 * Получение демо-ответа по ключевым словам в запросе
 */
function getDemoResponse(message) {
  // Приводим запрос к нижнему регистру для лучшего сравнения
  const normalizedMessage = message.toLowerCase();
  
  // Проверяем наличие ключевых слов в запросе
  for (const demo of DEMO_RESPONSES) {
    if (normalizedMessage.includes(demo.prompt)) {
      return demo.response;
    }
  }
  
  // Возвращаем базовый ответ, если ничего не найдено
  return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!";
}

/**
 * Получение ответа от G4F с автоматическим перебором провайдеров
 */
async function getResponseFromG4F(message, options = {}) {
  const { temperature = 0.7, provider = null, timeout = 5000 } = options;
  
  try {
    // Пробуем сначала получить ответ от G4F провайдеров с таймаутом
    return await Promise.race([
      _getResponseFromProviders(message, temperature, provider),
      // Если провайдеры не отвечают в течение указанного времени, переходим к демо-режиму
      new Promise((_, reject) => setTimeout(() => 
        reject(new Error('Timeout: провайдеры не отвечают')), timeout))
    ]);
  } catch (error) {
    console.log('Переключаемся на демо-режим из-за ошибки:', error.message);
    
    // Если произошла ошибка или таймаут, возвращаем демо-ответ
    const demoResponse = getDemoResponse(message);
    
    return {
      response: demoResponse,
      provider: 'BOOOMERANGS-Demo',
      model: 'demo-mode'
    };
  }
}

/**
 * Внутренняя функция для получения ответа от провайдеров
 */
async function _getResponseFromProviders(message, temperature, specificProvider) {
  // Список провайдеров для перебора
  const providersToTry = specificProvider ? 
    PROVIDERS.filter(p => p.name.toLowerCase() === specificProvider.toLowerCase()) : 
    PROVIDERS;
    
  if (providersToTry.length === 0) {
    throw new Error(`Провайдер ${specificProvider} не найден в списке доступных провайдеров`);
  }
  
  console.log(`Перебираем ${providersToTry.length} провайдеров...`);
  
  // Сохраняем последнюю ошибку для отладки
  let lastError = null;
  
  // Перебираем все провайдеры
  for (const providerInfo of providersToTry) {
    try {
      console.log(`Пробуем провайдер: ${providerInfo.name}`);
      
      // Создаем параметры для запроса
      const params = {
        provider: providerInfo.name,
        messages: [{ role: 'user', content: message }],
        temperature: temperature,
      };
      
      // Если у провайдера есть модели, выбираем первую
      if (providerInfo.models && providerInfo.models.length > 0) {
        params.model = providerInfo.models[0];
        console.log(`Используем модель: ${params.model}`);
      }
      
      // Выполняем запрос к API G4F
      const response = await g4fInstance.chatCompletion(params);
      
      console.log(`Получен ответ от ${providerInfo.name}`);
      
      return {
        response: response,
        provider: providerInfo.name,
        model: params.model || 'default'
      };
    } catch (error) {
      console.error(`Ошибка при использовании провайдера ${providerInfo.name}:`, error.message);
      lastError = error;
      // Продолжаем со следующим провайдером
    }
  }
  
  // Если все провайдеры не сработали, возвращаем ошибку
  throw new Error(`Все провайдеры не ответили. Последняя ошибка: ${lastError ? lastError.message : 'Неизвестная ошибка'}`);
}

/**
 * Получение списка доступных провайдеров
 */
function getAvailableProviders() {
  return PROVIDERS;
}

module.exports = {
  getResponseFromG4F,
  getAvailableProviders
};