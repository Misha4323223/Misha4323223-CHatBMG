/**
 * Оптимизированный модуль для работы с G4F
 * Использует только стабильные провайдеры и автоматически подбирает рабочие модели
 */

import fetch from 'node-fetch';
import { log } from './vite';

/**
 * Получает список доступных провайдеров G4F
 * @returns {Promise<Array>} Массив доступных провайдеров
 */
async function getAvailableProviders() {
  try {
    const response = await fetch('http://localhost:5001/api/python/g4f/providers');
    const data = await response.json();
    
    // Фильтруем только работающие провайдеры
    return data.providers.filter(p => p.working && !p.needs_auth);
  } catch (error) {
    log(`Ошибка при получении списка провайдеров: ${error.message}`, 'g4f-optimized');
    return [];
  }
}

/**
 * Оптимизированный чат с G4F, перебирающий рабочие провайдеры
 * @param {string} message Сообщение пользователя
 * @returns {Promise<Object>} Ответ от G4F
 */
async function chatWithG4F(message) {
  // Получаем провайдеры, которые работают наиболее стабильно на основе предыдущих тестов
  const safeProviders = [
    'Qwen_Qwen_2_5',
    'GeekGpt',
    'OpenAIFM',
    'Blackbox',
    'Gemini',
    'GeminiPro'
  ];
  
  for (const providerName of safeProviders) {
    try {
      log(`Пробуем провайдера: ${providerName}`, 'g4f-optimized');
      
      const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          provider: providerName,
          // Не указываем модель, чтобы использовалась встроенная логика выбора моделей на сервере
        })
      });
      
      if (!response.ok) {
        log(`Провайдер ${providerName} вернул ошибку ${response.status}`, 'g4f-optimized');
        continue;
      }
      
      const data = await response.json();
      
      // Если это был локальный фоллбек, пробуем другого провайдера
      if (data.provider === 'local_fallback') {
        log(`Провайдер ${providerName} вернул имитацию, пробуем другого`, 'g4f-optimized');
        continue;
      }
      
      // Возвращаем успешный ответ
      log(`Получен успешный ответ от ${providerName}`, 'g4f-optimized');
      return {
        response: data.response,
        provider: data.provider,
        model: data.model
      };
    } catch (err) {
      log(`Ошибка при использовании провайдера ${providerName}: ${err.message}`, 'g4f-optimized');
      continue;
    }
  }
  
  // Если ни один провайдер не сработал, используем стандартный запрос без указания провайдера
  try {
    log('Ни один из приоритетных провайдеров не сработал, используем запрос без указания провайдера', 'g4f-optimized');
    
    const response = await fetch('http://localhost:5001/api/python/g4f/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log(`Финальная ошибка при обращении к G4F: ${error.message}`, 'g4f-optimized');
    
    // Возвращаем локальную имитацию
    return {
      response: `Извините, в данный момент все провайдеры G4F недоступны. Ваш запрос: "${message}"`,
      provider: 'js_fallback',
      model: 'fallback'
    };
  }
}

/**
 * Упрощенный API для взаимодействия с G4F
 * @param {Object} req Express запрос
 * @param {Object} res Express ответ
 */
async function handleOptimizedG4F(req, res) {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }
    
    const result = await chatWithG4F(message);
    res.json(result);
  } catch (error) {
    log(`Ошибка в handleOptimizedG4F: ${error.message}`, 'g4f-optimized');
    res.status(500).json({ 
      error: 'Произошла ошибка при обработке запроса',
      provider: 'error',
      response: 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.'
    });
  }
}

// Экспортируем API используя ESM экспорт
export {
  getAvailableProviders,
  chatWithG4F,
  handleOptimizedG4F
};