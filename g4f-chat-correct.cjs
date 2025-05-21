// Правильная интеграция с G4F для BOOOMERANGS
const g4f = require('g4f');

// Создаем экземпляр G4F
const g4fInstance = new g4f.G4F();

// Список приоритетных провайдеров
const PROVIDERS = [
  { name: 'Bing', models: ['gpt-4'] },
  { name: 'ChatgptAi', models: ['gpt-3.5-turbo'] },
  { name: 'Phind', models: ['phind-gpt-4'] },
  { name: 'Perplexity', models: ['llama-3.1-sonar-small-128k-online'] },
  { name: 'GptGo', models: ['gpt-3.5-turbo'] },
  { name: 'You', models: ['you-chat'] }
];

/**
 * Получение ответа от G4F с автоматическим перебором провайдеров
 */
async function getResponseFromG4F(message, options = {}) {
  const { temperature = 0.7, provider = null } = options;
  
  // Список провайдеров для перебора
  const providersToTry = provider ? 
    PROVIDERS.filter(p => p.name.toLowerCase() === provider.toLowerCase()) : 
    PROVIDERS;
    
  if (providersToTry.length === 0) {
    throw new Error(`Провайдер ${provider} не найден в списке доступных провайдеров`);
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