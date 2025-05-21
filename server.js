// Простой сервер для приложения BOOOMERANGS
const express = require('express');
const app = express();
const { exec } = require('child_process');
const path = require('path');

// Поддержка JSON для API запросов
app.use(express.json());

// Раздача статических файлов из директории client
app.use(express.static('client'));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API для генерации изображения
app.post('/generate-image', (req, res) => {
  // Получаем промпт из запроса или используем заглушку
  const prompt = req.body.prompt || 'landscape';
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Генерируем случайное изображение из Unsplash (не требует API ключей)
  const width = 800;
  const height = 600;
  const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodedPrompt}`;
  
  // Перенаправляем на изображение из Unsplash
  res.redirect(imageUrl);
});

// API для конвертации в SVG (упрощенная версия)
app.post('/convert-svg', (req, res) => {
  const imageUrl = req.body.imageUrl;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Не указан URL изображения' });
  }
  
  // Создаем простой SVG с изображением и градиентным фоном
  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff4b2b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff416c;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#grad)" opacity="0.2" />
      <image href="${imageUrl}" width="800" height="600" />
      <rect x="0" y="550" width="800" height="50" fill="rgba(0,0,0,0.7)" />
      <text x="400" y="585" font-family="Arial" font-size="24" text-anchor="middle" fill="#ff4b2b" font-weight="bold">
        BOOOMERANGS
      </text>
    </svg>
  `;
  
  res.json({ svgData });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BOOOMERANGS сервер запущен на порту ${PORT}`);
});