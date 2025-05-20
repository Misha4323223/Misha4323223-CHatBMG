// G4F провайдер для бесплатного доступа к моделям GPT
import path from 'path';
import { fileURLToPath } from 'url';
import g4f from 'g4f';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обработчик для запросов к G4F
export async function handleG4FRequest(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    console.log(`Запрос к G4F: сообщение=${userMessage.substring(0, 30)}...`);
    
    // Получаем модель из запроса или используем gpt-4 по умолчанию
    const model = req.body.model || "gpt-4";
    console.log(`Запрошенная модель: ${model}`);
    
    try {
      // Создаем экземпляр G4F
      const g4fInstance = new g4f.G4F();
      
      // Получаем доступ к провайдеру GPT
      const gptProvider = g4fInstance.providers.GPT;
      
      if (!gptProvider || !gptProvider.working) {
        throw new Error("Провайдер GPT недоступен");
      }
      
      // Подготавливаем данные для запроса
      const requestData = {
        messages: [{ role: "user", content: userMessage }],
        model: model || gptProvider.default_model
      };
      
      console.log("Отправка запроса к провайдеру GPT...");
      
      // Прямой вызов fetchData и обработка ответа
      const response = await gptProvider.fetchData(
        gptProvider.url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: requestData.model,
            messages: requestData.messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        }
      );
      
      // Обрабатываем ответ
      const responseData = await response.json();
      
      // Извлекаем текст из ответа
      let responseText = "";
      
      if (responseData && responseData.choices && responseData.choices.length > 0) {
        responseText = responseData.choices[0].message.content;
      } else if (responseData && responseData.message) {
        responseText = responseData.message;
      } else {
        responseText = JSON.stringify(responseData);
      }
      
      console.log("Ответ от G4F получен:", responseText.substring(0, 30) + "...");
      
      // Отправляем ответ клиенту
      res.json({ response: responseText });
    } catch (innerError) {
      console.error("Ошибка при вызове G4F:", innerError);
      
      // Если провайдер GPT не работает, пробуем альтернативный провайдер Bing
      try {
        console.log("Пробуем альтернативный провайдер Bing...");
        
        const g4fInstance = new g4f.G4F();
        const bingProvider = g4fInstance.providers.Bing;
        
        if (!bingProvider || !bingProvider.working) {
          throw new Error("Провайдер Bing недоступен");
        }
        
        // Подготавливаем данные для запроса к Bing
        const response = await bingProvider.fetchData(
          bingProvider.url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: bingProvider.default_model,
              messages: [{ role: "user", content: userMessage }]
            })
          }
        );
        
        // Обрабатываем ответ от Bing
        const responseData = await response.json();
        let responseText = "";
        
        if (responseData && responseData.choices && responseData.choices.length > 0) {
          responseText = responseData.choices[0].message.content;
        } else if (responseData && responseData.message) {
          responseText = responseData.message;
        } else {
          responseText = JSON.stringify(responseData);
        }
        
        console.log("Ответ от Bing получен:", responseText.substring(0, 30) + "...");
        
        // Отправляем ответ клиенту
        res.json({ response: responseText });
      } catch (bingError) {
        console.error("Ошибка при использовании Bing:", bingError);
        
        // Если и Bing не работает, возвращаем ошибку
        res.status(200).json({ 
          response: "Извините, сейчас все G4F провайдеры недоступны. Пожалуйста, попробуйте позже или используйте другую модель." 
        });
      }
    }
  } catch (error) {
    console.error("Общая ошибка G4F:", error);
    res.status(500).json({ 
      error: "Ошибка при обработке запроса", 
      message: error.message 
    });
  }
}

// Обработчик для страницы G4F чата
export function g4fPage(req, res) {
  res.sendFile(path.join(process.cwd(), "g4f-chat.html"));
}