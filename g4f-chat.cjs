// G4F интеграция для BOOOMERANGS
const { G4F } = require('g4f');

const g4f = new G4F();

// Фильтруем провайдеры, исключая нестабильные
const safeProviders = G4F.providers.filter(
  (p) => !['FreeGpt', 'Liaobots', 'You'].includes(p.name)
);

async function chatWithG4F(message) {
  console.log('Доступные провайдеры:', safeProviders.map(p => p.name).join(', '));
  
  for (const provider of safeProviders) {
    try {
      console.log(`Пробуем провайдер: ${provider.name}`);
      
      // Выбираем модель - предпочитаем GPT-4, если доступна
      const model = provider.models.includes('gpt-4') ? 'gpt-4' : provider.models[0];
      console.log(`Использую модель: ${model}`);

      const res = await provider.createChatCompletion({
        model,
        messages: [{ role: 'user', content: message }],
      });

      return {
        response: res,
        provider: provider.name,
        model: model
      };
    } catch (err) {
      console.warn(`Провайдер ${provider.name} не сработал:`, err.message);
    }
  }

  throw new Error('Все провайдеры не ответили. Попробуйте позже.');
}

// Получение списка доступных провайдеров
function getAvailableProviders() {
  return safeProviders.map(p => ({
    name: p.name,
    models: p.models,
    supports_stream: p.supports_stream
  }));
}

module.exports = {
  chatWithG4F,
  getAvailableProviders
};