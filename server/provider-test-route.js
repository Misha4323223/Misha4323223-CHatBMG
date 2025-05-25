/**
 * Маршрут для тестирования провайдеров
 * Запускает проверку доступности и работоспособности всех AI провайдеров
 */

const express = require('express');
const router = express.Router();

// Импортируем всех провайдеров для прямого тестирования
const chatFreeProvider = require('./chatfree-improved');
const chatFreeSimple = require('./simple-chatfree');
const freechatEnhanced = require('./freechat-enhanced');
const deepspeekProvider = require('./deepspeek-fixed');
const claudeProvider = require('./claude-provider');
const deepInfraProvider = require('./deepinfra-provider');
const multimodalProvider = require('./multimodal-provider');
const pythonProviderRoutes = require('./python_provider_routes');

/**
 * Проверяет работоспособность всех провайдеров
 * @returns {Promise<Array>} Результаты тестирования
 */
async function testAllProviders() {
  console.log('🔍 Начинаем проверку работоспособности всех AI провайдеров...');
  
  // Список тестируемых провайдеров
  const providers = [
    { 
      name: 'ChatFree (улучшенный)', 
      test: async () => await chatFreeProvider.getChatFreeResponse('Это тестовый запрос для проверки доступности ChatFree.'),
      status: 'pending'
    },
    { 
      name: 'ChatFree (простой)', 
      test: async () => await chatFreeSimple.getChatFreeResponse('Это тестовый запрос для проверки доступности простого ChatFree.'),
      status: 'pending'
    },
    { 
      name: 'FreeChat Enhanced', 
      test: async () => await freechatEnhanced.getChatFreeEnhancedResponse('Это тестовый запрос для FreeChat Enhanced.'),
      status: 'pending'
    },
    { 
      name: 'DeepSpeek', 
      test: async () => await deepspeekProvider.getDeepSpeekResponse('Как создать функцию в JavaScript для сортировки массива?'),
      status: 'pending'
    },
    { 
      name: 'Claude (Anthropic)', 
      test: async () => await claudeProvider.getClaudeResponse('Это тестовый запрос для проверки доступности Claude.'),
      status: 'pending'
    },
    { 
      name: 'DeepInfra', 
      test: async () => await deepInfraProvider.getDeepInfraResponse('Это тестовый запрос для проверки доступности DeepInfra.'),
      status: 'pending'
    },
    { 
      name: 'Python G4F - Qwen', 
      test: async () => {
        const response = await pythonProviderRoutes.callPythonAI('Это тестовый запрос для Qwen через Python G4F.', 'Qwen_Qwen_2_5_Max');
        return { success: !!response, response };
      },
      status: 'pending'
    },
    { 
      name: 'Python G4F - Phind', 
      test: async () => {
        const response = await pythonProviderRoutes.callPythonAI('Как использовать fetch API в JavaScript?', 'Phind');
        return { success: !!response, response };
      },
      status: 'pending'
    },
    { 
      name: 'Python G4F - GeminiPro', 
      test: async () => {
        const response = await pythonProviderRoutes.callPythonAI('Придумай короткий рассказ о космосе.', 'GeminiPro');
        return { success: !!response, response };
      },
      status: 'pending'
    },
    { 
      name: 'Python G4F - You', 
      test: async () => {
        const response = await pythonProviderRoutes.callPythonAI('Какие новости сегодня в мире?', 'You');
        return { success: !!response, response };
      },
      status: 'pending'
    },
    {
      name: 'Мультимодальный провайдер (для изображений)',
      test: async () => {
        // Тестовое изображение из интернета
        const testImageUrl = 'https://picsum.photos/200';
        const result = await multimodalProvider.analyzeImage(testImageUrl, 'Опиши, что изображено на картинке?');
        return result;
      },
      status: 'pending'
    }
  ];
  
  const results = [];
  
  for (const provider of providers) {
    console.log(`⏳ Тестирование провайдера: ${provider.name}...`);
    
    try {
      // Устанавливаем таймаут для каждого теста
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Тест превысил таймаут (15 секунд)')), 15000)
      );
      
      // Запускаем тест с таймаутом
      const result = await Promise.race([
        provider.test(),
        timeoutPromise
      ]);
      
      if (result && result.success) {
        console.log(`✅ Провайдер ${provider.name} работает!`);
        provider.status = 'working';
        
        // Добавляем сокращенную версию ответа (до 100 символов)
        const response = result.response || '';
        const shortResponse = typeof response === 'string' 
          ? response.substring(0, 100) + (response.length > 100 ? '...' : '')
          : 'Не текстовый ответ';
        
        results.push({
          name: provider.name,
          status: 'working',
          response: shortResponse,
          provider: result.provider || provider.name,
          model: result.model || 'неизвестно'
        });
      } else {
        throw new Error('Провайдер не вернул успешный результат');
      }
    } catch (error) {
      console.error(`❌ Провайдер ${provider.name} недоступен: ${error.message}`);
      provider.status = 'failed';
      
      results.push({
        name: provider.name,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  // Итоговая статистика
  const workingCount = results.filter(r => r.status === 'working').length;
  const totalCount = providers.length;
  
  console.log(`\n📊 Итоги тестирования провайдеров:`);
  console.log(`✅ Работают: ${workingCount} из ${totalCount} (${Math.round(workingCount/totalCount*100)}%)`);
  console.log(`❌ Не работают: ${totalCount - workingCount} из ${totalCount} (${Math.round((totalCount-workingCount)/totalCount*100)}%)`);
  
  return {
    stats: {
      total: totalCount,
      working: workingCount,
      failed: totalCount - workingCount,
      workingPercentage: Math.round(workingCount/totalCount*100)
    },
    results
  };
}

// Маршрут для запуска теста всех провайдеров
router.get('/all', async (req, res) => {
  try {
    const results = await testAllProviders();
    res.json(results);
  } catch (error) {
    console.error('❌ Ошибка при тестировании провайдеров:', error);
    res.status(500).json({
      success: false,
      error: `Ошибка при тестировании провайдеров: ${error.message}`
    });
  }
});

// Маршрут для тестирования одного конкретного провайдера
router.get('/single/:provider', async (req, res) => {
  const { provider } = req.params;
  
  try {
    let result;
    
    switch (provider) {
      case 'chatfree':
        result = await chatFreeProvider.getChatFreeResponse('Это тестовый запрос для проверки ChatFree.');
        break;
      case 'freechat':
        result = await freechatEnhanced.getChatFreeEnhancedResponse('Это тестовый запрос для FreeChat Enhanced.');
        break;
      case 'deepspeek':
        result = await deepspeekProvider.getDeepSpeekResponse('Как создать функцию в JavaScript для сортировки массива?');
        break;
      case 'claude':
        result = await claudeProvider.getClaudeResponse('Это тестовый запрос для проверки Claude.');
        break;
      case 'deepinfra':
        result = await deepInfraProvider.getDeepInfraResponse('Это тестовый запрос для проверки DeepInfra.');
        break;
      case 'qwen':
        const qwenResponse = await pythonProviderRoutes.callPythonAI('Это тестовый запрос для Qwen.', 'Qwen_Qwen_2_5_Max');
        result = { success: !!qwenResponse, response: qwenResponse, provider: 'Qwen_Qwen_2_5_Max' };
        break;
      case 'phind':
        const phindResponse = await pythonProviderRoutes.callPythonAI('Как использовать fetch API в JavaScript?', 'Phind');
        result = { success: !!phindResponse, response: phindResponse, provider: 'Phind' };
        break;
      case 'gemini':
        const geminiResponse = await pythonProviderRoutes.callPythonAI('Придумай короткий рассказ.', 'GeminiPro');
        result = { success: !!geminiResponse, response: geminiResponse, provider: 'GeminiPro' };
        break;
      case 'you':
        const youResponse = await pythonProviderRoutes.callPythonAI('Какие новости сегодня?', 'You');
        result = { success: !!youResponse, response: youResponse, provider: 'You' };
        break;
      case 'multimodal':
        const testImageUrl = 'https://picsum.photos/200';
        result = await multimodalProvider.analyzeImage(testImageUrl, 'Опиши, что изображено на картинке?');
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Неизвестный провайдер: ${provider}`
        });
    }
    
    if (result && result.success) {
      res.json({
        success: true,
        provider,
        result
      });
    } else {
      res.status(500).json({
        success: false,
        provider,
        error: 'Провайдер не вернул успешный результат',
        result
      });
    }
  } catch (error) {
    console.error(`❌ Ошибка при тестировании провайдера ${provider}:`, error);
    res.status(500).json({
      success: false,
      provider,
      error: `Ошибка при тестировании: ${error.message}`
    });
  }
});

module.exports = router;