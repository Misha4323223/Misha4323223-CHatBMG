// Тест для проверки работающих провайдеров G4F
const g4f = require('g4f');

// Создаем экземпляр G4F
const g4fClient = new g4f.G4F();

// Список всех возможных провайдеров для тестирования
const providers = [
  'Bing',
  'You',
  'GptGo',
  'ChatgptAi',
  'Phind',
  'Qwen',
  'Cohere',
  'Bard',
  'Claude',
  'Gemini',
  'HuggingChat',
  'Anthropic'
];

async function testProvider(provider) {
  try {
    console.log(`Тестирую провайдера: ${provider}...`);
    
    const response = await g4fClient.chatCompletion({
      provider: provider,
      messages: [{ role: 'user', content: 'Привет, представься, кто ты?' }],
      temperature: 0.7,
    });
    
    console.log(`✅ УСПЕХ: ${provider} ответил: "${response.substring(0, 50)}..."`);
    return { provider, working: true, response: response };
  } catch (error) {
    console.log(`❌ ОШИБКА: ${provider} не работает. Причина: ${error.message}`);
    return { provider, working: false, error: error.message };
  }
}

async function testAllProviders() {
  console.log('Начинаю тестирование провайдеров G4F...');
  const results = [];
  
  for (const provider of providers) {
    const result = await testProvider(provider);
    results.push(result);
  }
  
  // Выводим итоговый отчет
  console.log('\n--- РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ---');
  
  const workingProviders = results.filter(r => r.working);
  const failedProviders = results.filter(r => !r.working);
  
  console.log(`Работающие провайдеры (${workingProviders.length}/${providers.length}):`);
  workingProviders.forEach(p => console.log(`- ${p.provider}`));
  
  console.log(`\nНе работающие провайдеры (${failedProviders.length}/${providers.length}):`);
  failedProviders.forEach(p => console.log(`- ${p.provider}: ${p.error}`));
  
  return {
    working: workingProviders.map(p => p.provider),
    failed: failedProviders.map(p => ({ provider: p.provider, error: p.error }))
  };
}

// Запускаем тестирование
testAllProviders().then(results => {
  if (results.working.length > 0) {
    // Обновляем список работающих провайдеров
    console.log('\nДля работы G4F рекомендуется использовать следующие провайдеры:');
    console.log(JSON.stringify(results.working, null, 2));
  } else {
    console.log('\nНе найдено работающих провайдеров G4F. Используйте демо-режим.');
  }
});