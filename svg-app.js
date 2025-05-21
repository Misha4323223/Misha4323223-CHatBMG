// Импортируем необходимые модули
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import potrace from 'potrace';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Настройка Express
const app = express();
const PORT = 5000; // Обновлено для работы в Replit

// Настройка пути для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка промежуточного ПО (middleware)
app.use(express.json());
app.use(cors());

// Создаем директории
const tempDir = path.join(__dirname, 'temp');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// HTML для генератора SVG
const htmlPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVG Генератор</title>
    <style>
        :root {
            --primary-color: #4a56e2;
            --primary-dark: #3a46c2;
            --secondary-color: #6c63ff;
            --success-color: #28a745;
            --error-color: #dc3545;
            --background-color: #f9fafc;
            --text-color: #333;
            --input-bg: #fff;
            --border-color: #ddd;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --primary-color: #5e68fa;
                --primary-dark: #4a54e6;
                --secondary-color: #8c85ff;
                --background-color: #1a1a2e;
                --text-color: #f0f0f0;
                --input-bg: #252538;
                --border-color: #40405c;
                --shadow-color: rgba(0, 0, 0, 0.3);
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            padding: 1rem;
            margin: 0 auto;
            max-width: 800px;
        }

        header {
            margin-bottom: 1.5rem;
            text-align: center;
        }

        h1 {
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            display: inline-block;
        }

        p {
            margin-bottom: 1rem;
            color: var(--text-color);
            opacity: 0.9;
        }

        .subtitle {
            font-size: 0.95rem;
            opacity: 0.8;
            margin-bottom: 0.5rem;
        }

        .container {
            display: flex;
            flex-direction: column;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            background-color: var(--input-bg);
            overflow: hidden;
            box-shadow: 0 4px 6px var(--shadow-color);
            margin-bottom: 1rem;
            padding: 1.5rem;
        }

        .input-container {
            display: flex;
            flex-direction: column;
            margin-bottom: 1.5rem;
        }

        label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 1rem;
        }

        input, textarea {
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.75rem;
            font-family: inherit;
            font-size: 1rem;
            background-color: var(--input-bg);
            color: var(--text-color);
            resize: none;
            min-height: 60px;
        }

        button {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(120deg, var(--primary-color), var(--primary-dark));
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .result {
            margin-top: 1.5rem;
            display: none;
        }

        .svg-container {
            display: flex;
            justify-content: center;
            background-color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid var(--border-color);
        }

        .svg-container svg {
            max-width: 100%;
            max-height: 400px;
        }

        .svg-code {
            font-family: monospace;
            font-size: 0.8rem;
            padding: 1rem;
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            overflow-x: auto;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }

        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
            display: none;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            color: var(--error-color);
            padding: 1rem;
            border: 1px solid var(--error-color);
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            display: none;
        }

        .download-btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background-color: var(--success-color);
            color: white;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s;
            margin-bottom: 1rem;
        }

        .download-btn:hover {
            background-color: #218838;
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .description {
            margin-top: 1.5rem;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            display: none;
        }

        .description h3 {
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <header>
        <h1>SVG Генератор</h1>
        <p class="subtitle">Создает векторные SVG изображения с помощью ИИ</p>
    </header>

    <div class="container">
        <div class="input-container">
            <label for="prompt">Опишите изображение:</label>
            <textarea id="prompt" rows="3" placeholder="Например: космический корабль"></textarea>
        </div>
        <button id="generate-btn">Сгенерировать SVG</button>
    </div>

    <div class="loader" id="loader"></div>
    <div class="error" id="error"></div>

    <div class="result" id="result">
        <h2>Результат:</h2>
        <div class="svg-container" id="svg-container"></div>
        <div class="svg-code" id="svg-code"></div>
        <a href="#" class="download-btn" id="download-btn" download="image.svg">Скачать SVG</a>
    </div>

    <div class="description" id="description">
        <h3>Описание изображения:</h3>
        <div id="ai-description"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const generateBtn = document.getElementById('generate-btn');
            const promptInput = document.getElementById('prompt');
            const loader = document.getElementById('loader');
            const error = document.getElementById('error');
            const result = document.getElementById('result');
            const svgContainer = document.getElementById('svg-container');
            const svgCode = document.getElementById('svg-code');
            const downloadBtn = document.getElementById('download-btn');
            const description = document.getElementById('description');
            const aiDescription = document.getElementById('ai-description');

            // Функция для генерации SVG
            async function generateSVG() {
                const prompt = promptInput.value.trim();
                
                if (!prompt) {
                    error.textContent = 'Пожалуйста, введите описание изображения';
                    error.style.display = 'block';
                    return;
                }

                // Сбрасываем предыдущие результаты
                error.style.display = 'none';
                result.style.display = 'none';
                description.style.display = 'none';
                
                // Показываем индикатор загрузки
                loader.style.display = 'block';
                generateBtn.disabled = true;

                try {
                    // Отправляем запрос на сервер
                    const response = await fetch('/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt })
                    });

                    if (!response.ok) {
                        throw new Error('Ошибка при генерации SVG');
                    }

                    const data = await response.json();

                    // Отображаем SVG
                    svgContainer.innerHTML = data.svg;
                    svgCode.textContent = data.svg;
                    
                    // Настраиваем кнопку загрузки
                    const svgBlob = new Blob([data.svg], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(svgBlob);
                    downloadBtn.href = url;
                    
                    // Показываем результат
                    result.style.display = 'block';
                    
                    // Получаем описание от Qwen
                    try {
                        const descResponse = await fetch('http://localhost:5000/api/python/g4f/chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                message: \`Опиши подробно, как может выглядеть изображение по запросу: "\${prompt}". Опиши визуальные элементы, стиль, цвета и детали.\`,
                                provider: 'Qwen_Qwen_2_5',
                                max_retries: 2
                            })
                        });
                        
                        if (descResponse.ok) {
                            const descData = await descResponse.json();
                            if (descData.response) {
                                aiDescription.textContent = descData.response;
                                description.style.display = 'block';
                            }
                        }
                    } catch (descError) {
                        console.error('Ошибка получения описания:', descError);
                    }
                    
                } catch (err) {
                    console.error('Ошибка:', err);
                    error.textContent = 'Произошла ошибка при генерации SVG: ' + err.message;
                    error.style.display = 'block';
                } finally {
                    // Скрываем индикатор загрузки и разблокируем кнопку
                    loader.style.display = 'none';
                    generateBtn.disabled = false;
                }
            }

            // Обработчик события нажатия на кнопку
            generateBtn.addEventListener('click', generateSVG);
            
            // Обработчик нажатия Enter в поле ввода
            promptInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    generateSVG();
                }
            });
        });
    </script>
</body>
</html>`;

// Сохраняем HTML файл
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlPage);

// Функция для генерации изображения через Picsum Photos API
async function generateImage(prompt) {
  console.log(`Генерация изображения для запроса: "${prompt}"`);
  
  try {
    // Создаем хеш из промпта для получения стабильных, но разных изображений
    const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000;
    
    // Используем Picsum Photos API для получения случайных изображений
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;
    console.log(`Запрос изображения по URL: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Ошибка при загрузке изображения: ${response.status}`);
    }
    
    // Получаем изображение как буфер
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    
    // Создаем градиент с помощью Sharp, если API недоступно
    try {
      console.log('Создание градиента для резервного изображения...');
      
      // Выбираем цвет на основе промпта
      const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const r = (seed * 123) % 255;
      const g = (seed * 45) % 255;
      const b = (seed * 67) % 255;
      
      // Создаем простое изображение с градиентом
      return await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r, g, b }
        }
      })
      .png()
      .toBuffer();
    } catch (sharpError) {
      console.error('Ошибка при создании резервного изображения:', sharpError);
      throw error;
    }
  }
}

// Функция для конвертации PNG в SVG с использованием Potrace
function convertToSvg(imageBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Создаем временный файл для трассировки
      const tempPngPath = path.join(tempDir, `temp_${Date.now()}.png`);
      
      // Оптимизируем изображение с помощью Sharp перед трассировкой
      await sharp(imageBuffer)
        .grayscale() // Преобразуем в черно-белое для лучшей трассировки
        .toFile(tempPngPath);
      
      // Настраиваем параметры трассировки
      const params = {
        threshold: 128, // Пороговое значение для бинаризации
        turdSize: 2,    // Минимальный размер шумового объекта
        optTolerance: 0.2, // Допуск оптимизации
        alphaMax: 1,    // Максимальный угол поворота
        color: '#000000' // Цвет контура
      };
      
      // Выполняем трассировку изображения
      potrace.trace(tempPngPath, params, (err, svg) => {
        // Удаляем временный файл после трассировки
        fs.unlink(tempPngPath, () => {});
        
        if (err) {
          console.error('Ошибка при трассировке:', err);
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

// Маршрут для статических файлов
app.use(express.static(publicDir));

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Маршрут для генерации SVG
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Отсутствует параметр prompt' });
    }
    
    console.log(`Получен запрос на генерацию SVG: "${prompt}"`);
    
    // Генерируем изображение
    const imageBuffer = await generateImage(prompt);
    
    // Конвертируем в SVG
    const svg = await convertToSvg(imageBuffer);
    
    // Отправляем SVG в ответе
    res.json({ svg });
    
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    res.status(500).json({ 
      error: 'Произошла ошибка при обработке запроса',
      message: error.message
    });
  }
});

// Запускаем сервер
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SVG Generator запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});