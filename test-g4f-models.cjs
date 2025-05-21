// Тестовый скрипт для проверки доступных провайдеров и моделей G4F
const g4f = require('g4f');

// Выводим информацию о библиотеке G4F
console.log('Доступные свойства и методы G4F:');
console.log(Object.keys(g4f));
console.log('Доступные свойства и методы g4f.G4F:');
console.log(Object.getOwnPropertyNames(g4f.G4F));

// Список провайдеров с корректными моделями
const providers = [
  { name: 'DeepAi', model: undefined },  // Модель не нужно указывать
  { name: 'Bing', model: undefined },  // Использует внутреннее имя модели
  { name: 'You', model: undefined },  // Использует gpt-3.5 по умолчанию
  { name: 'Bard', model: 'chat-bison' }, // Google Bard
  { name: 'Phind', model: undefined }, // Использует собственную модель
  { name: 'Koala', model: undefined } // Простой веб-интерфейс
];

// Тестируем доступные провайдеры
async function testProviders() {
  console.log('Тестирование провайдеров:');
  
  for (const provider of providers) {
    try {
      console.log(`\nПробуем провайдер: ${provider.name}`);
      
      const result = await g4f.G4F.call(
        provider.name, 
        [{ role: 'user', content: 'Привет! Расскажи о себе в одном предложении.' }],
        provider.model
      );
      
      console.log(`✅ Успех! Ответ от ${provider.name}:`);
      console.log(result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    } catch (err) {
      console.log(`❌ Ошибка для ${provider.name}: ${err.message}`);
    }
  }
}

testProviders().catch(console.error);