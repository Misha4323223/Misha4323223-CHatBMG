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

// Функция для генерации изображения через Unsplash API (не требует ключа)
async function generateImageWithUnsplash(prompt) {
  console.log(`Генерация изображения через Unsplash для запроса: "${prompt}"`);
  
  try {
    // Формируем запрос для Unsplash
    const query = encodeURIComponent(prompt);
    const width = 800;
    const height = 600;
    
    // Используем публичный API Unsplash Source (не требует ключа)
    const unsplashUrl = `https://source.unsplash.com/random/${width}x${height}/?${query}`;
    
    console.log(`Запрос изображения по URL: ${unsplashUrl}`);
    
    // Загружаем изображение
    const response = await fetch(unsplashUrl);
    
    if (!response.ok) {
      throw new Error(`Ошибка при загрузке изображения: ${response.status}`);
    }
    
    // Конвертируем в буфер и затем в base64
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    
    return base64Image;
  } catch (error) {
    console.error('Ошибка при генерации изображения через Unsplash:', error);
    // Пробуем резервный метод
    return generateFallbackImage(prompt);
  }
}

// Функция для генерации изображения через Placeholder API
async function generateFallbackImage(prompt) {
  console.log(`Генерация резервного изображения для запроса: "${prompt}"`);
  
  try {
    // Создаем уникальный идентификатор на основе запроса
    const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    
    // Параметры для Placeholder
    const width = 800;
    const height = 600;
    const bgColor = 'f0' + (seed % 9).toString() + (seed % 9).toString() + 'f' + (seed % 9).toString() + '0';
    const textColor = '00' + (seed % 9).toString() + '0' + (seed % 9).toString() + (seed % 9).toString() + '0';
    
    // Формируем текст для изображения
    const text = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
    const encodedText = encodeURIComponent(text);
    
    // Используем placeholder.com (бывший dummyimage.com)
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodedText}`;
    
    console.log(`Запрос резервного изображения по URL: ${placeholderUrl}`);
    
    // Загружаем изображение
    const response = await fetch(placeholderUrl);
    
    if (!response.ok) {
      throw new Error(`Ошибка при загрузке резервного изображения: ${response.status}`);
    }
    
    // Конвертируем в буфер и затем в base64
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    
    return base64Image;
  } catch (error) {
    console.error('Ошибка при генерации резервного изображения:', error);
    
    // Используем SVG шаблон как последний вариант
    try {
      console.log('Использование SVG шаблона...');
      const svgPath = path.join(__dirname, 'public', 'simple-pattern.svg');
      
      if (fs.existsSync(svgPath)) {
        const svgBuffer = fs.readFileSync(svgPath);
        
        // Используем Sharp для конвертации SVG в PNG
        const pngBuffer = await sharp(svgBuffer)
          .png()
          .toBuffer();
        
        return pngBuffer.toString('base64');
      }
    } catch (svgError) {
      console.error('Ошибка при использовании SVG шаблона:', svgError);
    }
    
    // Если все методы не сработали, создаем базовое изображение с помощью Sharp
    try {
      console.log('Создание базового изображения...');
      const buffer = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 4,
          background: { r: 240, g: 240, b: 240, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      return buffer.toString('base64');
    } catch (sharpError) {
      console.error('Ошибка при создании базового изображения:', sharpError);
      throw error; // Если все методы не сработали, пробрасываем исходную ошибку
    }
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
    
    // Генерируем изображение с помощью Unsplash (без API-ключа)
    const base64Image = await generateImageWithUnsplash(prompt);
    
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