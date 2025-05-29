#!/usr/bin/env python3
"""
Упрощенный G4F провайдер с минимальным набором работающих провайдеров
"""

import g4f
import logging
import time
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)
CORS(app)

def get_simple_response(message, provider_name=None):
    """
    Простая функция получения ответа через g4f
    """
    try:
        # Используем только самые надежные провайдеры
        working_providers = ['You', 'DDG', 'HuggingChat', 'DeepInfra']
        
        if provider_name and provider_name in working_providers:
            selected_provider = provider_name
        else:
            selected_provider = working_providers[0]  # You
        
        logging.info(f"Используем провайдер: {selected_provider}")
        
        # Создаем ответ через g4f
        response = g4f.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": message}],
            provider=getattr(g4f.Provider, selected_provider)
        )
        
        return {
            "success": True,
            "response": str(response),
            "provider": selected_provider,
            "model": "gpt-3.5-turbo"
        }
        
    except Exception as e:
        logging.error(f"Ошибка провайдера {selected_provider}: {str(e)}")
        
        # Fallback на демо ответ
        return {
            "success": False,
            "response": f"Привет! Я BOOOMERANGS AI чат. Ваше сообщение: '{message}'. Сейчас я работаю в демо режиме.",
            "provider": "demo",
            "model": "fallback",
            "error": str(e)
        }

@app.route('/')
def index():
    return "BOOOMERANGS Simple G4F API работает!"

@app.route('/python/test', methods=['POST'])
def test():
    """Тестовый эндпоинт"""
    try:
        data = request.json or {}
        message = data.get('message', 'Привет!')
        
        result = get_simple_response(message, "You")
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Ошибка в тесте: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": f"Тест не удался: {str(e)}",
            "provider": "test-error"
        }), 500

@app.route('/python/chat', methods=['POST'])
def chat():
    """Основной чат эндпоинт"""
    try:
        data = request.json or {}
        message = data.get('message', '')
        provider = data.get('provider', 'You')
        
        if not message:
            return jsonify({"error": "Сообщение не может быть пустым"}), 400
        
        result = get_simple_response(message, provider)
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Ошибка в чате: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": f"Ошибка: {str(e)}",
            "provider": "error"
        }), 500

if __name__ == '__main__':
    logging.info("🚀 Запуск упрощенного BOOOMERANGS G4F сервера...")
    app.run(host='0.0.0.0', port=5005, debug=False)