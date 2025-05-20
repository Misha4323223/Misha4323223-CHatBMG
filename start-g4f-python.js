// Скрипт для запуска Python G4F API сервера
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

// Получение текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pythonProcess = null;

// Функция для проверки работоспособности Python API
async function checkPythonApiStatus() {
  try {
    const response = await fetch('http://localhost:5001/');
    if (response.ok) {
      console.log("✅ Python G4F API успешно запущен и работает");
      return true;
    } else {
      console.log("❌ Python G4F API запущен, но возвращает ошибку:", await response.text());
      return false;
    }
  } catch (error) {
    console.log("❌ Python G4F API не отвечает:", error.message);
    return false;
  }
}

// Функция для запуска Python API
export function startPythonG4FApi() {
  // Если процесс уже запущен, завершаем его
  if (pythonProcess) {
    console.log("Перезапуск Python G4F API...");
    pythonProcess.kill();
  }
  
  console.log("Запуск Python G4F API...");
  
  // Запуск Python скрипта
  pythonProcess = spawn('python', [path.join(__dirname, 'g4f_api.py')], {
    stdio: 'inherit'
  });
  
  // Обработка событий процесса
  pythonProcess.on('error', (error) => {
    console.error("Ошибка при запуске Python G4F API:", error.message);
  });
  
  pythonProcess.on('exit', (code, signal) => {
    if (code) {
      console.log(`Python G4F API завершил работу с кодом: ${code}`);
    } else if (signal) {
      console.log(`Python G4F API остановлен сигналом: ${signal}`);
    } else {
      console.log("Python G4F API завершил работу");
    }
    pythonProcess = null;
  });
  
  // Проверяем статус через 3 секунды
  setTimeout(() => {
    checkPythonApiStatus().then(isRunning => {
      if (!isRunning) {
        console.log("⚠️ Python G4F API не удалось запустить. Убедитесь, что установлены все зависимости.");
      }
    });
  }, 3000);
  
  return pythonProcess;
}

// Если скрипт запущен напрямую, а не импортирован
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("Запуск Python G4F API из командной строки");
  startPythonG4FApi();
}

// Функция для остановки Python API
export function stopPythonG4FApi() {
  if (pythonProcess) {
    console.log("Остановка Python G4F API...");
    pythonProcess.kill();
    pythonProcess = null;
    return true;
  }
  return false;
}