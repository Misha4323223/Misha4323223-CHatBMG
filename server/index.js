// server/index.js
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// Основной маршрут для клиентского приложения
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// API для генерации изображения
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Не указан промпт для генерации' });
    }
    
    console.log(`Генерация изображения для промпта: "${prompt}"`);
    
    // В реальном проекте здесь был бы запрос к сервису генерации изображений
    // Для демонстрации используем случайные изображения
    const seed = encodeURIComponent(prompt);
    const randomId = Math.floor(Math.random() * 1000);
    
    // Используем Unsplash для получения красивых случайных изображений
    const imageUrl = `https://source.unsplash.com/random/512x512/?${seed}`;
    
    // Для демонстрации делаем небольшую задержку, чтобы имитировать обработку
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return res.json({ 
      success: true, 
      imageUrl,
      message: 'Изображение успешно сгенерировано' 
    });
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    res.status(500).json({ 
      error: 'Ошибка при генерации изображения', 
      message: error.message 
    });
  }
});

// API для конвертации в SVG
app.post('/api/convert-svg', (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL изображения не указан' });
    }
    
    console.log(`Конвертация изображения в SVG: ${imageUrl}`);
    
    // Запускаем Python-скрипт для конвертации
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../converters/raster2svg.py'), 
      imageUrl
    ]);
    
    let svgData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      svgData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Ошибка Python: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python процесс завершился с кодом ${code}`);
        return res.status(500).json({ 
          error: 'Ошибка конвертации в SVG',
          message: errorData || 'Неизвестная ошибка при конвертации'
        });
      }
      
      if (svgData) {
        res.json({ 
          success: true, 
          svgData,
          message: 'Изображение успешно конвертировано в SVG'
        });
      } else {
        res.status(500).json({ 
          error: 'Пустой результат конвертации',
          message: 'Скрипт не вернул SVG данные'
        });
      }
    });
  } catch (error) {
    console.error('Ошибка при конвертации в SVG:', error);
    res.status(500).json({ 
      error: 'Ошибка при конвертации в SVG', 
      message: error.message 
    });
  }
});

// API для тестирования сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер BOOOMERANGS работает' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BOOOMERANGS сервер запущен на порту ${PORT}`);
});