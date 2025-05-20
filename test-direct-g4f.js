import g4f from 'g4f';

async function testDirectG4F() {
  try {
    console.log('Создание экземпляра G4F...');
    const g4fInstance = new g4f.G4F();
    
    console.log('Доступные провайдеры:', Object.keys(g4fInstance.providers));
    
    // Проверяем все доступные провайдеры
    for (const providerName of Object.keys(g4fInstance.providers)) {
      const provider = g4fInstance.providers[providerName];
      
      // Проверяем только провайдеры чата
      if (provider.type === 'ChatCompletion') {
        console.log(`\nПроверка провайдера ${providerName}:`);
        console.log('URL:', provider.url);
        console.log('Тип:', provider.type);
        console.log('Модель по умолчанию:', provider.default_model);
        console.log('Рабочий статус:', provider.working ? 'Работает' : 'Не работает');
        
        if (provider.working) {
          try {
            // Подготавливаем данные для запроса
            const message = "Привет! Расскажи о себе кратко.";
            console.log(`Отправка запроса к ${providerName} с сообщением: ${message}`);
            
            // Формируем тело запроса
            const requestBody = {
              model: provider.default_model,
              messages: [{ role: "user", content: message }]
            };
            
            console.log('Запрос тела:', JSON.stringify(requestBody, null, 2));
            
            // Отправляем запрос
            const response = await provider.fetchData(
              provider.url,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
              }
            );
            
            // Получаем данные ответа
            const data = await response.json();
            console.log(`Ответ от ${providerName}:`, JSON.stringify(data, null, 2));
            
            // Пытаемся извлечь сообщение
            let answer = 'Ответ не найден';
            
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
              answer = data.choices[0].message.content;
            } else if (data.message) {
              answer = data.message;
            }
            
            console.log(`\nЧатбот ${providerName} ответил:`, answer);
          } catch (error) {
            console.log(`Ошибка при проверке ${providerName}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при тестировании G4F:', error);
  }
}

testDirectG4F();
