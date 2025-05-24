/**
 * Прямая интеграция с вашим аккаунтом ChatGPT через EdgeGPT
 */

const { spawn } = require('child_process');

/**
 * Подключение к вашему аккаунту ChatGPT с использованием EdgeGPT
 * @param {string} message - Сообщение для ChatGPT
 * @returns {Promise<Object>} - Ответ от вашего аккаунта ChatGPT
 */
async function getChatGPTResponse(message) {
  return new Promise((resolve) => {
    console.log('🔑 Подключение к вашему аккаунту ChatGPT...');
    
    const pythonScript = `
import asyncio
import os
import sys
import json

async def chat_with_edgegpt():
    try:
        from EdgeGPT import Chatbot
        
        # Создаем подключение к вашему аккаунту ChatGPT
        bot = Chatbot()
        
        # Отправляем ваше сообщение
        response = await bot.ask(prompt="${message.replace(/"/g, '\\"')}")
        
        # Извлекаем ответ
        if response and 'item' in response:
            messages = response['item']['messages']
            if messages:
                for msg in reversed(messages):
                    if msg.get('author') == 'bot':
                        if 'adaptiveCards' in msg:
                            text = msg['adaptiveCards'][0]['body'][0]['text']
                            result = {
                                "success": True,
                                "response": text,
                                "provider": "EdgeGPT (Ваш аккаунт ChatGPT)",
                                "model": "gpt-4"
                            }
                            print(json.dumps(result))
                            await bot.close()
                            return
        
        await bot.close()
        print(json.dumps({"success": False, "error": "Не удалось получить ответ от ChatGPT"}))
        
    except ImportError:
        print(json.dumps({"success": False, "error": "EdgeGPT библиотека не установлена"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Ошибка подключения к ChatGPT: {str(e)}"}))

# Запускаем подключение к вашему аккаунту
asyncio.run(chat_with_edgegpt())
`;

    const python = spawn('python3', ['-c', pythonScript], {
      env: {
        ...process.env,
        CHATGPT_EMAIL: process.env.CHATGPT_EMAIL,
        CHATGPT_PASSWORD: process.env.CHATGPT_PASSWORD
      }
    });

    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      try {
        if (output.trim()) {
          const lines = output.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          
          if (result.success) {
            console.log('✅ Получен ответ от вашего аккаунта ChatGPT');
          } else {
            console.log('❌ Ошибка подключения к ChatGPT:', result.error);
          }
          
          resolve(result);
        } else {
          resolve({
            success: false,
            error: error || 'Нет ответа от EdgeGPT'
          });
        }
      } catch (e) {
        resolve({
          success: false,
          error: 'Ошибка обработки ответа от EdgeGPT'
        });
      }
    });

    // Таймаут для длительных запросов
    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        error: 'Превышено время ожидания ответа от ChatGPT'
      });
    }, 45000);
  });
}

module.exports = {
  getChatGPTResponse
};