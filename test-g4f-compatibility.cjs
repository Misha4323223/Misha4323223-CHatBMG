// Скрипт для тестирования G4F API из пакета
const g4f = require('g4f');

// Выводим версию G4F для подтверждения
console.log(`Используемая версия G4F: ${g4f.version || 'не определена'}`);

// Создаем экземпляр G4F
const g4fClient = new g4f.G4F();

// Проверяем доступные провайдеры в G4F
console.log("\nДоступные провайдеры G4F:");
try {
  console.log(g4fClient.providers);
  console.log(`Всего провайдеров: ${g4fClient.providers ? g4fClient.providers.length : 'Н/Д'}`);
} catch (error) {
  console.error("Ошибка при получении списка провайдеров:", error.message);
}

// Функция для проверки работы провайдера
async function testProvider(providerName) {
  try {
    console.log(`\nТестирование провайдера: ${providerName}`);
    const startTime = Date.now();
    
    // Пытаемся получить ответ от провайдера
    const response = await g4fClient.chatCompletion({
      messages: [{ role: 'user', content: 'Привет! Представься, пожалуйста.' }],
      provider: providerName,
      // Дополнительные параметры если нужно
      temperature: 0.7,
    });
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Успех! Провайдер ${providerName} ответил за ${elapsedTime.toFixed(2)} сек:`);
    console.log(`Ответ: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при использовании провайдера ${providerName}:`, error.message);
    return false;
  }
}

// Список провайдеров для проверки
const providersToTest = [
  'Bing',
  'You',
  'Qwen',
  'DeepAI',
  'ChatBase'
];

// Запускаем тесты асинхронно для каждого провайдера
async function runTests() {
  console.log("\n=== Тестирование доступных провайдеров ===");
  
  const results = [];
  
  for (const provider of providersToTest) {
    const success = await testProvider(provider);
    results.push({ provider, success });
  }
  
  // Выводим общие результаты
  console.log("\n=== Результаты тестирования ===");
  const workingProviders = results.filter(r => r.success);
  console.log(`Работающие провайдеры: ${workingProviders.length}/${results.length}`);
  workingProviders.forEach(r => console.log(`• ${r.provider}`));
  
  const failedProviders = results.filter(r => !r.success);
  console.log(`\nНеработающие провайдеры: ${failedProviders.length}/${results.length}`);
  failedProviders.forEach(r => console.log(`• ${r.provider}`));
}

// Запускаем тесты
runTests().catch(error => {
  console.error("Ошибка при запуске тестов:", error);
});