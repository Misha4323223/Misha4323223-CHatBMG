import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import potrace from 'potrace';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Получаем текущую директорию для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Включаем парсинг JSON и CORS
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Создаем временную директорию, если её нет
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Функция для отправки запроса на Craiyon API
async function generateImageWithCraiyon(prompt) {
  console.log(`Генерация изображения с Craiyon для запроса: "${prompt}"`);
  
  try {
    const response = await fetch('https://api.craiyon.com/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: '',
        model: 'photo',
        version: 'c4ue22fb7kb6wlaz',
        token: ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка API Craiyon: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Получаем первое изображение
    if (data.images && data.images.length > 0) {
      return data.images[0];
    } else {
      throw new Error('API Craiyon не вернуло изображений');
    }
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    throw error;
  }
}

// Функция для конвертации Base64 PNG в SVG с использованием Potrace
async function convertToSvg(base64Image) {
  return new Promise(async (resolve, reject) => {
    try {
      // Декодируем Base64 в буфер
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Сохраняем во временный файл для обработки
      const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);
      
      // Используем sharp для оптимизации изображения перед трассировкой
      await sharp(imageBuffer)
        .grayscale()
        .resize(800, 800, { fit: 'inside' })
        .toFile(tempPngPath);
      
      // Настраиваем Potrace для трассировки
      const potraceParams = {
        threshold: 128,
        turdSize: 2,
        optTolerance: 0.2,
        alphaMax: 1,
        color: '#000000'
      };
      
      // Трассируем изображение
      potrace.trace(tempPngPath, potraceParams, (err, svg) => {
        // Удаляем временный файл
        fs.unlink(tempPngPath, () => {});
        
        if (err) {
          return reject(err);
        }
        
        resolve(svg);
      });
    } catch (error) {
      console.error('Ошибка при конвертации в SVG:', error);
      reject(error);
    }
  });
}

// Эндпоинт для генерации изображения
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Отсутствует параметр prompt' });
    }
    
    console.log(`Получен запрос на генерацию изображения: "${prompt}"`);
    
    // Генерируем изображение с помощью Craiyon
    const base64Image = await generateImageWithCraiyon(prompt);
    
    // Конвертируем в SVG
    const svg = await convertToSvg(base64Image);
    
    // Отправляем SVG в ответе
    res.json({ svg });
    
  } catch (error) {
    console.error('Ошибка обработки запроса:', error);
    res.status(500).json({ 
      error: 'Ошибка при обработке запроса', 
      message: error.message 
    });
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} для доступа к интерфейсу`);
});