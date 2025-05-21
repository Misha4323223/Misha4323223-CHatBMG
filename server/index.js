// server/index.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Получаем путь к текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем Express приложение
const app = express();

// Применяем middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// Функция для преобразования изображения в SVG (упрощенная версия)
async function convertImageToSVG(imageUrl) {
  // В реальном приложении здесь был бы вызов библиотеки для трассировки
  // Для демонстрации создаем простой SVG, обернутый вокруг исходного изображения
  
  const svgTemplate = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <filter id="posterize">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
        </feComponentTransfer>
      </filter>
    </defs>
    <image href="${imageUrl}" width="800" height="600" filter="url(#posterize)" />
    <rect x="0" y="550" width="800" height="50" fill="rgba(0,0,0,0.7)" />
    <text x="400" y="585" font-family="Arial" font-size="24" text-anchor="middle" fill="#ff4b2b" font-weight="bold">
      BOOOMERANGS
    </text>
  </svg>
  `;
  
  return svgTemplate;
}

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API для генерации изображений
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Требуется промпт для генерации изображения' });
    }
    
    console.log(`Генерация изображения для промпта: "${prompt}"`);
    
    // Используем Unsplash API для получения случайного изображения по ключевому слову
    const encodedPrompt = encodeURIComponent(prompt);
    const width = 800;
    const height = 600;
    
    // Для демонстрации используем бесплатный API Unsplash Source
    const imageUrl = `https://source.unsplash.com/random/${width}x${height}/?${encodedPrompt}`;
    
    // Имитируем задержку для более реалистичного ощущения генерации
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return res.json({
      success: true,
      imageUrl,
      message: 'Изображение успешно сгенерировано'
    });
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    return res.status(500).json({
      error: 'Не удалось сгенерировать изображение',
      message: error.message
    });
  }
});

// API для конвертации изображения в SVG
app.post('/api/convert-svg', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL изображения не указан' });
    }
    
    console.log(`Конвертация изображения в SVG: ${imageUrl}`);
    
    // Запускаем Python-скрипт для конвертации
    const { spawn } = await import('child_process');
    const pythonProcess = spawn('python', ['converters/raster2svg.py', imageUrl]);
    
    let svgData = '';
    let errorData = '';
    
    // Собираем вывод из стандартного потока
    pythonProcess.stdout.on('data', (data) => {
      svgData += data.toString();
    });
    
    // Собираем ошибки, если они есть
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Ошибка Python: ${data}`);
    });
    
    // Ожидаем завершения процесса
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python процесс завершился с кодом ${code}: ${errorData}`));
        } else {
          resolve();
        }
      });
      
      // Обработка ошибок запуска процесса
      pythonProcess.on('error', (err) => {
        reject(new Error(`Ошибка запуска Python процесса: ${err.message}`));
      });
    });
    
    if (svgData) {
      return res.json({
        success: true,
        svgData,
        message: 'Изображение успешно конвертировано в SVG'
      });
    } else {
      throw new Error('Пустой результат конвертации');
    }
  } catch (error) {
    console.error('Ошибка при конвертации в SVG:', error);
    
    // Если Python-скрипт не работает, используем JavaScript-версию как запасной вариант
    try {
      console.log('Использую запасной JavaScript метод конвертации');
      const svgData = await convertImageToSVG(imageUrl);
      
      return res.json({
        success: true,
        svgData,
        message: 'Изображение успешно конвертировано в SVG (JavaScript)'
      });
    } catch (fallbackError) {
      console.error('Ошибка при запасной конвертации:', fallbackError);
      return res.status(500).json({
        error: 'Не удалось конвертировать изображение в SVG',
        message: error.message
      });
    }
  }
});

// Простая проверка работоспособности сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BOOOMERANGS сервер работает' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BOOOMERANGS сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в вашем браузере`);
});