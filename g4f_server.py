#!/usr/bin/env python3
# Сервер G4F на Python для обеспечения бесплатного доступа к моделям AI
from flask import Flask, request, jsonify
import g4f
import time
import random
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('g4f-server')

app = Flask(__name__)

# Словарь для кеширования ответов AI, чтобы снизить нагрузку на серверы
response_cache = {}

def get_available_providers():
    """Получение списка доступных провайдеров G4F"""
    providers = []
    
    # Проверка провайдеров ChatCompletion
    for provider in g4f.Provider.__all__:
        try:
            provider_class = getattr(g4f.Provider, provider)
            working = provider_class.working
            
            # Собираем информацию о провайдере
            provider_info = {
                "name": provider,
                "working": working,
                "supports_stream": hasattr(provider_class, "supports_stream") and provider_class.supports_stream,
                "supports_gpt4": hasattr(provider_class, "supports_gpt_4") and provider_class.supports_gpt_4,
                "default_model": getattr(provider_class, "default_model", None),
                "needs_auth": hasattr(provider_class, "needs_auth") and provider_class.needs_auth,
                "url": getattr(provider_class, "url", None),
            }
            
            providers.append(provider_info)
        except Exception as e:
            logger.error(f"Ошибка при проверке провайдера {provider}: {str(e)}")
    
    # Сортируем провайдеры: сначала рабочие без авторизации, потом все остальные
    providers.sort(key=lambda p: (not p["working"], p["needs_auth"]))
    
    return providers

@app.route('/api/g4f/providers', methods=['GET'])
def list_providers():
    """API для получения списка доступных провайдеров"""
    providers = get_available_providers()
    
    # Подсчитываем статистику
    working_count = sum(1 for p in providers if p["working"])
    free_count = sum(1 for p in providers if p["working"] and not p["needs_auth"])
    gpt4_count = sum(1 for p in providers if p["working"] and p["supports_gpt4"])
    
    return jsonify({
        "providers": providers,
        "statistics": {
            "total": len(providers),
            "working": working_count,
            "free": free_count,
            "supportGPT4": gpt4_count
        }
    })

@app.route('/api/g4f/chat', methods=['POST'])
def chat_completion():
    """API для получения ответов от моделей G4F"""
    try:
        data = request.json
        
        # Проверяем наличие необходимых параметров
        if not data or 'message' not in data:
            return jsonify({"error": "Необходимо указать сообщение"}), 400
        
        message = data.get('message', '')
        model = data.get('model', 'gpt-3.5-turbo')
        max_retries = data.get('max_retries', 3)
        
        # Для кэширования ответов
        cache_key = f"{model}:{message}"
        
        # Проверяем, если ответ уже есть в кэше
        if cache_key in response_cache:
            logger.info(f"Используем кэшированный ответ для: {message[:30]}...")
            return jsonify({"response": response_cache[cache_key], "cached": True})
        
        logger.info(f"Запрос к G4F: модель={model}, сообщение={message[:30]}...")
        
        # Попытка получить ответ с несколькими провайдерами
        response_text = None
        error_messages = []
        
        # Получаем доступные провайдеры
        providers = get_available_providers()
        working_providers = [p["name"] for p in providers if p["working"] and not p["needs_auth"]]
        
        # Если нет доступных провайдеров, используем все рабочие
        if not working_providers:
            working_providers = [p["name"] for p in providers if p["working"]]
        
        # Если совсем нет рабочих провайдеров, используем имитацию
        if not working_providers:
            logger.warning("Нет доступных провайдеров, используем локальную имитацию")
            return local_fallback(message)
        
        # Пробуем разные провайдеры
        random.shuffle(working_providers)  # Случайный порядок для распределения нагрузки
        
        for retry in range(max_retries):
            for provider_name in working_providers:
                try:
                    # Выбираем провайдер
                    provider_class = getattr(g4f.Provider, provider_name)
                    
                    logger.info(f"Попытка {retry+1} с провайдером {provider_name}")
                    
                    # Создаем сообщения
                    messages = [{"role": "user", "content": message}]
                    
                    # Получаем ответ
                    response = g4f.ChatCompletion.create(
                        model=model,
                        messages=messages,
                        provider=provider_class,
                    )
                    
                    if response:
                        response_text = response
                        
                        # Кэшируем ответ
                        response_cache[cache_key] = response_text
                        
                        logger.info(f"Успешный ответ от провайдера {provider_name}: {response_text[:30]}...")
                        return jsonify({"response": response_text, "provider": provider_name})
                    
                except Exception as e:
                    error_message = f"Ошибка провайдера {provider_name}: {str(e)}"
                    logger.error(error_message)
                    error_messages.append(error_message)
        
        # Если ни один из провайдеров не сработал, возвращаем локальную имитацию
        logger.warning(f"Все провайдеры G4F не сработали после {max_retries} попыток. Ошибки: {error_messages}")
        return local_fallback(message)
        
    except Exception as e:
        logger.exception(f"Общая ошибка API: {str(e)}")
        return jsonify({"error": str(e)}), 500

def local_fallback(message):
    """Локальная имитация ответов AI, если все провайдеры недоступны"""
    logger.info("Используем локальную имитацию для ответа")
    
    # Определяем типы вопросов
    response = ""
    
    # Приветствие
    if any(greeting in message.lower() for greeting in ["привет", "здравствуй", "добрый день", "хай", "hello", "hi"]):
        responses = [
            "Привет! Чем я могу помочь сегодня?",
            "Здравствуйте! Рад вас видеть. Что вас интересует?",
            "Добрый день! Я готов ответить на ваши вопросы."
        ]
        response = random.choice(responses)
    
    # Вопрос о способностях
    elif any(query in message.lower() for query in ["что ты умеешь", "что ты можешь", "расскажи о себе", "кто ты"]):
        response = "Я искусственный интеллект, который может отвечать на вопросы, предоставлять информацию, помогать с различными задачами, такими как написание текстов, объяснение сложных тем, анализ данных и многое другое. Обратите внимание, что я не имею доступа к интернету, поэтому моя информация может быть не самой актуальной."
    
    # Погода
    elif any(weather in message.lower() for weather in ["погода", "температура", "осадки"]):
        response = "К сожалению, я не имею доступа к актуальным данным о погоде. Чтобы узнать текущую погоду, вам лучше обратиться к специализированным сервисам, таким как Яндекс.Погода, Gismeteo или AccuWeather."
    
    # Время
    elif any(time_query in message.lower() for time_query in ["время", "дата", "день недели", "который час"]):
        current_time = time.strftime("%H:%M:%S")
        current_date = time.strftime("%d.%m.%Y")
        response = f"По моим данным сейчас {current_time}, дата: {current_date}. Это время моего сервера, оно может отличаться от вашего местного времени."
    
    # Программирование
    elif any(code in message.lower() for code in ["код", "программирован", "разработк", "javascript", "python", "сайт"]):
        response = "Программирование - это процесс создания компьютерных программ с помощью языков программирования. Популярные языки включают JavaScript, Python, Java, C++, и многие другие. Для веб-разработки часто используют HTML, CSS и JavaScript. Если у вас есть конкретный вопрос по программированию, я постараюсь на него ответить."
    
    # Математика
    elif any(math in message.lower() for math in ["считать", "вычислить", "сколько будет", "математик"]) or any(op in message for op in ["+", "-", "*", "/"]):
        response = "Я могу помочь с решением математических задач, но без доступа к базовым математическим функциям, я не могу произвести точные вычисления. Для сложных вычислений рекомендую использовать калькулятор или специализированные математические инструменты."
    
    # Общий ответ
    else:
        responses = [
            "Интересный вопрос. Я обрабатываю его локально и стараюсь дать наиболее подходящий ответ, но не имею доступа к актуальной информации из интернета.",
            "Я анализирую ваш запрос и стараюсь предоставить полезную информацию, основываясь на моих знаниях. Однако, для получения самых актуальных данных, рекомендую обратиться к специализированным источникам.",
            "Это интересная тема! Я могу поделиться общей информацией, но для получения специфических или актуальных данных лучше обратиться к профильным ресурсам."
        ]
        response = random.choice(responses)
    
    # Имитация задержки для реалистичности
    time.sleep(1.5)
    
    return jsonify({"response": response, "provider": "local_fallback"})

@app.route('/')
def index():
    """Информация о сервере"""
    return jsonify({
        "name": "G4F Python API Server",
        "version": g4f.version,
        "endpoints": {
            "/api/g4f/providers": "GET - Список доступных провайдеров",
            "/api/g4f/chat": "POST - Получение ответа от AI модели"
        },
        "status": "running"
    })

if __name__ == '__main__':
    # Вывод информации о провайдерах при запуске
    providers = get_available_providers()
    working_providers = [p["name"] for p in providers if p["working"]]
    
    logger.info(f"Запуск G4F сервера. Версия G4F: {g4f.version}")
    logger.info(f"Всего провайдеров: {len(providers)}, рабочих: {len(working_providers)}")
    logger.info(f"Доступные провайдеры: {', '.join(working_providers)}")
    
    # Запуск сервера на всех интерфейсах (0.0.0.0)
    app.run(host='0.0.0.0', port=5001, debug=True)