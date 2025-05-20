const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let textApiProcess = null;
let isStarting = false;

async function checkTextApiStatus() {
  return new Promise((resolve) => {
    const testRequest = setTimeout(() => {
      fetch('http://localhost:5002/')
        .then(response => {
          if (response.ok) {
            console.log('✅ G4F Text API успешно запущен и работает');
            clearTimeout(failTimeout);
            resolve(true);
          } else {
            throw new Error(`Неожиданный статус: ${response.status}`);
          }
        })
        .catch(error => {
          console.log(`Ожидание запуска Text API... (${error.message})`);
          resolve(false);
        });
    }, 2000); // Проверяем через 2 секунды

    const failTimeout = setTimeout(() => {
      console.log('Превышено время ожидания ответа от Text API');
      clearTimeout(testRequest);
      resolve(false);
    }, 10000); // Максимальное время ожидания - 10 секунд
  });
}

async function startTextApi() {
  if (textApiProcess !== null) {
    console.log('Text API уже запущен');
    return textApiProcess;
  }

  if (isStarting) {
    console.log('Text API уже запускается...');
    return null;
  }

  isStarting = true;
  console.log('Запуск Text G4F API...');

  try {
    const scriptPath = path.join(process.cwd(), 'g4f_text_api.py');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`Ошибка: файл ${scriptPath} не найден`);
      isStarting = false;
      return null;
    }

    textApiProcess = spawn('python', [scriptPath], {
      detached: true,
      stdio: 'pipe'
    });

    textApiProcess.stdout.on('data', (data) => {
      console.log(`Text API лог: ${data.toString().trim()}`);
    });

    textApiProcess.stderr.on('data', (data) => {
      console.error(`Text API ошибка: ${data.toString().trim()}`);
    });

    textApiProcess.on('close', (code) => {
      console.log(`Text API процесс завершился с кодом ${code}`);
      textApiProcess = null;
    });

    // Проверяем, запустился ли API
    let apiRunning = false;
    let retries = 0;
    const maxRetries = 5;

    while (!apiRunning && retries < maxRetries) {
      apiRunning = await checkTextApiStatus();
      if (!apiRunning) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды перед следующей попыткой
      }
    }

    if (apiRunning) {
      console.log('Text API успешно запущен');
    } else {
      console.error('Не удалось запустить Text API после нескольких попыток');
      stopTextApi();
    }

    isStarting = false;
    return textApiProcess;

  } catch (error) {
    console.error(`Ошибка при запуске Text API: ${error.message}`);
    isStarting = false;
    return null;
  }
}

function stopTextApi() {
  if (textApiProcess) {
    console.log('Остановка Text API...');
    try {
      // Для Windows использовать: process.kill(textApiProcess.pid)
      process.kill(-textApiProcess.pid, 'SIGTERM');
    } catch (error) {
      console.error(`Ошибка при остановке Text API: ${error.message}`);
      // Пробуем более жесткую остановку
      try {
        process.kill(-textApiProcess.pid, 'SIGKILL');
      } catch (e) {
        console.error(`Не удалось остановить Text API: ${e.message}`);
      }
    }
    textApiProcess = null;
  } else {
    console.log('Text API не запущен');
  }
}

// Экспортируем функции для внешнего использования
module.exports = {
  startTextApi,
  stopTextApi
};

// Если скрипт запущен напрямую, запускаем API
if (require.main === module) {
  startTextApi();
}