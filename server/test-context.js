/**
 * Автоматический тестер контекста чата
 * Проверяет работу памяти разговора после каждого изменения
 */

import http from 'http';

async function testContextMemory() {
  console.log('\n🧪 === АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ КОНТЕКСТА ===');
  
  const sessionId = `test_${Date.now()}`;
  let testsPassed = 0;
  let totalTests = 0;
  
  // Тест 1: Представление
  console.log('\n📝 Тест 1: Знакомство');
  totalTests++;
  
  try {
    const response1 = await sendMessage("Привет! Меня зовут Алексей и я из Москвы", sessionId);
    if (response1.includes('Алексей') || response1.includes('Москва') || response1.length > 10) {
      console.log('✅ Тест 1 ПРОЙДЕН: AI отвечает на знакомство');
      testsPassed++;
    } else {
      console.log('❌ Тест 1 ПРОВАЛЕН: AI не отвечает правильно');
    }
  } catch (error) {
    console.log('❌ Тест 1 ОШИБКА:', error.message);
  }
  
  // Пауза между тестами
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 2: Проверка памяти имени
  console.log('\n🧠 Тест 2: Память имени');
  totalTests++;
  
  try {
    const response2 = await sendMessage("Как меня зовут?", sessionId);
    if (response2.toLowerCase().includes('алексей')) {
      console.log('✅ Тест 2 ПРОЙДЕН: AI помнит имя');
      testsPassed++;
    } else {
      console.log('❌ Тест 2 ПРОВАЛЕН: AI не помнит имя');
      console.log('📝 Ответ AI:', response2);
    }
  } catch (error) {
    console.log('❌ Тест 2 ОШИБКА:', error.message);
  }
  
  // Пауза между тестами
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 3: Проверка памяти города
  console.log('\n🏙️ Тест 3: Память города');
  totalTests++;
  
  try {
    const response3 = await sendMessage("Из какого я города?", sessionId);
    if (response3.toLowerCase().includes('москв')) {
      console.log('✅ Тест 3 ПРОЙДЕН: AI помнит город');
      testsPassed++;
    } else {
      console.log('❌ Тест 3 ПРОВАЛЕН: AI не помнит город');
      console.log('📝 Ответ AI:', response3);
    }
  } catch (error) {
    console.log('❌ Тест 3 ОШИБКА:', error.message);
  }
  
  // Результаты тестирования
  console.log('\n🏆 === РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ КОНТЕКСТА ===');
  console.log(`✅ Пройдено тестов: ${testsPassed}/${totalTests}`);
  console.log(`📊 Успешность: ${Math.round((testsPassed/totalTests)*100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Контекст работает отлично!');
    return true;
  } else {
    console.log('⚠️ ЕСТЬ ПРОБЛЕМЫ С КОНТЕКСТОМ!');
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
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Парсим SSE ответ
          const lines = data.split('\n');
          let fullResponse = '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6);
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.text) {
                  fullResponse += parsed.text;
                }
              } catch (e) {
                // Игнорируем некорректный JSON
              }
            }
          }
          
          console.log(`📤 Отправили: "${message}"`);
          console.log(`📥 Получили: "${fullResponse}"`);
          
          resolve(fullResponse);
        } catch (error) {
          reject(new Error('Ошибка парсинга ответа: ' + error.message));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error('Ошибка запроса: ' + error.message));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Таймаут запроса'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Функция для проверки доступности сервера
async function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'HEAD',
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode < 500);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Главная функция для автоматического тестирования
async function autoTestContext() {
  console.log('🔍 Проверяем доступность сервера...');
  
  const isServerUp = await checkServerHealth();
  if (!isServerUp) {
    console.log('❌ Сервер недоступен. Ждем запуска...');
    return false;
  }
  
  console.log('✅ Сервер доступен, начинаем тестирование...');
  return await testContextMemory();
}

// Экспорт функций
module.exports = {
  testContextMemory,
  autoTestContext,
  sendMessage
};

// Если файл запущен напрямую
if (require.main === module) {
  autoTestContext().then((success) => {
    process.exit(success ? 0 : 1);
  });
}