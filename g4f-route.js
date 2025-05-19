// Маршрут для G4F в основном приложении
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL G4F прокси
const G4F_PROXY_URL = 'http://localhost:3334';

// Маршрут для главной страницы G4F
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'g4f-index.html'));
});

// Проксирование API запросов
router.get('/api/providers', async (req, res) => {
  try {
    const response = await fetch(`${G4F_PROXY_URL}/api/providers`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ошибка при получении провайдеров:', error);
    res.status(500).json({
      error: 'Не удалось получить список провайдеров',
      message: error.message
    });
  }
});

router.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(`${G4F_PROXY_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ошибка при отправке запроса в G4F:', error);
    res.status(500).json({
      error: 'Не удалось отправить запрос в G4F',
      message: error.message
    });
  }
});

export default router;