// Простой JavaScript обработчик для G4F
import path from 'path';
import { fileURLToPath } from 'url';
import { G4F } from 'g4f';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обработчик для запросов простого G4F чата
export async function handleSimpleG4F(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    console.log(`Запрос к Simple G4F: сообщение=${userMessage.substring(0, 30)}...`);
    
    // Создаем запрос к G4F с использованием правильного класса
    try {
      // Создаем экземпляр G4F
      const g4f = new G4F();
      
      // Вызываем метод chat для отправки сообщения
      const response = await g4f.chat(userMessage);
      
      console.log("Ответ от G4F получен:", response.substring(0, 30) + "...");
      
      res.json({ response });
    } catch (innerError) {
      console.error("Ошибка при вызове G4F API:", innerError);
      
      // Если не удалось вызвать G4F API, используем заготовленный ответ
      const fallbackResponse = "Извините, в данный момент не удалось подключиться к сервису G4F. Пожалуйста, попробуйте позже или задайте другой вопрос.";
      res.json({ response: fallbackResponse });
    }
  } catch (error) {
    console.error("Ошибка Simple G4F:", error);
    res.status(500).json({ 
      error: "Ошибка при обработке запроса",
      message: error.message
    });
  }
}

// Обработчик для отображения страницы Simple G4F
export function simpleG4FPage(req, res) {
  res.sendFile(path.join(process.cwd(), "g4f-simple.html"));
}