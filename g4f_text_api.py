#!/usr/bin/env python3
# Упрощенный и оптимизированный G4F API, ориентированный только на текстовые ответы
from flask import Flask, request, jsonify, render_template_string
import g4f
import logging
import random
import time
import re
import os
from threading import Thread

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('g4f-text-api')

app = Flask(__name__)

# Кеш для провайдеров и их моделей
provider_models_cache = []
last_cache_update = 0
CACHE_TTL = 600  # 10 минут

# Список известных текстовых моделей для каждого провайдера
PROVIDER_MODEL_MAPPING = {
    "Qwen_Qwen_2_5": "qwen-2.5",
    "OpenAIFM": "gpt-3.5-turbo",
    "HuggingFace": "openchat_3.5",
    "Aichat": "gpt-3.5-turbo",
    "FreeGpt": "gemini-1.5-pro",
    "Blackbox": "gemini-1.5-pro",
    "You": "gpt-4o-mini",
    "GptGo": "gpt-3.5-turbo",
}

# Список провайдеров, которых следует избегать из-за известных проблем
BLACKLISTED_PROVIDERS = [
    "Bing",  # Возвращает странные форматы
    "HarProvider",  # Частые ошибки 403
    "OpenAI",  # Требует ключ
    "EdgeTTS",  # Только аудио
    "gTTS",  # Только аудио
]

def is_html_or_xml(text):
    """Проверяет, является ли текст HTML или XML по наличию тегов"""
    return bool(re.search(r'<\s*[a-z][^>]*>', text, re.IGNORECASE))

def get_working_provider_models():
    """Получает список рабочих провайдеров с их моделями"""
    global provider_models_cache, last_cache_update
    
    # Проверяем, не устарел ли кеш
    current_time = time.time()
    if provider_models_cache and current_time - last_cache_update < CACHE_TTL:
        return provider_models_cache
    
    # Обновляем кеш
    provider_models = []
    
    # Пытаемся получить все атрибуты g4f.Provider
    provider_names = []
    try:
        provider_names = g4f.Provider.__all__
    except:
        # Если не удалось получить атрибут __all__, пробуем другой подход
        provider_names = [attr for attr in dir(g4f.Provider) 
                        if not attr.startswith('__') and attr[0].isupper()]
    
    # Проверяем каждого провайдера
    for name in provider_names:
        # Пропускаем провайдеров из черного списка
        if name in BLACKLISTED_PROVIDERS:
            continue
            
        try:
            provider = getattr(g4f.Provider, name)
            
            # Проверяем, что провайдер работает и не требует авторизации
            if not hasattr(provider, "working") or not provider.working:
                continue
                
            if hasattr(provider, "needs_auth") and provider.needs_auth:
                continue
            
            # Получаем модель для провайдера
            model = None
            
            # Сначала проверяем наше сопоставление
            if name in PROVIDER_MODEL_MAPPING:
                model = PROVIDER_MODEL_MAPPING[name]
            # Затем пытаемся получить модель по умолчанию
            elif hasattr(provider, "default_model"):
                model = provider.default_model
            
            # Если модель найдена, добавляем провайдера в список
            if model:
                provider_models.append({
                    "provider": provider,
                    "name": name,
                    "model": model
                })
                logger.info(f"Найден рабочий провайдер: {name} с моделью {model}")
        except Exception as e:
            logger.error(f"Ошибка при проверке провайдера {name}: {str(e)}")
    
    # Обновляем кеш
    provider_models_cache = provider_models
    last_cache_update = current_time
    
    # Перемешиваем список для распределения нагрузки
    random.shuffle(provider_models_cache)
    
    return provider_models_cache

@app.route('/api/text/chat', methods=['POST'])
def chat():
    """Эндпоинт для текстового чата с G4F"""
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({
                'error': 'Отсутствует сообщение в запросе',
                'response': 'Пожалуйста, укажите сообщение для отправки модели.',
                'provider': 'error',
                'model': 'none'
            }), 400
        
        message = data.get('message', '')
        specified_model = data.get('model', '')
        max_retries = int(data.get('max_retries', 3))
        
        logger.info(f"Запрос текстового чата: {message[:50]}...")
        
        # Получаем список провайдеров
        provider_models = get_working_provider_models()
        
        if not provider_models:
            logger.error("Не найдено рабочих провайдеров")
            return jsonify({
                'error': 'Не найдено рабочих провайдеров',
                'response': 'К сожалению, не найдено рабочих провайдеров G4F. Повторите попытку позже.',
                'provider': 'error',
                'model': 'none'
            }), 500
        
        # Фильтруем провайдеров, если указана конкретная модель
        if specified_model:
            # Упрощаем имя модели для сравнения
            simplified_model = specified_model.lower().replace('_', '-').replace(' ', '-')
            
            filtered_providers = []
            for item in provider_models:
                provider_model = item["model"].lower().replace('_', '-').replace(' ', '-')
                
                # Если модель содержит указанную модель или наоборот
                if simplified_model in provider_model or provider_model in simplified_model:
                    filtered_providers.append(item)
            
            # Если есть подходящие провайдеры, используем их
            if filtered_providers:
                provider_models = filtered_providers
        
        # Формируем сообщения для модели
        messages = [{"role": "user", "content": message}]
        
        # Пробуем каждого провайдера
        for retry in range(max_retries):
            for item in provider_models:
                provider = item["provider"]
                model = item["model"]
                name = item["name"]
                
                try:
                    logger.info(f"Попытка {retry+1} с провайдером {name}")
                    
                    # Получаем ответ от провайдера
                    response = g4f.ChatCompletion.create(
                        model=model,
                        messages=messages,
                        provider=provider,
                        timeout=15  # Ограничиваем время ожидания
                    )
                    
                    # Проверяем, что ответ - это строка и не пустой
                    if not isinstance(response, str) or not response.strip():
                        logger.warning(f"Пустой или некорректный ответ от {name}")
                        continue
                    
                    # Проверяем, не является ли ответ HTML или XML
                    if is_html_or_xml(response):
                        logger.warning(f"Ответ от {name} содержит HTML/XML: {response[:100]}...")
                        continue
                    
                    # Если всё хорошо, возвращаем ответ
                    logger.info(f"Получен успешный ответ от {name}: {response[:50]}...")
                    
                    return jsonify({
                        'response': response,
                        'provider': name,
                        'model': model
                    })
                    
                except Exception as e:
                    logger.error(f"Ошибка при использовании провайдера {name} (попытка {retry+1}): {str(e)}")
                    continue
            
            # Если все провайдеры не сработали, ждем перед следующей попыткой
            if retry < max_retries - 1:
                delay = 1 + retry  # Увеличиваем задержку с каждой попыткой
                logger.info(f"Все провайдеры не сработали. Ожидание {delay} сек перед следующей попыткой")
                time.sleep(delay)
        
        # Если все провайдеры не сработали после всех попыток
        logger.error("Все провайдеры не сработали после всех попыток")
        
        return jsonify({
            'response': 'К сожалению, не удалось получить ответ от провайдеров G4F. Наши системы продолжают работать над решением этой проблемы. Пожалуйста, повторите попытку позже или задайте другой вопрос.',
            'provider': 'retry_error',
            'model': 'none'
        })
        
    except Exception as e:
        logger.exception(f"Непредвиденная ошибка: {str(e)}")
        
        return jsonify({
            'error': str(e),
            'response': f'Произошла ошибка при обработке запроса: {str(e)}. Пожалуйста, повторите попытку позже.',
            'provider': 'error',
            'model': 'none'
        }), 500

@app.route('/api/text/providers', methods=['GET'])
def list_providers():
    """Эндпоинт для получения списка доступных провайдеров"""
    try:
        provider_models = get_working_provider_models()
        
        # Форматируем данные для ответа
        providers = [{
            'name': item['name'],
            'model': item['model'],
            'working': True
        } for item in provider_models]
        
        return jsonify({
            'providers': providers,
            'count': len(providers)
        })
        
    except Exception as e:
        logger.exception(f"Ошибка при получении списка провайдеров: {str(e)}")
        
        return jsonify({
            'error': str(e),
            'providers': [],
            'count': 0
        }), 500

@app.route('/')
def home():
    """Информационная страница"""
    # Получаем количество провайдеров
    provider_count = len(get_working_provider_models())
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>G4F Text API</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 { color: #0066cc; }
            h2 { color: #0099cc; margin-top: 30px; }
            pre {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
            }
            .endpoint {
                background-color: #f9f9f9;
                border-left: 4px solid #0099cc;
                padding: 10px 15px;
                margin-bottom: 20px;
            }
            .method {
                display: inline-block;
                padding: 3px 6px;
                border-radius: 3px;
                font-weight: bold;
                margin-right: 10px;
            }
            .get { background-color: #61affe; color: white; }
            .post { background-color: #49cc90; color: white; }
            .stats {
                font-size: 18px;
                margin: 20px 0;
                color: #0066cc;
            }
        </style>
    </head>
    <body>
        <h1>G4F Text API</h1>
        <p>API для получения только текстовых ответов от моделей G4F без требования API-ключей</p>
        
        <div class="stats">
            <strong>Доступно {{ provider_count }} провайдеров</strong>
        </div>
        
        <h2>Эндпоинты</h2>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <strong>/api/text/chat</strong>
            <p>Отправить запрос и получить текстовый ответ от одной из доступных моделей</p>
            <pre>
// Запрос
{
  "message": "Текст сообщения",
  "model": "gpt-3.5-turbo",  // опционально
  "max_retries": 3  // опционально
}

// Ответ
{
  "response": "Текст ответа от модели",
  "provider": "ProviderName",
  "model": "ModelName"
}
            </pre>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/text/providers</strong>
            <p>Получить список доступных провайдеров и моделей</p>
        </div>
        
    </body>
    </html>
    """
    
    return render_template_string(html, provider_count=provider_count)

def run_server():
    """Запуск сервера Flask"""
    try:
        # Загружаем провайдеров при запуске
        providers = get_working_provider_models()
        logger.info(f"Запуск G4F Text API - загружено {len(providers)} провайдеров")
        
        # Запускаем сервер
        app.run(host='0.0.0.0', port=5002, debug=False)
    except Exception as e:
        logger.exception(f"Ошибка при запуске сервера: {str(e)}")

if __name__ == "__main__":
    run_server()