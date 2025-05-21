/**
 * Тестовый скрипт для проверки работы DeepInfra
 * Отправляет запрос напрямую к DeepInfra API
 */
const http = require('http');

// Функция для отправки запроса к DeepInfra
async function testDeepInfra(message) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      message: message,
      model: 'mixtral', // Выбираем mixtral как одну из лучших моделей
      promptType: 'general'
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/deepinfra/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (err) {
          reject(new Error(`Ошибка при парсинге ответа: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Проверочные запросы
async function runTest() {
  try {
    console.log('Отправка запроса к DeepInfra...');
    
    const testMessage = "Объясни, как работает трансформерная архитектура в нейронных сетях простыми словами";
    const response = await testDeepInfra(testMessage);
    
    console.log('\n=== РЕЗУЛЬТАТ ЗАПРОСА ===');
    console.log('Статус:', response.success ? 'Успешно' : 'Ошибка');
    console.log('Провайдер:', response.provider);
    console.log('Модель:', response.model);
    
    if (response.success) {
      console.log('\n=== ОТВЕТ ОТ DEEPINFRA ===');
      console.log(response.response);
    } else {
      console.log('\n=== ОШИБКА ===');
      console.log(response.error);
    }
  } catch (error) {
    console.error('Произошла ошибка при выполнении теста:', error.message);
  }
}

// Запускаем тест
runTest();