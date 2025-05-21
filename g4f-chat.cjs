// G4F интеграция для BOOOMERANGS
const g4f = require('g4f');
const { G4F } = g4f;

// Список провайдеров с приоритетом стабильности
const PROVIDERS = [
  { name: 'Bing', model: 'gpt-4' },
  { name: 'ChatgptAi', model: 'gpt-3.5-turbo' },
  { name: 'Phind', model: 'phind-gpt-4' },
  { name: 'Perplexity', model: 'mixtral-8x7b-instruct' },
  { name: 'GptGo', model: 'gpt-3.5-turbo' },
  { name: 'You', model: 'gpt-3.5-turbo' }
];

async function chatWithG4F(message) {
  console.log('Перебираем провайдеры...');
  
  for (const providerInfo of PROVIDERS) {
    try {
      console.log(`Пробуем провайдер: ${providerInfo.name} с моделью ${providerInfo.model}`);
      
      // Используем g4f напрямую для каждого провайдера
      const response = await g4f.G4F.call(
        providerInfo.name,
        [{ role: 'user', content: message }],
        providerInfo.model
      );
      
      console.log(`Успешно получен ответ от ${providerInfo.name}`);
      
      return {
        response,
        provider: providerInfo.name,
        model: providerInfo.model
      };
    } catch (err) {
      console.warn(`Провайдер ${providerInfo.name} не сработал:`, err.message);
    }
  }

  throw new Error('Все провайдеры не ответили. Попробуйте позже.');
}

// Получение списка доступных провайдеров
function getAvailableProviders() {
  return PROVIDERS;
}

module.exports = {
  chatWithG4F,
  getAvailableProviders
};