/**
 * Простой тест скорости AI провайдеров
 */

const axios = require('axios');

async function testProviders() {
  const providers = [
    { name: 'ChatFree', url: 'http://localhost:5000/api/chatfree/chat' },
    { name: 'FreeChat Enhanced', url: 'http://localhost:5000/api/freechat/chat' },
    { name: 'Direct AI', url: 'http://localhost:5000/api/direct-ai/chat' },
    { name: 'G4F Qwen', url: 'http://localhost:5000/api/g4f/chat', data: { provider: 'qwen' } },
    { name: 'G4F You', url: 'http://localhost:5000/api/g4f/chat', data: { provider: 'You' } }
  ];

  console.log('🚀 Тестирование скорости AI провайдеров...\n');

  for (const provider of providers) {
    const start = Date.now();
    try {
      const requestData = { message: 'Привет!', ...provider.data };
      const response = await axios.post(provider.url, requestData, { timeout: 10000 });
      const duration = Date.now() - start;
      
      if (response.data && response.data.response) {
        console.log(`✅ ${provider.name}: ${duration}мс`);
        console.log(`   📝 Ответ: ${response.data.response.substring(0, 60)}...`);
        console.log(`   🔧 Провайдер: ${response.data.provider || 'Unknown'}`);
      } else {
        console.log(`⚠️ ${provider.name}: ${duration}мс (пустой ответ)`);
      }
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ ${provider.name}: ${duration}мс - ${error.message}`);
    }
    console.log('');
  }
}

testProviders();