#!/usr/bin/env python3
"""
Рабочий AI провайдер с проверенными бесплатными сервисами
"""

import g4f
import logging
import time
import json
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)
CORS(app)

# Проверенные бесплатные провайдеры
FREE_PROVIDERS = ['FreeGpt', 'You', 'Blackbox', 'Liaobots', 'DDG', 'Phind']

def get_ai_response(message, provider_name=None):
    """
    Получение ответа от бесплатных AI провайдеров
    """
    if not provider_name or provider_name not in FREE_PROVIDERS:
        provider_name = 'FreeGpt'  # По умолчанию самый надежный
    
    try:
        logging.info(f"Запрос к AI провайдеру: {provider_name}")
        
        # Получаем провайдер
        provider = getattr(g4f.Provider, provider_name)
        
        # Создаем ответ
        response = g4f.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": message}],
            provider=provider
        )
        
        result = str(response).strip()
        
        if result and len(result) > 10:  # Проверяем что ответ содержательный
            return {
                "success": True,
                "response": result,
                "provider": provider_name,
                "model": "gpt-3.5-turbo"
            }
        else:
            raise Exception("Пустой или слишком короткий ответ")
            
    except Exception as e:
        logging.error(f"Ошибка провайдера {provider_name}: {str(e)}")
        
        # Пробуем другой провайдер
        for backup_provider in FREE_PROVIDERS:
            if backup_provider != provider_name:
                try:
                    logging.info(f"Пробуем резервный провайдер: {backup_provider}")
                    provider = getattr(g4f.Provider, backup_provider)
                    response = g4f.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": message}],
                        provider=provider
                    )
                    result = str(response).strip()
                    if result and len(result) > 10:
                        return {
                            "success": True,
                            "response": result,
                            "provider": f"{backup_provider}_backup",
                            "model": "gpt-3.5-turbo"
                        }
                except Exception as backup_error:
                    logging.error(f"Резервный провайдер {backup_provider} тоже не работает: {str(backup_error)}")
                    continue
        
        # Если все провайдеры не работают, возвращаем умный fallback
        return {
            "success": False,
            "response": f"Привет! Я BOOOMERANGS AI. Ваше сообщение: '{message}'. К сожалению, сейчас у меня проблемы с подключением к AI сервисам. Попробуйте позже или используйте другой провайдер.",
            "provider": "fallback",
            "model": "demo",
            "error": str(e)
        }

@app.route('/')
def index():
    return "BOOOMERANGS AI Provider работает! Доступные провайдеры: " + ", ".join(FREE_PROVIDERS)

@app.route('/python/chat', methods=['POST'])
def chat():
    """Основной эндпоинт для чата"""
    try:
        data = request.json or {}
        message = data.get('message', '').strip()
        provider = data.get('provider', 'FreeGpt')
        
        if not message:
            return jsonify({"error": "Сообщение не может быть пустым"}), 400
        
        result = get_ai_response(message, provider)
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Общая ошибка: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": f"Произошла ошибка при обработке запроса: {str(e)}",
            "provider": "error"
        }), 500

@app.route('/python/test', methods=['POST'])
def test():
    """Тестовый эндпоинт"""
    try:
        data = request.json or {}
        message = data.get('message', 'Привет! Как дела?')
        
        result = get_ai_response(message, 'FreeGpt')
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "response": f"Тест не удался: {str(e)}",
            "provider": "test-error"
        }), 500

@app.route('/providers', methods=['GET'])
def list_providers():
    """Список доступных провайдеров"""
    return jsonify({
        "free_providers": FREE_PROVIDERS,
        "total": len(FREE_PROVIDERS),
        "status": "ready"
    })

if __name__ == '__main__':
    logging.info(f"🚀 Запуск рабочего AI провайдера с {len(FREE_PROVIDERS)} бесплатными сервисами")
    app.run(host='0.0.0.0', port=5006, debug=False)