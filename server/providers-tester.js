/**
 * Утилита для проверки работоспособности всех AI провайдеров
 * Проводит последовательное тестирование каждого провайдера в системе
 */

import fetch from 'node-fetch';
import { createRequire } from 'module';

// Используем createRequire для импорта CommonJS модулей
const require = createRequire(import.meta.url);

// Импортируем основные провайдеры для прямого тестирования
const chatFreeProvider = require('./chatfree-improved');
const chatFreeSimple = require('./simple-chatfree');
const freechatEnhanced = require('./freechat-enhanced');
const deepspeekProvider = require('./deepspeek-fixed');
const claudeProvider = require('./claude-provider');
const deepInfraProvider = require('./deepinfra-provider');
const multimodalProvider = require('./multimodal-provider');
const pythonProviderRoutes = require('./python_provider_routes');

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

/**
 * Проверяет работоспособность всех провайдеров
 * @returns {Promise<Array>} Результаты тестирования
 */
async function testAllProviders() {
  console.log('🔍 Начинаем проверку работоспособности всех AI провайдеров...');
  
  const results = [];
  
  for (const provider of providers) {
    console.log(`⏳ Тестирование провайдера: ${provider.name}...`);
    
    try {
      // Устанавливаем таймаут для каждого теста
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Тест превысил таймаут (30 секунд)')), 30000)
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
  
  return results;
}

// Запускаем тестирование
testAllProviders()
  .then(results => {
    console.log('\n📋 Подробные результаты:');
    console.table(results);
  })
  .catch(error => {
    console.error('❌ Ошибка при тестировании:', error);
  });

// Экспортируем для возможности использования в других файлах
export { testAllProviders };