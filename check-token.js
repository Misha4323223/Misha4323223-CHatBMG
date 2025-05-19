// Скрипт для проверки валидности токена ChatGPT
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Ошибка: ACCESS_TOKEN не найден в переменных окружения');
  process.exit(1);
}

console.log('📝 Запускаем проверку токена...');
console.log(`📝 Токен начинается с: ${ACCESS_TOKEN.substring(0, 15)}...`);

async function checkToken() {
  try {
    const response = await fetch('https://chat.openai.com/backend-api/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (response.ok) {
      console.log('✅ Токен работает! Ответ от сервера получен успешно.');
      const data = await response.json();
      console.log('📋 Доступные модели:', data.models ? data.models.length : 'Нет данных о моделях');
      return true;
    } else {
      console.error(`❌ Ошибка при проверке токена. Статус: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('📋 Ответ сервера:', errorText.substring(0, 500) + '...');
      return false;
    }
  } catch (error) {
    console.error('❌ Произошла ошибка при проверке токена:', error.message);
    return false;
  }
}

// Запускаем проверку
checkToken().then(isValid => {
  if (isValid) {
    console.log('🎉 Токен прошел проверку и работает корректно!');
  } else {
    console.log('😢 Токен не работает. Проверьте правильность токена и срок его действия.');
  }
});