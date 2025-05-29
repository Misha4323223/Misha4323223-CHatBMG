#!/usr/bin/env python3
"""
Исправленный G4F провайдер с правильными моделями и обработкой ошибок
"""

import g4f
import logging
import time
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

app = Flask(__name__)
CORS(app)

# Конфигурация провайдеров с правильными моделями
PROVIDER_CONFIG = {
    'FreeGpt': 'gpt-4o-mini',
    'You': 'gpt-4o-mini', 
    'Blackbox': 'blackbox',
    'Liaobots': 'gpt-4o-mini',
    'DDG': 'gpt-4o-mini',
    'HuggingChat': 'llama-3.1-70b'
}

def get_g4f_response(message, provider_name='FreeGpt'):
    """Получение ответа от G4F провайдера с правильными моделями"""
    
    try:
        # Выбираем провайдер и модель
        if provider_name not in PROVIDER_CONFIG:
            provider_name = 'FreeGpt'
        
        model = PROVIDER_CONFIG[provider_name]
        provider = getattr(g4f.Provider, provider_name)
        
        logging.info(f"Запрос к {provider_name} с моделью {model}")
        
        # Создаем запрос к G4F
        response = g4f.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": message}],
            provider=provider
        )
        
        result = str(response).strip()
        
        if result and len(result) > 5:
            return {
                "success": True,
                "response": result,
                "provider": provider_name,
                "model": model
            }
        else:
            raise Exception("Пустой ответ от провайдера")
            
    except Exception as e:
        logging.error(f"Ошибка {provider_name}: {str(e)}")
        
        # Пробуем другие провайдеры
        for backup_name, backup_model in PROVIDER_CONFIG.items():
            if backup_name != provider_name:
                try:
                    logging.info(f"Пробуем резервный провайдер: {backup_name}")
                    backup_provider = getattr(g4f.Provider, backup_name)
                    
                    response = g4f.ChatCompletion.create(
                        model=backup_model,
                        messages=[{"role": "user", "content": message}],
                        provider=backup_provider
                    )
                    
                    result = str(response).strip()
                    if result and len(result) > 5:
                        return {
                            "success": True,
                            "response": result,
                            "provider": f"{backup_name}_backup",
                            "model": backup_model
                        }
                        
                except Exception as backup_error:
                    logging.error(f"Резервный провайдер {backup_name} тоже не работает: {str(backup_error)}")
                    continue
        
        # Если все провайдеры не работают
        return {
            "success": False,
            "response": f"К сожалению, все AI провайдеры временно недоступны. Ваше сообщение: '{message}'. Попробуйте позже или используйте другой провайдер.",
            "provider": "fallback",
            "model": "demo",
            "error": str(e)
        }

@app.route('/')
def index():
    return f"G4F провайдер работает! Доступные провайдеры: {list(PROVIDER_CONFIG.keys())}"

@app.route('/python/chat', methods=['POST'])
def chat():
    """Основной чат эндпоинт"""
    try:
        data = request.json or {}
        message = data.get('message', '').strip()
        provider = data.get('provider', 'FreeGpt')
        
        if not message:
            return jsonify({"error": "Сообщение не может быть пустым"}), 400
        
        result = get_g4f_response(message, provider)
        return jsonify(result)
        
    except Exception as e:
        logging.error(f"Общая ошибка: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": f"Ошибка обработки запроса: {str(e)}",
            "provider": "error"
        }), 500

@app.route('/python/test', methods=['POST'])
def test():
    """Тестовый эндпоинт"""
    try:
        data = request.json or {}
        message = data.get('message', 'Привет! Тестируем G4F провайдеры.')
        
        result = get_g4f_response(message, 'FreeGpt')
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "response": f"Тест не удался: {str(e)}",
            "provider": "test-error"
        }), 500

@app.route('/providers', methods=['GET'])
def providers():
    """Список провайдеров"""
    return jsonify({
        "providers": PROVIDER_CONFIG,
        "status": "ready"
    })

if __name__ == '__main__':
    logging.info("🚀 Запуск исправленного G4F провайдера...")
    app.run(host='0.0.0.0', port=5007, debug=False)