import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5000;

// Получаем правильные пути для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Обслуживаем статические файлы
app.use(express.static(__dirname));

// Тестовая страница
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-page.html'));
});

// Маршрут для генератора изображений
app.get('/image-generator', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Генератор изображений</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #4a56e2;
      text-align: center;
    }
    .card {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    textarea, select {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background-color: #4a56e2;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #3a46c2;
    }
    .image-container {
      text-align: center;
      margin-top: 20px;
      display: none;
    }
    .image-container img {
      max-width: 100%;
      max-height: 400px;
      border-radius: 4px;
    }
    .back-link {
      display: block;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Генератор изображений</h1>
  
  <div class="card">
    <div class="form-group">
      <label for="prompt">Описание изображения:</label>
      <textarea id="prompt" rows="4" placeholder="Например: горный пейзаж на закате"></textarea>
    </div>
    
    <div class="form-group">
      <label for="style">Стиль:</label>
      <select id="style">
        <option value="realistic">Реалистичный</option>
        <option value="abstract">Абстрактный</option>
        <option value="minimal">Минималистичный</option>
      </select>
    </div>
    
    <button id="generate-btn">Создать изображение</button>
  </div>
  
  <div id="image-result" class="card image-container">
    <h2>Результат:</h2>
    <img id="result-image" src="" alt="Сгенерированное изображение">
  </div>
  
  <a href="/test" class="back-link">Вернуться на главную</a>
  
  <script>
    // Обработка нажатия на кнопку генерации
    document.getElementById('generate-btn').addEventListener('click', function() {
      const prompt = document.getElementById('prompt').value.trim();
      
      if (!prompt) {
        alert('Пожалуйста, введите описание изображения');
        return;
      }
      
      // Получаем изображение с Unsplash по ключевым словам
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = \`https://source.unsplash.com/800x600/?\${encodedPrompt}&random=\${Math.random()}\`;
      
      // Отображаем результат
      document.getElementById('result-image').src = imageUrl;
      document.getElementById('image-result').style.display = 'block';
    });
  </script>
</body>
</html>
  `);
});

// Маршрут для простого чата с AI
app.get('/chat', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Простой чат с AI</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #4a56e2;
      text-align: center;
    }
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 70vh;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .message {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 8px;
    }
    .user-message {
      background-color: #4a56e2;
      color: white;
      margin-left: 20%;
    }
    .ai-message {
      background-color: #e9e9e9;
      margin-right: 20%;
    }
    .input-area {
      display: flex;
      gap: 10px;
    }
    .input-area textarea {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      resize: none;
    }
    .input-area button {
      padding: 10px 15px;
      background-color: #4a56e2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .back-link {
      display: block;
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Простой чат с AI</h1>
  
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="message ai-message">Привет! Я демонстрационная версия чат-бота. Чем я могу помочь?</div>
    </div>
    
    <div class="input-area">
      <textarea id="user-input" placeholder="Напишите сообщение..."></textarea>
      <button id="send-btn">Отправить</button>
    </div>
  </div>
  
  <a href="/test" class="back-link">Вернуться на главную</a>
  
  <script>
    // Функция для добавления сообщения
    function addMessage(text, isUser) {
      const messagesContainer = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = \`message \${isUser ? 'user-message' : 'ai-message'}\`;
      messageDiv.textContent = text;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Функция для генерации ответа (демо-версия)
    function generateResponse(input) {
      const responses = [
        "Это интересная мысль. Расскажите больше?",
        "Я понимаю вашу точку зрения. Что бы вы хотели узнать еще?",
        "Отличный вопрос! В реальной версии я бы использовал G4F для полноценного ответа.",
        "В этой демо-версии мои возможности ограничены, но в полной версии я использую модель Qwen для более точных ответов.",
        "Для создания изображения по вашему запросу, вы можете использовать наш генератор изображений.",
        "Я могу помочь с множеством задач. Что именно вас интересует?",
        "Это отличный вопрос для полной версии G4F!"
      ];
      
      // Возвращаем случайный ответ
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Обработка отправки сообщения
    document.getElementById('send-btn').addEventListener('click', function() {
      const userInput = document.getElementById('user-input');
      const userMessage = userInput.value.trim();
      
      if (!userMessage) return;
      
      // Добавляем сообщение пользователя
      addMessage(userMessage, true);
      userInput.value = '';
      
      // Имитируем задержку ответа
      setTimeout(() => {
        const response = generateResponse(userMessage);
        addMessage(response, false);
      }, 1000);
    });
    
    // Обработка нажатия Enter
    document.getElementById('user-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-btn').click();
      }
    });
  </script>
</body>
</html>
  `);
});

// Главная страница
app.get('/', (req, res) => {
  res.redirect('/test');
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT}/test в браузере`);
});