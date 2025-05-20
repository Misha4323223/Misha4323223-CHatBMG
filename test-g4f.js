import g4f from 'g4f';

(async () => {
  console.log('Версия G4F:', g4f.version || 'Неизвестна');
  console.log('Доступные свойства G4F:', Object.keys(g4f));
  
  // Создаем экземпляр G4F
  const g4fInstance = new g4f.G4F();
  console.log('Свойства экземпляра G4F:', Object.keys(g4fInstance));
  
  // Проверяем доступные провайдеры
  console.log('Доступные провайдеры:', Object.keys(g4fInstance.providers || {}));
  
  try {
    // Пробуем получить ответ от провайдера GPT
    console.log('Отправка запроса к провайдеру...');
    const gptProvider = g4fInstance.providers.GPT;
    console.log('GPT провайдер:', gptProvider);
    console.log('Методы GPT провайдера:', Object.getOwnPropertyNames(Object.getPrototypeOf(gptProvider)));
    
    // Проверяем поддерживаемые модели
    console.log('Поддерживаемые модели:', gptProvider.default_model);
    
    // Пробуем прямое обращение к провайдеру
    const response = await gptProvider.getCompletions("Привет, как дела?");
    console.log('Ответ:', response);
  } catch (error) {
    console.error('Ошибка при тестировании G4F:', error);
  }
})();
