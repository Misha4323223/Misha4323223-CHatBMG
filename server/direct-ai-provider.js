/**
 * Прямой провайдер AI - использует g4f-provider.js
 */

const g4fProvider = require('./g4f-provider');

const AI_PROVIDERS = {
  'Qwen': 'Qwen от Alibaba',
  'Phind': 'Phind поисковый AI',
  'Gemini': 'Google Gemini',
  'auto': 'Автоматический выбор'
};

/**
 * Получение ответа от AI провайдера
 */
async function getChatResponse(message, options = {}) {
  try {
    const response = await g4fProvider.getResponse(message, options);
    return response;
  } catch (error) {
    console.error('❌ Ошибка direct-ai-provider:', error);
    return {
      success: false,
      error: error.message,
      response: 'Ошибка получения ответа от AI провайдера'
    };
  }
}

module.exports = {
  AI_PROVIDERS,
  getChatResponse
};