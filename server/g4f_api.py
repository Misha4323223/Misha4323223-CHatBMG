#!/usr/bin/env python3
"""
G4F API сервер для подключения к настоящим AI провайдерам
Обеспечивает бесплатный доступ к Qwen, ChatGPT, Gemini, Phind
"""

import asyncio
import json
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import g4f
    from g4f.client import Client
    print("✅ G4F библиотека успешно загружена")
    
    # Получаем все доступные провайдеры
    available_providers = g4f.Provider.__all__ if hasattr(g4f.Provider, '__all__') else []
    print(f"📦 Доступные провайдеры: {len(available_providers)}")
    
except ImportError as e:
    print(f"❌ Ошибка импорта G4F: {e}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Конфигурация провайдеров - используем простые строки
PROVIDERS = {
    'qwen': ['You', 'Bing', 'ChatGpt'],
    'chatgpt': ['ChatGpt', 'You', 'Bing'],
    'gemini': ['Gemini', 'You', 'Bing'],
    'phind': ['Phind', 'ChatGpt', 'You'],
    'general': ['You', 'Bing', 'ChatGpt', 'Gemini']
}

class G4FManager:
    def __init__(self):
        self.client = Client()
        print("🚀 G4F клиент инициализирован")
    
    async def get_response(self, message, provider_type='general', max_tokens=500):
        """Получить ответ от AI провайдера"""
        providers = PROVIDERS.get(provider_type, PROVIDERS['general'])
        
        for provider_name in providers:
            try:
                print(f"🔄 Пробуем провайдер: {provider_name}")
                
                # Используем простой синхронный вызов g4f
                response = g4f.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": message}],
                    provider=getattr(g4f.Provider, provider_name, None)
                )
                
                if response and isinstance(response, str) and len(response.strip()) > 10:
                    print(f"✅ Успешный ответ от {provider_name}")
                    return {
                        'success': True,
                        'response': response.strip(),
                        'provider': provider_name,
                        'model': 'gpt-3.5-turbo'
                    }
                
            except Exception as e:
                print(f"❌ Ошибка {provider_name}: {str(e)}")
                continue
        
        return {
            'success': False,
            'error': 'Все провайдеры недоступны',
            'provider': 'None'
        }

# Инициализация менеджера
g4f_manager = G4FManager()

@app.route('/chat', methods=['POST'])
async def chat():
    """Основной эндпоинт для чата"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_type = data.get('provider', 'general')
        
        if not message:
            return jsonify({'error': 'Сообщение не может быть пустым'}), 400
        
        print(f"📝 Получен запрос: {message[:50]}...")
        print(f"🎯 Тип провайдера: {provider_type}")
        
        result = await g4f_manager.get_response(message, provider_type)
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Ошибка в /chat: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'provider': 'Error'
        }), 500

@app.route('/providers', methods=['GET'])
def get_providers():
    """Получить список доступных провайдеров"""
    return jsonify({
        'providers': list(PROVIDERS.keys()),
        'status': 'active'
    })

@app.route('/health', methods=['GET'])
def health():
    """Проверка состояния сервиса"""
    return jsonify({
        'status': 'healthy',
        'g4f_version': g4f.__version__ if hasattr(g4f, '__version__') else 'unknown'
    })

if __name__ == '__main__':
    print("🚀 Запуск G4F API сервера...")
    print("🌐 Доступные эндпоинты:")
    print("  POST /chat - Отправка сообщений AI")
    print("  GET /providers - Список провайдеров")
    print("  GET /health - Состояние сервиса")
    
    app.run(host='0.0.0.0', port=5001, debug=False)