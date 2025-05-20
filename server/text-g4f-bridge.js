// Модуль для обеспечения текстового API к g4f
// Использует только текстовые ответы без HTML/XML

const fetch = require('node-fetch');
const { log } = require('./vite');
const re = require('node:util');

/**
 * Проверяет, содержит ли текст HTML или XML
 * @param {string} text Текст для проверки
 * @returns {boolean} Содержит ли текст HTML/XML
 */
function containsHtmlOrXml(text) {
  if (typeof text !== 'string') return false;
  return /<\s*[a-z][^>]*>/i.test(text);
}

/**
 * Фильтрует провайдеры для текстового использования
 * @param {Array} providers Массив провайдеров
 * @returns {Array} Отфильтрованные провайдеры
 */
function filterTextProviders(providers) {
  return providers
    .filter(provider => {
      // Фильтруем только работающие провайдеры, которые не требуют авторизации
      if (!provider.working || provider.needs_auth) return false;
      
      // Пропускаем провайдеры, связанные с аудио и изображениями
      const name = provider.name.toLowerCase();
      return !name.includes('tts') && !name.includes('image');
    })
    .map(provider => ({
      name: provider.name,
      model: provider.default_model || 'неизвестно',
      working: true
    }));
}

/**
 * Получает список провайдеров для текстового API
 */
async function handleTextProviders(req, res) {
  try {
    // Получаем список провайдеров от основного Python G4F API
    const response = await fetch('http://localhost:5001/api/python/g4f/providers');
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении списка провайдеров: ${response.status}`);
    }
    
    const data = await response.json();
    const textProviders = filterTextProviders(data.providers);
    
    return res.json({
      providers: textProviders,
      count: textProviders.length
    });
    
  } catch (error) {
    console.error('Ошибка при получении списка провайдеров:', error);
    return res.status(500).json({
      error: `Ошибка при получении списка провайдеров: ${error.message}`,
      providers: [],
      count: 0
    });
  }
}

/**
 * Обрабатывает запрос к текстовому чату
 */
async function handleTextChat(req, res) {
  try {
    const { message, model = 'gpt-3.5-turbo', max_retries = 3 } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Отсутствует сообщение в запросе',
        response: 'Пожалуйста, укажите сообщение для отправки модели.',
        provider: 'error',
        model: 'none'
      });
    }
    
    log(`Текстовый запрос: модель=${model}, сообщение=${message.substring(0, 50)}...`);
    
    // Отправляем запрос к Python G4F API
    const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        model,
        max_retries
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при запросе к Python G4F API: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Проверяем ответ на наличие HTML/XML
    if (data.response && containsHtmlOrXml(data.response)) {
      log(`Ответ от ${data.provider} содержит HTML/XML, используем локальный фоллбек`);
      
      return res.json({
        response: 'Получен ответ, содержащий HTML/XML, который не поддерживается в текстовом режиме. Пожалуйста, попробуйте другой запрос или другую модель.',
        provider: 'text_filter',
        model: data.model
      });
    }
    
    // Если провайдер - локальный фоллбек, меняем сообщение
    if (data.provider === 'local_fallback') {
      log(`Получен ответ от локального фоллбека`);
      
      return res.json({
        response: 'Все провайдеры недоступны. Пожалуйста, попробуйте позже или измените запрос.',
        provider: 'text_fallback',
        model: 'none'
      });
    }
    
    log(`Текстовый ответ от ${data.provider} получен успешно`);
    return res.json(data);
    
  } catch (error) {
    console.error('Ошибка при обработке текстового запроса:', error);
    return res.status(500).json({
      error: `Ошибка при обработке текстового запроса: ${error.message}`,
      response: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.',
      provider: 'error',
      model: 'none'
    });
  }
}

module.exports = {
  handleTextProviders,
  handleTextChat
};