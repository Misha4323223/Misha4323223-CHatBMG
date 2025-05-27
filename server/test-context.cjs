/**
 * Простой тестер контекста чата
 * Проверяет работу памяти разговора
 */

const http = require('http');

async function testContext() {
  console.log('\n🧪 === ТЕСТИРОВАНИЕ КОНТЕКСТА ===');
  
  const sessionId = `test_${Date.now()}`;
  
  try {
    // Тест 1: Представление
    console.log('\n📝 Тест 1: Знакомство');
    const response1 = await sendMessage("Привет! Меня зовут Алексей", sessionId);
    console.log('📥 Ответ 1:', response1.substring(0, 100) + '...');
    
    // Пауза
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Тест 2: Проверка памяти
    console.log('\n🧠 Тест 2: Память имени');
    const response2 = await sendMessage("Как меня зовут?", sessionId);
    console.log('📥 Ответ 2:', response2);
    
    if (response2.toLowerCase().includes('алексей')) {
      console.log('✅ КОНТЕКСТ РАБОТАЕТ! AI помнит имя');
      return true;
    } else {
      console.log('❌ КОНТЕКСТ НЕ РАБОТАЕТ! AI не помнит имя');
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка тестирования:', error.message);
    return false;
  }
}

async function sendMessage(message, sessionId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message: message,
      provider: 'Qwen_Qwen_2_5_Max',
      sessionId: sessionId
    });
    
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/api/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          let fullResponse = '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.text) fullResponse += parsed.text;
              } catch (e) {}
            }
          }
          
          resolve(fullResponse || 'Нет ответа');
        } catch (error) {
          reject(new Error('Ошибка парсинга: ' + error.message));
        }
      });
    });
    
    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Таймаут'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Запуск теста
if (require.main === module) {
  testContext().then((success) => {
    console.log(success ? '\n🎉 ТЕСТ ПРОЙДЕН!' : '\n⚠️ ТЕСТ ПРОВАЛЕН!');
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testContext };