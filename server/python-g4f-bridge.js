// Мост для взаимодействия с Python G4F API
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { startPythonG4FApi, stopPythonG4FApi } from '../start-g4f-python.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pythonApiProcess = null;
let pythonApiRunning = false;

// Функция для инициализации Python API
export async function initPythonG4FApi() {
  if (!pythonApiProcess) {
    console.log('Инициализация Python G4F API...');
    pythonApiProcess = startPythonG4FApi();
    
    // Ждем 5 секунд для запуска сервера
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const response = await fetch('http://localhost:5001/');
      
      if (response.ok) {
        console.log('Python G4F API успешно запущен');
        pythonApiRunning = true;
        return true;
      } else {
        console.error('Python G4F API запущен, но возвращает ошибку:', await response.text());
        pythonApiRunning = false;
        return false;
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса Python G4F API:', error.message);
      pythonApiRunning = false;
      return false;
    }
  }
  
  return pythonApiRunning;
}

// Функция для остановки Python API
export function shutdownPythonG4FApi() {
  if (pythonApiProcess) {
    stopPythonG4FApi();
    pythonApiProcess = null;
    pythonApiRunning = false;
    console.log('Python G4F API остановлен');
    return true;
  }
  return false;
}

// Обработчик для получения списка провайдеров
export async function handlePythonG4FProviders(req, res) {
  try {
    // Убеждаемся, что API запущен
    if (!pythonApiRunning) {
      const initialized = await initPythonG4FApi();
      if (!initialized) {
        return res.status(500).json({
          error: 'Python G4F API не удалось запустить',
          message: 'Сервер не смог инициализировать Python API. Используйте локальную имитацию.'
        });
      }
    }
    
    // Запрос к Python API
    const response = await fetch('http://localhost:5001/api/python/g4f/providers');
    
    if (!response.ok) {
      throw new Error(`Ошибка при запросе к Python API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Ошибка при получении провайдеров из Python G4F API:', error);
    
    // Возвращаем пустой список в случае ошибки
    res.json({
      providers: [],
      stats: {
        total: 0,
        working: 0,
        free: 0
      },
      error: error.message
    });
  }
}

// Обработчик для получения списка моделей
export async function handlePythonG4FModels(req, res) {
  try {
    // Убеждаемся, что API запущен
    if (!pythonApiRunning) {
      const initialized = await initPythonG4FApi();
      if (!initialized) {
        return res.status(500).json({
          error: 'Python G4F API не удалось запустить',
          message: 'Сервер не смог инициализировать Python API. Используйте локальную имитацию.'
        });
      }
    }
    
    // Запрос к Python API
    const response = await fetch('http://localhost:5001/api/python/g4f/models');
    
    if (!response.ok) {
      throw new Error(`Ошибка при запросе к Python API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Ошибка при получении моделей из Python G4F API:', error);
    
    // Возвращаем пустой список в случае ошибки
    res.json({
      models: [],
      count: 0,
      error: error.message
    });
  }
}

// Обработчик для запроса к чату
export async function handlePythonG4FChat(req, res) {
  try {
    const userMessage = req.body.message || '';
    const model = req.body.model || 'gpt_3_5_turbo';
    const provider = req.body.provider || null;
    
    if (!userMessage) {
      return res.status(400).json({ error: 'Отсутствует сообщение пользователя' });
    }
    
    console.log(`Запрос к Python G4F: модель=${model}, сообщение=${userMessage.substring(0, 30)}...`);
    
    // Убеждаемся, что API запущен
    if (!pythonApiRunning) {
      const initialized = await initPythonG4FApi();
      if (!initialized) {
        console.log('Python API не запущен, используем локальную имитацию');
        return handleLocalFallback(req, res);
      }
    }
    
    // Запрос к Python API
    try {
      const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          model: model,
          provider: provider
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка Python API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`Ответ от Python G4F получен через провайдер ${data.provider || 'неизвестный'}`);
      
      res.json({
        response: data.response,
        provider: data.provider,
        model: data.model
      });
      
    } catch (error) {
      console.error('Ошибка при запросе к Python G4F API:', error);
      return handleLocalFallback(req, res);
    }
    
  } catch (error) {
    console.error('Общая ошибка обработчика Python G4F:', error);
    return handleLocalFallback(req, res);
  }
}

// Локальный запасной вариант, если Python API недоступен
async function handleLocalFallback(req, res) {
  const message = req.body.message || '';
  console.log('Использование локальной имитации для ответа');
  
  // Простая система определения темы вопроса
  let response = '';
  
  if (message.match(/привет|здравствуй|добрый день|хай|hello|hi/i)) {
    response = "Привет! Я GPT-ассистент, работающий через локальную имитацию. Чем я могу вам помочь сегодня?";
  } 
  else if (message.match(/что ты (умеешь|можешь)|расскажи о себе|кто ты/i)) {
    response = "Я искусственный интеллект, который может отвечать на вопросы, предоставлять информацию и помогать с различными задачами. В данный момент я работаю в режиме локальной имитации, так как не удалось подключиться к реальным AI моделям.";
  } 
  else if (message.match(/погода|температура|осадки/i)) {
    response = "К сожалению, я не имею доступа к актуальным данным о погоде. Для получения информации о текущей погоде рекомендую использовать специализированные сервисы.";
  } 
  else if (message.match(/время|дата|день недели|который час/i)) {
    const now = new Date();
    response = `По моим данным сейчас ${now.toLocaleString('ru-RU')}. Это время сервера, оно может отличаться от вашего местного времени.`;
  } 
  else {
    response = "Я обрабатываю ваш запрос в режиме локальной имитации. К сожалению, в данный момент нет подключения к реальным AI моделям. Я могу помочь с общими вопросами, но для получения специфической информации рекомендую повторить попытку позже.";
  }
  
  // Добавляем задержку для имитации обработки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  res.json({
    response: response,
    provider: 'local_fallback',
    model: 'fallback'
  });
}

// Страница для полноценного интерфейса Python G4F
export function pythonG4FPage(req, res) {
  res.sendFile(path.join(process.cwd(), 'python-g4f.html'));
}