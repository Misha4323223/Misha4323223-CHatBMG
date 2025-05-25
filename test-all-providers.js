/**
 * Тестирование всех AI провайдеров CHatBMG
 */

import fetch from 'node-fetch';

// Список основных провайдеров для тестирования
const PROVIDERS_TO_TEST = [
  'Qwen_Qwen_2_5_Max',
  'Claude',
  'GeminiPro', 
  'Phind',
  'You',
  'DeepSeek',
  'PerplexityApi',
  'AItianhu',
  'Liaobots',
  'OpenaiChat',
  'ChatGpt',
  'Anthropic',
  'DeepInfra',
  'HuggingChat',
  'Groq',
  'Blackbox',
  'Pi',
  'Poe',
  'AIChatFree',
  'ChatGptt'
];

// Тестовые сообщения
const TEST_MESSAGES = [
  'Hello, can you respond?',
  'Привет, ты работаешь?',
  '2+2=?'
];

async function testProvider(provider, message) {
  try {
    console.log(`🧪 Тестируем ${provider}...`);
    
    const response = await fetch('http://localhost:5001/python/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        provider: provider
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.response && data.response.length > 10) {
        console.log(`✅ ${provider}: РАБОТАЕТ - "${data.response.substring(0, 50)}..."`);
        return { provider, status: 'SUCCESS', response: data.response.substring(0, 100) };
      } else {
        console.log(`⚠️ ${provider}: Пустой ответ`);
        return { provider, status: 'EMPTY_RESPONSE', response: data.response || 'No response' };
      }
    } else {
      console.log(`❌ ${provider}: HTTP ${response.status}`);
      return { provider, status: 'HTTP_ERROR', error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(`❌ ${provider}: ${error.message}`);
    return { provider, status: 'ERROR', error: error.message };
  }
}

async function testAllProviders() {
  console.log('🚀 НАЧИНАЕМ ТЕСТИРОВАНИЕ ВСЕХ AI ПРОВАЙДЕРОВ\n');
  
  const results = [];
  const workingProviders = [];
  const failedProviders = [];
  
  // Тестируем каждый провайдер
  for (const provider of PROVIDERS_TO_TEST) {
    const result = await testProvider(provider, 'Hello, test response');
    results.push(result);
    
    if (result.status === 'SUCCESS') {
      workingProviders.push(provider);
    } else {
      failedProviders.push(provider);
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Выводим итоговый отчет
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  console.log(`✅ Работающих провайдеров: ${workingProviders.length}`);
  console.log(`❌ Неработающих провайдеров: ${failedProviders.length}`);
  
  console.log('\n✅ РАБОТАЮЩИЕ ПРОВАЙДЕРЫ:');
  workingProviders.forEach(provider => console.log(`  - ${provider}`));
  
  console.log('\n❌ НЕРАБОТАЮЩИЕ ПРОВАЙДЕРЫ:');
  failedProviders.forEach(provider => console.log(`  - ${provider}`));
  
  console.log('\n🎯 ЛУЧШИЕ ПРОВАЙДЕРЫ ДЛЯ ИСПОЛЬЗОВАНИЯ:');
  const bestProviders = workingProviders.slice(0, 5);
  bestProviders.forEach(provider => console.log(`  🌟 ${provider}`));
  
  return results;
}

// Запускаем тестирование
testAllProviders().then(results => {
  console.log('\n✅ Тестирование завершено!');
}).catch(error => {
  console.error('❌ Ошибка при тестировании:', error);
});