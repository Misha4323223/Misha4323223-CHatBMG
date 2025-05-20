// Простой JavaScript обработчик для имитации G4F
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обработчик для запросов простого чата
export async function handleSimpleG4F(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    console.log(`Запрос к чату: сообщение=${userMessage.substring(0, 30)}...`);
    
    // Получаем модель из запроса или используем gpt-3.5-turbo по умолчанию
    const model = req.body.model || "gpt-3.5-turbo";
    console.log(`Используемая модель: ${model}`);
    
    // Создаем имитацию ответа
    const response = await generateSimpleResponse(userMessage, model);
    
    console.log("Ответ получен:", response.substring(0, 30) + "...");
    
    // Отправляем ответ клиенту
    res.json({ response });
  } catch (error) {
    console.error("Ошибка обработки запроса:", error);
    res.status(500).json({ 
      error: "Ошибка при обработке запроса",
      message: error.message
    });
  }
}

// Функция для генерации имитации ответа ИИ
async function generateSimpleResponse(message, model) {
  // Добавляем небольшую задержку для имитации сетевого запроса
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Базовые ответы для разных типов вопросов
  if (message.toLowerCase().includes('привет') || message.toLowerCase().includes('здравствуй')) {
    return `Привет! Я ИИ-ассистент на базе модели ${model}. Чем могу помочь вам сегодня?`;
  }
  
  if (message.toLowerCase().includes('как дела') || message.toLowerCase().includes('как ты')) {
    return `Спасибо, что спросили! У меня всё хорошо. Я готов помогать вам с вопросами и задачами.`;
  }
  
  if (message.toLowerCase().includes('кто ты') || message.toLowerCase().includes('что ты')) {
    return `Я ИИ-ассистент, работающий на базе модели ${model}. Я могу отвечать на вопросы, помогать с задачами и поддерживать беседу на различные темы.`;
  }
  
  if (message.toLowerCase().includes('погода')) {
    return `На данный момент я не могу получить актуальные данные о погоде, так как не имею доступа к интернету в режиме реального времени. Вы можете уточнить ваш вопрос или спросить о чем-то другом?`;
  }
  
  if (message.toLowerCase().includes('помоги') || message.toLowerCase().includes('помощь')) {
    return `Я могу помочь вам с различными вопросами и задачами. Например, могу объяснить сложные концепции, помочь с решением задач, предложить идеи или просто поддержать беседу. Что именно вас интересует?`;
  }
  
  if (message.toLowerCase().includes('спасибо') || message.toLowerCase().includes('благодар')) {
    return `Пожалуйста! Я рад, что смог помочь. Если у вас появятся еще вопросы, не стесняйтесь спрашивать.`;
  }
  
  // Генерируем ответ на основе ключевых слов в сообщении
  if (message.toLowerCase().includes('программир') || message.toLowerCase().includes('код')) {
    return `Программирование - это увлекательная область, где можно создавать практически всё что угодно с помощью кода. Для начинающих я бы рекомендовал изучить основы HTML, CSS и JavaScript, если вас интересует веб-разработка. Python также является отличным языком для новичков благодаря своему простому синтаксису.`;
  }
  
  if (message.toLowerCase().includes('искусств') && message.toLowerCase().includes('интеллект')) {
    return `Искусственный интеллект - это область информатики, которая фокусируется на создании систем, способных выполнять задачи, требующие человеческого интеллекта. Современные ИИ, такие как я, основаны на больших языковых моделях, обученных на огромных массивах текстовых данных с использованием технологий глубокого обучения.`;
  }
  
  // Общий ответ для других типов вопросов
  return `Ваш вопрос "${message}" интересен. Я могу подробно обсудить эту тему. Чтобы дать более точный ответ, не могли бы вы уточнить, какой аспект этой темы вас интересует больше всего?`;
}

// Обработчик для отображения страницы Simple G4F
export function simpleG4FPage(req, res) {
  res.sendFile(path.join(process.cwd(), "g4f-simple.html"));
}