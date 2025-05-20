// Пример использования G4F библиотеки в Node.js
import g4f from 'g4f';

// Асинхронная функция для работы с G4F
async function chatWithG4F() {
  try {
    console.log("Запуск G4F клиента...");
    
    // Создание экземпляра G4F
    const g4fInstance = new g4f.G4F();
    
    // Вывод доступных провайдеров
    console.log("\nДоступные провайдеры G4F:");
    const providers = Object.keys(g4fInstance.providers);
    providers.forEach(provider => {
      const p = g4fInstance.providers[provider];
      console.log(`- ${provider}: ${p.working ? '✅ работает' : '❌ не работает'} (тип: ${p.type || 'не указан'})`);
    });
    
    // Запрос к GPT провайдеру
    const message = "Привет! Расскажи о себе кратко.";
    console.log(`\nОтправка запроса к GPT провайдеру: "${message}"`);
    
    // Получаем провайдер GPT
    const gptProvider = g4fInstance.providers.GPT;
    
    if (!gptProvider || !gptProvider.working) {
      throw new Error("Провайдер GPT недоступен");
    }
    
    // Формируем запрос
    const requestData = {
      model: gptProvider.default_model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }]
    };
    
    // Отправляем запрос
    console.log("Отправка запроса к API...");
    const response = await gptProvider.fetchData(
      gptProvider.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
      }
    );
    
    // Обрабатываем ответ
    const responseData = await response.json();
    console.log("\nОтвет от сервера:", JSON.stringify(responseData, null, 2));
    
    // Извлекаем текст ответа
    let responseText = "";
    
    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
      responseText = responseData.choices[0].message.content;
    } else if (responseData.message) {
      responseText = responseData.message;
    } else {
      responseText = "Не удалось извлечь текст ответа";
    }
    
    console.log("\nОтвет AI:", responseText);
    
  } catch (error) {
    console.error("\nОшибка при использовании G4F:", error);
    
    // Проверяем альтернативный провайдер
    try {
      console.log("\nПробуем альтернативный провайдер (Bing)...");
      
      const g4fInstance = new g4f.G4F();
      const bingProvider = g4fInstance.providers.Bing;
      
      if (!bingProvider || !bingProvider.working) {
        throw new Error("Провайдер Bing недоступен");
      }
      
      const message = "Привет! Как твои дела?";
      console.log(`Отправка запроса к Bing: "${message}"`);
      
      // Формируем запрос
      const requestData = {
        model: bingProvider.default_model || "gpt-4",
        messages: [{ role: "user", content: message }]
      };
      
      // Отправляем запрос
      const response = await bingProvider.fetchData(
        bingProvider.url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestData)
        }
      );
      
      // Обрабатываем ответ
      const responseData = await response.json();
      console.log("\nОтвет от Bing:", JSON.stringify(responseData, null, 2));
      
      // Извлекаем текст ответа
      let responseText = "";
      
      if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
        responseText = responseData.choices[0].message.content;
      } else if (responseData.message) {
        responseText = responseData.message;
      } else {
        responseText = "Не удалось извлечь текст ответа";
      }
      
      console.log("\nОтвет Bing:", responseText);
      
    } catch (bingError) {
      console.error("\nОшибка при использовании альтернативного провайдера:", bingError);
    }
  }
}

// Запуск функции
chatWithG4F()
  .then(() => console.log("\nЗавершено"))
  .catch(error => console.error("\nНепредвиденная ошибка:", error));