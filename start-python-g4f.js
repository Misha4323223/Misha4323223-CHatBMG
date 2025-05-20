// Скрипт для запуска Python G4F сервера
const { spawn } = require('child_process');
const path = require('path');

console.log('Запуск Python G4F сервера...');

// Запуск Python скрипта
const pythonProcess = spawn('python', [path.join(__dirname, 'g4f_server.py')], {
  stdio: 'inherit'
});

// Обработка завершения процесса
pythonProcess.on('exit', (code) => {
  console.log(`Python G4F сервер завершил работу с кодом: ${code}`);
});

// Обработка ошибок
pythonProcess.on('error', (err) => {
  console.error('Ошибка при запуске Python G4F сервера:', err);
});

console.log('Python G4F сервер запущен в фоновом режиме');