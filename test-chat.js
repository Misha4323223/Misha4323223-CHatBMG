import g4f from 'g4f';

async function testChat() {
  try {
    // Создаем новый экземпляр G4F
    const g4fInstance = new g4f.G4F();
    
    console.log('Создан экземпляр G4F:', g4fInstance);
    
    // Пробуем разные варианты отправки сообщения
    try {
      // Вариант 1: Прямой вызов
      const response1 = await g4fInstance("Привет, как дела?");
      console.log('Ответ 1:', response1);
    } catch (e) {
      console.log('Ошибка варианта 1:', e.message);
    }
    
    try {
      // Вариант 2: Через метод .chat если он есть
      if (typeof g4fInstance.chat === 'function') {
        const response2 = await g4fInstance.chat("Как тебя зовут?");
        console.log('Ответ 2:', response2);
      } else {
        console.log('Метод chat не существует');
      }
    } catch (e) {
      console.log('Ошибка варианта 2:', e.message);
    }
    
  } catch (e) {
    console.log('Ошибка инициализации G4F:', e.message);
  }
}

// Запускаем тест
testChat();