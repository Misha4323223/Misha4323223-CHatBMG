#!/usr/bin/env python3
# G4F API сервер на Python
from flask import Flask, request, jsonify, render_template_string
import g4f
import logging
import random
import time
import os
import re
from threading import Thread

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('g4f-api')

app = Flask(__name__)

# Словарь для кеширования ответов, чтобы снизить нагрузку на API
response_cache = {}

# Получение доступных провайдеров
def get_providers():
    """Получение списка провайдеров из g4f"""
    providers = []
    
    # Получение всех провайдеров из модуля
    for provider_name in dir(g4f.Provider):
        # Пропускаем приватные атрибуты и не-классы
        if provider_name.startswith('_') or provider_name.islower():
            continue
        
        try:
            provider_class = getattr(g4f.Provider, provider_name)
            # Проверяем, что это класс провайдера
            if hasattr(provider_class, 'working'):
                provider_info = {
                    'name': provider_name,
                    'working': getattr(provider_class, 'working', False),
                    'supports_stream': getattr(provider_class, 'supports_stream', False),
                    'default_model': getattr(provider_class, 'default_model', None),
                    'needs_auth': getattr(provider_class, 'needs_auth', False)
                }
                providers.append(provider_info)
        except Exception as e:
            logger.error(f"Ошибка при проверке провайдера {provider_name}: {e}")
    
    # Сортируем провайдеры по статусу работы (сначала работающие)
    providers.sort(key=lambda p: (not p['working'], p['needs_auth']))
    
    return providers

# Получение доступных моделей
def get_models():
    """Получение списка моделей из g4f"""
    models = []
    
    # Получение всех моделей из модуля g4f.models
    for model_name in dir(g4f.models):
        # Пропускаем приватные атрибуты, классы и функции
        if (model_name.startswith('_') or model_name[0].isupper() or callable(getattr(g4f.models, model_name, None)) 
            or not isinstance(getattr(g4f.models, model_name, None), str)):
            continue
        
        try:
            model_value = getattr(g4f.models, model_name)
            if isinstance(model_value, str):
                models.append({
                    'name': model_name, 
                    'value': model_value
                })
        except Exception as e:
            logger.error(f"Ошибка при проверке модели {model_name}: {e}")
    
    return models

@app.route('/api/python/g4f/providers', methods=['GET'])
def list_providers():
    """Эндпоинт для получения списка всех доступных провайдеров"""
    providers = get_providers()
    working_count = sum(1 for p in providers if p['working'])
    free_count = sum(1 for p in providers if p['working'] and not p['needs_auth'])
    
    return jsonify({
        'providers': providers,
        'stats': {
            'total': len(providers),
            'working': working_count,
            'free': free_count
        }
    })

@app.route('/api/python/g4f/models', methods=['GET'])
def list_models():
    """Эндпоинт для получения списка всех доступных моделей"""
    models = get_models()
    
    return jsonify({
        'models': models,
        'count': len(models)
    })

@app.route('/api/python/g4f/chat', methods=['POST'])
def chat():
    """Основной эндпоинт для взаимодействия с G4F"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Отсутствует тело запроса'}), 400
        
        # Получаем параметры запроса
        message = data.get('message', '')
        model_name = data.get('model') # Не используем дефолтную модель gpt_3_5_turbo, т.к. она не работает
        provider_name = data.get('provider')
        max_retries = data.get('max_retries', 3)
        
        if not message:
            return jsonify({'error': 'Отсутствует сообщение'}), 400
        
        logger.info(f"Запрос к G4F: модель={model_name or 'auto'}, сообщение='{message[:30]}...'")
        
        # Пытаемся найти ответ в кэше
        cache_key = f"{model_name or 'auto'}:{message}"
        if cache_key in response_cache:
            logger.info(f"Возвращаем кэшированный ответ для '{message[:30]}...'")
            return jsonify({
                'response': response_cache[cache_key], 
                'provider': 'cache', 
                'model': model_name or 'auto'
            })
        
        # Подготавливаем сообщения
        messages = [{"role": "user", "content": message}]
        
        # Если указан конкретный провайдер, используем его
        if provider_name:
            return process_with_provider(provider_name, model_name, messages, max_retries)
        
        # Приоритетные провайдеры, которые наиболее стабильны 
        priority_providers = ['FreeGpt', 'Liaobots', 'You', 'Qwen_Qwen_2_5', 'OpenAIFM', 'Blackbox', 'Gemini', 'GeminiPro', 'GeekGpt', 'MyShell']
        
        # Пробуем сначала приоритетные провайдеры
        for provider in priority_providers:
            logger.info(f"Пробуем приоритетного провайдера: {provider}")
            result = process_with_provider(provider, None, messages, max_retries=1)
            
            # Если это не ошибка (не кортеж) или это ошибка, но не 404/400 
            if not isinstance(result, tuple) or (isinstance(result, tuple) and result[1] not in [404, 400]):
                return result
        
        # Если ни один из приоритетных провайдеров не сработал,
        # пробуем другие провайдеры через стандартный метод
        logger.warning("Ни один из приоритетных провайдеров не сработал, пробуем другие")
        return try_multiple_providers(model_name, messages, max_retries)
        
    except Exception as e:
        logger.exception(f"Ошибка при обработке запроса: {str(e)}")
        # В случае любой ошибки используем локальный fallback
        return local_fallback(message if 'message' in locals() else "")

def process_with_provider(provider_name, model_name, messages, max_retries=3):
    """Обработка запроса с указанным провайдером"""
    
    for attempt in range(max_retries):
        try:
            # Получаем класс провайдера
            provider_class = getattr(g4f.Provider, provider_name, None)
            
            if not provider_class:
                logger.error(f"Провайдер {provider_name} не найден")
                return jsonify({'error': f"Провайдер {provider_name} не найден"}), 404
            
            if not provider_class.working:
                logger.error(f"Провайдер {provider_name} не работает")
                return jsonify({'error': f"Провайдер {provider_name} не работает"}), 400
            
            logger.info(f"Попытка {attempt+1} с провайдером {provider_name}")
            
            # Параметры запроса
            create_params = {
                'messages': messages,
                'provider': provider_class
            }
            
            # Добавляем модель только если она явно указана
            # или используем модель по умолчанию для провайдера
            if model_name:
                create_params['model'] = model_name
            else:
                # Для некоторых провайдеров указываем модели, которые точно работают
                provider_model_map = {
                    'FreeGpt': 'gemini-1.5-pro',
                    'Liaobots': 'claude-3-5-sonnet-20241022',
                    'You': 'gpt-4',
                    'Qwen_Qwen_2_5': None,  # Будет использована дефолтная модель
                    'OpenAIFM': None,  # Будет использована дефолтная модель 
                    'Blackbox': None,  # Будет использована дефолтная модель
                    'Gemini': 'gemini-1.5-pro'
                }
                
                if provider_name in provider_model_map:
                    model = provider_model_map[provider_name]
                    if model:
                        create_params['model'] = model
                        logger.info(f"Используем специальную модель {model} для провайдера {provider_name}")
            
            # Запрос к API
            logger.info(f"Создаем запрос с параметрами: {create_params}")
            response = g4f.ChatCompletion.create(**create_params)
            
            if response:
                logger.info(f"Получен ответ от {provider_name}: '{response[:30]}...'")
                
                # Кэшируем ответ
                message_text = messages[0]['content']
                cache_key = f"{model_name}:{message_text}"
                response_cache[cache_key] = response
                
                return jsonify({
                    'response': response,
                    'provider': provider_name,
                    'model': model_name
                })
            
        except Exception as e:
            logger.error(f"Ошибка при использовании провайдера {provider_name} (попытка {attempt+1}): {str(e)}")
            if attempt == max_retries - 1:
                # Если это последняя попытка, возвращаем ошибку
                return local_fallback(messages[0]['content'])
    
    # Если все попытки неуспешны
    return local_fallback(messages[0]['content'])

def try_multiple_providers(model_name, messages, max_retries=3):
    """Пробуем несколько провайдеров по очереди"""
    
    # Получаем список рабочих провайдеров
    all_providers = get_providers()
    working_providers = [p['name'] for p in all_providers if p['working'] and not p['needs_auth']]
    
    if not working_providers:
        logger.warning("Нет доступных рабочих провайдеров, используем локальную имитацию")
        return local_fallback(messages[0]['content'])
    
    # Перемешиваем список провайдеров для распределения нагрузки
    random.shuffle(working_providers)
    
    # Пробуем каждый провайдер
    for provider_name in working_providers:
        result = process_with_provider(provider_name, model_name, messages, max_retries=1)
        
        # Если получен успешный ответ, возвращаем его
        if result.status_code == 200:
            return result
    
    # Если ни один провайдер не сработал, используем локальную имитацию
    logger.warning("Все провайдеры не сработали, используем локальную имитацию")
    return local_fallback(messages[0]['content'])

def local_fallback(message):
    """Локальная имитация ответа, когда все провайдеры недоступны"""
    logger.info(f"Использование локальной имитации для сообщения: '{message[:30]}...'")
    
    # Заготовленные ответы для разных типов вопросов
    responses = {
        'greeting': [
            'Привет! Я AI ассистент. Чем я могу вам помочь сегодня?',
            'Здравствуйте! Рад вас видеть. Что вас интересует?',
            'Добрый день! Я готов ответить на ваши вопросы.'
        ],
        'weather': [
            'К сожалению, я не имею доступа к актуальным данным о погоде. Для получения информации о текущей погоде рекомендую использовать специализированные сервисы.',
            'Я не могу предоставить актуальные данные о погоде, так как не имею доступа к интернету в режиме реального времени.'
        ],
        'time': [
            f'По моим данным сейчас {time.strftime("%H:%M:%S %d.%m.%Y")}. Это время сервера, оно может отличаться от вашего местного времени.'
        ],
        'coding': [
            'Программирование - это процесс создания компьютерных программ с помощью языков программирования. Популярные языки включают JavaScript, Python, Java и многие другие.',
            'Для веб-разработки часто используют стек технологий, включающий HTML, CSS и JavaScript для фронтенда, и различные языки (Python, Node.js, PHP и др.) для бэкенда.'
        ],
        'default': [
            'Интересный вопрос. Я обрабатываю его локально и стараюсь дать наиболее подходящий ответ, но не имею доступа к актуальной информации из интернета.',
            'Я анализирую ваш запрос и стараюсь предоставить полезную информацию, основываясь на моих знаниях.',
            'Это интересная тема! Я могу поделиться общей информацией, но для получения специфических или актуальных данных лучше обратиться к профильным ресурсам.'
        ]
    }
    
    # Определяем категорию вопроса
    category = 'default'
    
    if not message:
        category = 'default'
    elif any(word in message.lower() for word in ['привет', 'здравствуй', 'добрый', 'хай']):
        category = 'greeting'
    elif any(word in message.lower() for word in ['погода', 'температура', 'осадки']):
        category = 'weather'
    elif any(word in message.lower() for word in ['время', 'дата', 'день', 'час']):
        category = 'time'
    elif any(word in message.lower() for word in ['код', 'программир', 'разраб', 'javascript', 'python']):
        category = 'coding'
    
    # Выбираем случайный ответ из соответствующей категории
    possible_responses = responses.get(category, responses['default'])
    response = random.choice(possible_responses)
    
    # Добавляем задержку для имитации "мышления"
    time.sleep(1.5)
    
    return jsonify({
        'response': response,
        'provider': 'local_fallback',
        'model': 'fallback'
    })

@app.route('/')
def home():
    """Домашняя страница API"""
    providers_count = len(get_providers())
    working_count = sum(1 for p in get_providers() if p['working'])
    models_count = len(get_models())
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>G4F Python API</title>
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
                display: flex;
                gap: 20px;
                margin: 20px 0;
            }
            .stat-item {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 5px;
                flex: 1;
                text-align: center;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                display: block;
                margin-bottom: 5px;
                color: #0066cc;
            }
        </style>
    </head>
    <body>
        <h1>G4F Python API</h1>
        <p>Сервис для бесплатного доступа к AI моделям через GPT4Free (G4F)</p>
        
        <div class="stats">
            <div class="stat-item">
                <span class="stat-value">{{ providers_count }}</span>
                Всего провайдеров
            </div>
            <div class="stat-item">
                <span class="stat-value">{{ working_count }}</span>
                Работающих провайдеров
            </div>
            <div class="stat-item">
                <span class="stat-value">{{ models_count }}</span>
                Доступных моделей
            </div>
        </div>
        
        <h2>Доступные эндпоинты</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/python/g4f/providers</strong>
            <p>Получение списка всех доступных провайдеров с их статусом</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/api/python/g4f/models</strong>
            <p>Получение списка всех доступных моделей</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <strong>/api/python/g4f/chat</strong>
            <p>Отправка сообщения и получение ответа от AI</p>
            <pre>
// Пример запроса
{
  "message": "Привет, как дела?",
  "model": "gpt_3_5_turbo",
  "provider": "FreeGpt"  // опционально
}

// Пример ответа
{
  "response": "Привет! У меня всё хорошо, я всегда готов помочь. Как я могу быть полезен сегодня?",
  "provider": "FreeGpt",
  "model": "gpt_3_5_turbo"
}
            </pre>
        </div>
        
    </body>
    </html>
    """
    
    return render_template_string(html, 
                                  providers_count=providers_count,
                                  working_count=working_count,
                                  models_count=models_count)

def start_server():
    """Запуск сервера Flask в отдельном потоке"""
    # Вывод информации о G4F
    logger.info("Запуск G4F Python API сервера")
    logger.info(f"Доступно {len(get_providers())} провайдеров")
    logger.info(f"Доступно {len(get_models())} моделей")
    
    # Запуск сервера
    app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)

if __name__ == "__main__":
    # Запуск в основном потоке
    start_server()