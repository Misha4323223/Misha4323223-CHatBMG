/**
 * Прямой тест Python G4F API
 * Этот скрипт позволяет напрямую протестировать различные провайдеры через Python G4F API
 */
const http = require('http');

// Функция для отправки запроса к Python G4F API
async function testPythonG4F(provider, message) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      message: message,
      provider: provider,  // Принудительно указываем провайдера
      force_provider: true, // Запрещаем автоматическое переключение
      timeout: 30000  // Увеличенный таймаут для медленных провайдеров
    });
    
    const options = {
      hostname: 'localhost',
      port: 5004,
      path: '/python/direct',  // Используем прямой доступ к Python G4F
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
    
    // Устанавливаем таймаут
    req.setTimeout(35000, () => {
      req.destroy();
      reject(new Error('Таймаут запроса к Python G4F API'));
    });
    
    req.write(requestData);
    req.end();
  });
}

// Запуск теста с указанным провайдером
async function runTest() {
  // Доступные провайдеры в Python G4F для проверки
  const providers = [
    'You',            // You.com - обычно бесплатный
    'HuggingChat',    // HuggingFace Chat - бесплатный
    'Anthropic',      // Claude через G4F
    'Phind',          // Phind - для технических вопросов
    'AiChats',        // AiChats - обычно бесплатный
    'FreeGpt'         // FreeGpt - предположительно бесплатный
  ];
  
  // Выбранный для теста провайдер (можно изменить)
  const providerToTest = 'Anthropic';
  
  // Тестовый вопрос
  const testMessage = "Объясни, как работает трансформерная архитектура в нейронных сетях простыми словами";
  
  console.log(`\n=== НАЧАЛО ТЕСТА ПРОВАЙДЕРА: ${providerToTest} ===`);
  console.log(`Отправка запроса к Python G4F с провайдером ${providerToTest}...`);
  
  try {
    // Отправляем запрос
    const response = await testPythonG4F(providerToTest, testMessage);
    
    console.log('\n=== РЕЗУЛЬТАТ ЗАПРОСА ===');
    if (response.error) {
      console.log('Статус: Ошибка');
      console.log('Сообщение ошибки:', response.error);
    } else {
      console.log('Статус: Успешно');
      console.log('Провайдер:', response.provider || providerToTest);
      console.log('Модель:', response.model || 'Неизвестно');
      
      console.log('\n=== ОТВЕТ ОТ ПРОВАЙДЕРА ===');
      console.log(response.response);
    }
  } catch (error) {
    console.error('\n=== ОШИБКА ПРИ ВЫПОЛНЕНИИ ТЕСТА ===');
    console.error('Сообщение ошибки:', error.message);
  }
  
  console.log('\n=== ДОСТУПНЫЕ ПРОВАЙДЕРЫ ДЛЯ ТЕСТИРОВАНИЯ ===');
  console.log(providers.join(', '));
}

// Запускаем тест
runTest();