/**
 * Python Provider Routes - интеграция с Python G4F сервером
 */

/**
 * Вызов Python AI провайдера
 * @param {string} message - Сообщение пользователя
 * @param {string} provider - Название провайдера
 * @returns {Promise<Object>} - Ответ от AI
 */
async function callPythonAI(message, provider = 'Qwen_Qwen_2_5_Max') {
  try {
    console.log(`🐍 [PYTHON_AI] Вызываем Python провайдер ${provider}...`);
    
    const response = await fetch('http://localhost:5004/python/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        provider: provider
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [PYTHON_AI] Успешный ответ от ${provider}`);
      return data;
    } else {
      console.log(`❌ [PYTHON_AI] Ошибка HTTP ${response.status} от ${provider}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ [PYTHON_AI] Ошибка подключения к Python провайдеру:`, error.message);
    return null;
  }
}

module.exports = {
  callPythonAI
};