/**
 * Тестирование скорости ответа от всех AI провайдеров
 * Проверяет реальное время ответа и качество работы каждого провайдера
 */

const axios = require('axios');

// Список всех доступных провайдеров для тестирования
const PROVIDERS_TO_TEST = [
  // Настоящие AI провайдеры
  { name: 'FastFreeChatEnhanced', endpoint: '/api/freechat/chat', type: 'real_ai' },
  
  // Стандартные G4F провайдеры
  { name: 'G4F-You', endpoint: '/api/g4f/chat', provider: 'You', type: 'standard' },
  { name: 'G4F-Qwen', endpoint: '/api/g4f/chat', provider: 'qwen', type: 'standard' },
  { name: 'G4F-Phind', endpoint: '/api/g4f/chat', provider: 'phind', type: 'standard' },
  { name: 'G4F-Claude', endpoint: '/api/g4f/chat', provider: 'claude', type: 'standard' },
  { name: 'G4F-Gemini', endpoint: '/api/g4f/chat', provider: 'gemini', type: 'standard' },
  
  // Специализированные провайдеры
  { name: 'DeepSeek', endpoint: '/api/deepspeek/chat', type: 'specialized' },
  { name: 'Claude-Direct', endpoint: '/api/claude/chat', type: 'specialized' },
  { name: 'DeepInfra', endpoint: '/api/deepinfra/chat', type: 'specialized' },
  { name: 'Ollama-Local', endpoint: '/api/ollama/chat', type: 'specialized' }
];

// Тестовое сообщение для проверки
const TEST_MESSAGE = "Привет! Как дела?";

/**
 * Тестирование одного провайдера
 */
async function testProvider(provider) {
  const startTime = performance.now();
  
  try {
    console.log(`🧪 Тестируем ${provider.name}...`);
    
    // Формируем запрос в зависимости от типа провайдера
    const requestData = {
      message: TEST_MESSAGE
    };
    
    // Добавляем специфичные параметры для G4F провайдеров
    if (provider.provider) {
      requestData.provider = provider.provider;
    }
    
    const response = await axios.post(`http://localhost:5000${provider.endpoint}`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 секунд максимум
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    if (response.status === 200 && response.data) {
      let responseText = '';
      let actualProvider = provider.name;
      let model = 'Unknown';
      
      // Извлекаем ответ в зависимости от формата
      if (response.data.response) {
        responseText = response.data.response;
        actualProvider = response.data.provider || provider.name;
        model = response.data.model || 'Unknown';
      } else if (response.data.success && response.data.response) {
        responseText = response.data.response;
        actualProvider = response.data.provider || provider.name;
        model = response.data.model || 'Unknown';
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      }
      
      if (responseText && responseText.length > 10) {
        return {
          name: provider.name,
          type: provider.type,
          status: 'success',
          responseTime: responseTime,
          responseLength: responseText.length,
          actualProvider: actualProvider,
          model: model,
          preview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
        };
      } else {
        return {
          name: provider.name,
          type: provider.type,
          status: 'empty_response',
          responseTime: responseTime,
          error: 'Получен пустой ответ'
        };
      }
    } else {
      return {
        name: provider.name,
        type: provider.type,
        status: 'http_error',
        responseTime: responseTime,
        error: `HTTP ${response.status}`
      };
    }
    
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    return {
      name: provider.name,
      type: provider.type,
      status: 'error',
      responseTime: responseTime,
      error: error.message
    };
  }
}

/**
 * Тестирование всех провайдеров
 */
async function testAllProviders() {
  console.log('🚀 Начинаем тестирование скорости всех AI провайдеров...');
  console.log(`📝 Тестовое сообщение: "${TEST_MESSAGE}"`);
  console.log(`🔧 Количество провайдеров для тестирования: ${PROVIDERS_TO_TEST.length}`);
  console.log('═'.repeat(80));
  
  const results = [];
  
  // Тестируем провайдеры последовательно, чтобы не перегружать систему
  for (const provider of PROVIDERS_TO_TEST) {
    const result = await testProvider(provider);
    results.push(result);
    
    // Выводим результат сразу
    if (result.status === 'success') {
      console.log(`✅ ${result.name} (${result.type}): ${result.responseTime}мс`);
      console.log(`   📋 Провайдер: ${result.actualProvider} | Модель: ${result.model}`);
      console.log(`   💬 Ответ: ${result.preview}`);
    } else {
      console.log(`❌ ${result.name} (${result.type}): ${result.responseTime}мс - ${result.error}`);
    }
    console.log('─'.repeat(80));
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Анализируем результаты
  console.log('📊 СВОДКА РЕЗУЛЬТАТОВ:');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');
  
  console.log(`✅ Работающих провайдеров: ${successful.length}`);
  console.log(`❌ Недоступных провайдеров: ${failed.length}`);
  
  if (successful.length > 0) {
    // Сортируем по скорости
    successful.sort((a, b) => a.responseTime - b.responseTime);
    
    console.log('\n🏆 ТОП БЫСТРЫХ ПРОВАЙДЕРОВ:');
    successful.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: ${result.responseTime}мс (${result.actualProvider})`);
    });
    
    // Группируем по типам
    const byType = {};
    successful.forEach(result => {
      if (!byType[result.type]) byType[result.type] = [];
      byType[result.type].push(result);
    });
    
    console.log('\n📈 СРЕДНЯЯ СКОРОСТЬ ПО ТИПАМ:');
    Object.keys(byType).forEach(type => {
      const avg = Math.round(byType[type].reduce((sum, r) => sum + r.responseTime, 0) / byType[type].length);
      console.log(`${type}: ${avg}мс (${byType[type].length} провайдеров)`);
    });
  }
  
  console.log('═'.repeat(80));
  console.log('🏁 Тестирование завершено!');
  
  return results;
}

module.exports = {
  testAllProviders,
  testProvider,
  PROVIDERS_TO_TEST
};