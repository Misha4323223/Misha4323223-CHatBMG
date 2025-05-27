"""
BOOOMERANGS G4F Python Provider
Версия с улучшенной системой резервных провайдеров и автоматическим переключением
между разными моделями для повышения надежности
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import g4f
import time
import random
import json
import re
import traceback
import os

app = Flask(__name__)
CORS(app)

# Google cookies для Gemini
GOOGLE_SECURE_1PSID = "g.a000xAh5kQmBDvMW9rfoBIhFCn1mJQZd0gWxAkhq54JsWVNGhxZEgBoCElTESMNfVrw8yvrLMAACgYKAdUSARUSFQHGX2Mi2JC4RbjuchHhJfSbgEUEqBoVAUF8yKplgTkdDK5p7q6WNJaskCsj0076"
GOOGLE_SECURE_1PSIDTS = "sidts-CjIB5H03Pyxe416Ah3dAKBXEP1CQ3mvo2kz-pK25tCo_rddHrlWe9AwTtoajWHcgXkuW5BAA"
GOOGLE_SECURE_3PSID = "g.a000xAh5kQmBDvMW9rfoBIhFCn1mJQZd0gWxAkhq54JsWVNGhxZEgBoCElTESMNfVrw8yvrLMAACgYKAdUSARUSFQHGX2Mi2JC4RbjuchHhJfSbgEUEqBoVAUF8yKplgTkdDK5p7q6WNJaskCsj0076"
GOOGLE_SECURE_3PSIDTS = "sidts-CjIB5H03Pyxe416Ah3dAKBXEP1CQ3mvo2kz-pK25tCo_rddHrlWe9AwTtoajWHcgXkuW5BAA"
GOOGLE_HSID = "ABJ442iT_SQ2WitDg"
GOOGLE_SSID = "Ay7HZT8yW216dfO_o"
GOOGLE_APISID = "hYhU04JUR7_X1G4_/AjCPTUbWu4DfW4voM"
GOOGLE_SAPISID = "sxn8_1EmcYuzKl1I/AR51UEPLAlShAFxbK"

# Справочник моделей для каждого провайдера
models_per_provider = {
    # Qwen модели - наиболее стабильные и поддерживающие русский язык
    "Qwen_Qwen_2_5_Max": "qwen-max",      # Qwen 2.5 Максимальная версия - наилучшее качество
    "Qwen_Qwen_2_5": "qwen-plus",         # Qwen 2.5 Обычная версия - быстрее, но менее точная
    "Qwen_Qwen_3": "qwen-turbo",          # Qwen 3 - новейшая версия, быстрее
    "Qwen_Qwen_4": "qwen-chatmax",        # Qwen 4 Beta - для тестирования
    "AItianhu": "qwen-max",               # Провайдер AItianhu использует Qwen-Max
    "AItianhu_Turbo": "qwen-turbo",       # AItianhu с более быстрой моделью
    
    # DeepInfra модели - высококачественные открытые модели
    "DeepInfra": "mistral-7b-instruct",   # Mistral 7B - быстрая и качественная модель
    "DeepInfra_Mistral": "mixtral-8x7b-instruct", # Mixtral 8x7B - более мощная модель
    "DeepInfra_Llama": "llama-2-70b-chat",# Llama 2 70B - большая модель с обширными знаниями
    "DeepInfra_Qwen": "qwen-14b-chat",    # Qwen 14B через DeepInfra
    "DeepInfra_CodeLlama": "codellama-34b-instruct", # CodeLlama для программирования
    
    # Другие провайдеры и модели
    "You": "claude-3.5-sonnet",  # Обновлено: используем Claude 3.5 Sonnet через You.com
    "Phind": "phind-70b",        # Устарел: провайдер не работает
    "GeminiPro": "gemini-pro",

    "Gemini": "gemini-pro",
    "DEEPSEEK": "deepseek-chat"           # Специализированная модель DeepSeek для технических вопросов
}

# Организуем провайдеры в группы по надежности
provider_groups = {
    # Основные группы по надежности
    "primary": ["AItianhu", "Qwen_Qwen_2_5_Max", "DeepInfra", "DeepInfra_Mistral", "Qwen_Qwen_3", "Phind"],
    "secondary": ["AItianhu_Turbo", "Qwen_Qwen_2_5", "DeepInfra_Llama", "GeminiPro", "You", "Gemini"],
    "fallback": ["DeepInfra_Qwen", "You"],
    
    # Специализированные группы
    "technical": ["You", "DeepInfra_CodeLlama", "DEEPSEEK", "DeepInfra_Mistral", "Qwen_Qwen_2_5_Max"],  # Обновлено: You с Claude 3.5 Sonnet первый
    "deepspeek": ["You", "DeepInfra_CodeLlama", "AItianhu", "Qwen_Qwen_2_5_Max", "DEEPSEEK"]  # Обновлено: заменен Phind на You
}

def get_demo_response(message):
    """Получение демо-ответа по шаблону"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['привет', 'здравствуй', 'hello', 'hi']):
        return "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
    elif any(word in message_lower for word in ['как дела', 'как ты', 'how are you']):
        return "У меня всё отлично, спасибо что спросили! Как ваши дела?"
    elif any(word in message_lower for word in ['изображен', 'картин', 'image', 'picture']):
        return "Вы можете создать изображение, перейдя на вкладку 'Генератор изображений'. Просто опишите то, что хотите увидеть, и выберите стиль!"
    elif 'booomerangs' in message_lower:
        return "BOOOMERANGS - это бесплатный мультимодальный AI-сервис для общения и создания изображений. Мы обеспечиваем доступ к возможностям искусственного интеллекта без необходимости платных API ключей!"
    else:
        random_responses = [
            "Интересный вопрос! BOOOMERANGS использует различные AI-провайдеры, чтобы предоставлять ответы даже без платных API ключей. Наша система автоматически выбирает лучший доступный провайдер в каждый момент времени.",
            "Спасибо за ваш вопрос! BOOOMERANGS позволяет не только общаться с AI, но и генерировать изображения по текстовому описанию, а также конвертировать их в векторный формат SVG.",
            "BOOOMERANGS стремится сделать технологии искусственного интеллекта доступными для всех. Наше приложение работает прямо в браузере и оптимизировано для использования на мобильных устройствах."
        ]
        return random.choice(random_responses)

def try_provider(provider_name, message, timeout=15, use_stream=False, custom_model=None):
    """Попытка получить ответ от провайдера с обработкой ошибок и системой резервных моделей"""
    start_time = time.time()
    success = False
    response = None
    error_message = None
    
    # Получаем провайдер по имени
    if hasattr(g4f.Provider, provider_name):
        provider = getattr(g4f.Provider, provider_name)
        # Используем переданную модель или дефолтную для провайдера
        model = custom_model or models_per_provider.get(provider_name, "gpt-3.5-turbo")
        
        # Специальная настройка для Gemini с cookies
        auth_cookies = None
        if provider_name == "Gemini":
            auth_cookies = {
                "__Secure-1PSID": GOOGLE_SECURE_1PSID,
                "__Secure-1PSIDTS": GOOGLE_SECURE_1PSIDTS,
                "__Secure-3PSID": GOOGLE_SECURE_3PSID,
                "__Secure-3PSIDTS": GOOGLE_SECURE_3PSIDTS,
                "HSID": GOOGLE_HSID,
                "SSID": GOOGLE_SSID,
                "APISID": GOOGLE_APISID,
                "SAPISID": GOOGLE_SAPISID
            }
        
        # Отладочная информация только в консоль, не в ответ
        # print(f"Попытка использования провайдера {provider_name}...")
        # print(f"  📝 Пробуем модель: {model}, стриминг: {use_stream}")
        
        try:
            # Создаем сообщения с системным промптом
            messages = [
                {"role": "system", "content": "Вы AI-ассистент BOOOMERANGS. Отвечайте по-русски, если вопрос на русском. Давайте краткие и полезные ответы."},
                {"role": "user", "content": message}
            ]
            
            # Пробуем получить ответ с учетом cookies для Gemini
            if auth_cookies:
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    provider=provider,
                    stream=use_stream,
                    timeout=timeout,
                    cookies=auth_cookies
                )
            else:
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    provider=provider,
                    stream=use_stream,
                    timeout=timeout
                )
            
            # Обработка стриминга (возвращает итератор)
            if use_stream:
                # Для стриминга возвращаем итератор
                return {
                    "streaming": True,
                    "response_stream": response,
                    "provider": provider_name,
                    "model": model
                }
            else:
                # Для обычного ответа возвращаем текст
                # Проверяем, что ответ не является HTML-страницей (блокировка или сайт недоступен)
                if isinstance(response, str) and "<html" in response.lower():
                    raise Exception(f"Провайдер {provider_name} вернул HTML вместо текста — возможно, заблокирован")
                
                # Проверяем на другие типичные признаки ошибки
                if isinstance(response, str) and any(err in response.lower() for err in ["error", "exception", "blocked", "403", "forbidden"]):
                    if len(response) < 100:  # Короткие сообщения об ошибках
                        raise Exception(f"Провайдер {provider_name} вернул ошибку: {response}")
                
                # Логируем только в консоль, не в ответ
                # print(f"✅ {provider_name} (модель {model}) успешно ответил за {time.time() - start_time:.2f} сек")
                
                return {
                    "streaming": False,
                    "response": response,
                    "provider": provider_name,
                    "model": model,
                    "elapsed": time.time() - start_time
                }
                
        except Exception as e:
            error_message = str(e)
            print(f"❌ Ошибка при использовании провайдера {provider_name}: {error_message}")
            
            # Проверяем, не блокировка ли это
            if "html" in error_message.lower() or "403" in error_message or "forbidden" in error_message:
                error_message = f"Провайдер {provider_name} заблокирован или недоступен"
                
            return {
                "streaming": False,
                "error": error_message,
                "provider": provider_name,
                "model": model
            }
    else:
        error_message = f"Провайдер {provider_name} не найден"
        print(f"❌ {error_message}")
        
        return {
            "streaming": False,
            "error": error_message,
            "provider": "unknown"
        }

def get_chat_response(message, specific_provider=None, use_stream=False):
    """Получение ответа с улучшенной системой резервных провайдеров (fallback) и поддержкой стриминга"""
    if not message:
        return {
            "error": "Отсутствует сообщение",
            "response": "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!",
            "provider": "BOOOMERANGS-Demo",
            "model": "error-mode"
        }
    
    # Если указан конкретный провайдер, пробуем его
    if specific_provider:
        result = try_provider(specific_provider, message, timeout=25, use_stream=use_stream)
        if "error" not in result or use_stream:
            return result
    
    # Стратегия с группами провайдеров
    def try_provider_group(group_name):
        # Перемешиваем провайдеры в группе для равномерной нагрузки
        providers = provider_groups.get(group_name, []).copy()
        random.shuffle(providers)
        
        for provider_name in providers:
            result = try_provider(provider_name, message, timeout=25, use_stream=use_stream)
            if "error" not in result:
                return result
            elif use_stream and "response_stream" in result:
                return result
        
        return None
    
    # Определяем, является ли вопрос техническим
    is_tech_question = any(keyword in message.lower() for keyword in [
        "код", "программирование", "javascript", "python", "java", "c++", "c#", 
        "coding", "programming", "code", "алгоритм", "algorithm", "функция", "function",
        "api", "сервер", "server", "backend", "frontend", "фронтенд", "бэкенд",
        "database", "база данных", "sql", "nosql", "mongodb", "json", "html", "css",
        "git", "github", "docker", "kubernetes", "devops"
    ])
    
    # Для технических вопросов сначала пробуем группу technical
    if is_tech_question and not specific_provider:
        print(f"🔍 Обнаружен технический вопрос, пробуем Phind...")
        result = try_provider_group("technical")
        if result:
            return result
    
    # Перебираем группы провайдеров по порядку надежности
    for group in ["primary", "secondary", "fallback"]:
        result = try_provider_group(group)
        if result:
            return result
    
    # Если ни один провайдер не сработал, возвращаем демо-ответ
    print("❌ Все провайдеры недоступны, возвращаем демо-ответ")
    return {
        "error": "Все провайдеры недоступны",
        "response": get_demo_response(message),
        "provider": "BOOOMERANGS-Demo",
        "model": "fallback-mode"
    }

def is_coding_question(message):
    """Определяет, является ли вопрос связанным с программированием"""
    coding_keywords = [
        'код', 'программирование', 'javascript', 'python', 'java', 'c++', 'c#',
        'coding', 'programming', 'code', 'алгоритм', 'algorithm', 'функция', 'function',
        'api', 'сервер', 'server', 'backend', 'frontend', 'фронтенд', 'бэкенд',
        'database', 'база данных', 'sql', 'nosql', 'mongodb', 'json', 'html', 'css',
        'git', 'github', 'docker', 'react', 'node', 'npm', 'typescript', 'как написать',
        'как создать', 'разработка', 'development', 'библиотека', 'library', 'framework'
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in coding_keywords)

@app.route('/python/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        provider = data.get('provider')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
        # Проверяем, если это вопрос о программировании и не указан конкретный провайдер
        if not provider and is_coding_question(message):
            print(f"🔧 Определен вопрос о программировании: {message[:50]}...")
            # Используем Phind в первую очередь для технических вопросов
            result = try_provider("Phind", message, timeout=15)
            if "error" not in result:
                print(f"✅ Phind успешно ответил на технический вопрос")
                return jsonify(result)
            else:
                print(f"⚠️ Phind недоступен, переключаемся на техническую группу")
                # Если Phind недоступен, используем техническую группу
                provider = "technical_group"
        
        # Обработка запросов DeepSpeek
        if provider == 'deepspeek':
            print(f"Получен запрос для DeepSpeek: {message[:50]}...")
            # Используем группу deepspeek с Phind для технических вопросов
            try:
                # Используем провайдеры из группы deepspeek
                for provider_name in provider_groups.get('deepspeek', ['Phind']):
                    try:
                        result = try_provider(provider_name, message, timeout)
                        if result.get('success'):
                            # Подменяем имя провайдера и модели для отображения как DeepSpeek
                            result['provider'] = 'DeepSpeek'
                            result['model'] = 'DeepSpeek AI'
                            return jsonify(result)
                    except Exception as provider_error:
                        print(f"Ошибка провайдера DeepSpeek ({provider_name}): {str(provider_error)}")
                        continue
                
                # Если все провайдеры из deepspeek группы не сработали, используем Phind напрямую
                result = try_provider('Phind', message, timeout)
                if result.get('success'):
                    result['provider'] = 'DeepSpeek'
                    result['model'] = 'DeepSpeek AI (Phind)'
                    return jsonify(result)
            except Exception as e:
                print(f"Все провайдеры DeepSpeek вернули ошибку: {str(e)}")
                # Возвращаем демо-ответ с брендингом DeepSpeek
                return jsonify({
                    "success": True,
                    "response": "Извините, возникла проблема подключения к DeepSpeek. Технические вопросы временно обрабатываются локально. Попробуйте еще раз или выберите другого провайдера.",
                    "provider": "DeepSpeek",
                    "model": "DeepSpeek AI (Offline)",
                    "elapsed": 0.5
                })
        
        # Стандартная обработка для других провайдеров
        result = get_chat_response(message, specific_provider=provider)
        return jsonify(result)
    except Exception as e:
        print(f"Ошибка при обработке запроса: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "response": get_demo_response(message if 'message' in locals() else ""),
            "provider": "BOOOMERANGS-Error",
            "model": "error-mode"
        })

@app.route('/python/direct', methods=['POST'])
def direct_provider():
    """Прямой вызов конкретного провайдера без автоматического переключения"""
    try:
        data = request.json
        message = data.get('message', '')
        provider_name = data.get('provider')
        system_prompt = data.get('systemPrompt', 'Вы полезный AI-ассистент. Отвечайте кратко и точно.')
        timeout = data.get('timeout', 30000) / 1000  # Увеличенный таймаут для медленных провайдеров
        
        if not message or not provider_name:
            return jsonify({
                "error": "Необходимо указать сообщение и провайдера",
                "response": "Ошибка: не указаны обязательные параметры",
                "provider": "error",
                "model": "error"
            })
        
        print(f"🎯 Прямой вызов провайдера {provider_name} без fallback")
        
        # Получаем провайдер напрямую из g4f
        if hasattr(g4f.Provider, provider_name):
            provider = getattr(g4f.Provider, provider_name)
            # Используем переданную модель или дефолтную для провайдера
            requested_model = data.get('model')
            model = requested_model or models_per_provider.get(provider_name, "gpt-3.5-turbo")
            
            print(f"📝 Используем модель {model} для провайдера {provider_name}")
            
            # Формируем сообщения
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            
            # Отправляем запрос напрямую провайдеру
            try:
                start_time = time.time()
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    provider=provider,
                    timeout=timeout
                )
                elapsed = time.time() - start_time
                
                # Проверяем валидность ответа
                if isinstance(response, str) and "<html" in response.lower():
                    raise Exception(f"Провайдер {provider_name} вернул HTML вместо текста")
                
                print(f"✅ Провайдер {provider_name} успешно ответил за {elapsed:.2f} сек")
                
                return jsonify({
                    "success": True,
                    "response": response,
                    "provider": provider_name,
                    "model": model,
                    "elapsed": elapsed
                })
            except Exception as e:
                error_message = str(e)
                print(f"❌ Ошибка провайдера {provider_name}: {error_message}")
                
                return jsonify({
                    "error": f"Ошибка провайдера {provider_name}: {error_message}",
                    "response": f"Ошибка провайдера {provider_name}: {error_message}",
                    "provider": provider_name,
                    "model": model
                })
        else:
            return jsonify({
                "error": f"Провайдер {provider_name} не найден",
                "response": f"Провайдер {provider_name} не найден в системе",
                "provider": "unknown"
            })
    except Exception as e:
        print(f"❌ Общая ошибка при прямом вызове провайдера: {str(e)}")
        traceback.print_exc()
        
        return jsonify({
            "error": str(e),
            "response": f"Ошибка при вызове провайдера: {str(e)}",
            "provider": "error"
        })

@app.route('/python/test', methods=['POST'])
def test():
    try:
        data = request.json
        message = data.get('message', 'test')
        
        # Для теста берем самый надежный провайдер
        result = get_chat_response(message, specific_provider="Qwen_Max")
        return jsonify(result)
    except Exception as e:
        print(f"Ошибка при тестировании: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": "Тест провалился: " + str(e),
            "provider": "BOOOMERANGS-Test",
            "model": "test-mode"
        })

@app.route('/python/chat/stream', methods=['POST'])
def chat_stream():
    """API для потоковой генерации ответов"""
    if request.method != 'POST':
        return Response('Метод не поддерживается', status=405)
    
    try:
        data = request.json
        message = data.get('message', '')
        provider = data.get('provider')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
        if not message:
            return jsonify({"error": "Отсутствует сообщение"}), 400
        
        # Функция генератор для стриминга
        def generate():
            start_time = time.time()
            
            try:
                # Пробуем получить стриминговый ответ
                result = get_chat_response(message, specific_provider=provider, use_stream=True)
                
                # Начинаем стриминг
                yield f"data: {json.dumps({'status': 'start', 'provider': result.get('provider')})}\n\n"
                
                if result.get('streaming') and 'response_stream' in result:
                    # Обработка потокового ответа
                    full_response = ''
                    
                    for chunk in result['response_stream']:
                        # Проверяем, не HTML ли это
                        if "<html" in chunk.lower():
                            yield f"data: {json.dumps({'error': 'Провайдер вернул HTML вместо текста — возможно, заблокирован'})}\n\n"
                            break
                            
                        # Отправляем чанк
                        yield f"data: {json.dumps({'chunk': chunk, 'provider': result.get('provider')})}\n\n"
                        full_response += chunk
                    
                    # Завершаем стриминг
                    elapsed = time.time() - start_time
                    completion_data = {
                        'status': 'done', 
                        'full_text': full_response,
                        'provider': result.get('provider'),
                        'model': result.get('model'),
                        'elapsed': elapsed
                    }
                    yield f"data: {json.dumps(completion_data)}\n\n"
                else:
                    # Если стриминг не сработал, возвращаем обычный ответ
                    if "error" in result:
                        # Если есть ошибка, возвращаем демо-ответ
                        demo_response = get_demo_response(message)
                        error_data = {
                            'error': result.get('error'),
                            'text': demo_response,
                            'provider': 'BOOOMERANGS-Demo'
                        }
                        yield f"data: {json.dumps(error_data)}\n\n"
                        
                        # Имитируем завершение
                        completion_data = {
                            'status': 'done',
                            'full_text': demo_response,
                            'provider': 'BOOOMERANGS-Demo',
                            'model': 'fallback-mode',
                            'elapsed': time.time() - start_time
                        }
                        yield f"data: {json.dumps(completion_data)}\n\n"
                    else:
                        # Если есть обычный ответ, отправляем его целиком
                        text_data = {
                            'text': result.get('response'),
                            'provider': result.get('provider')
                        }
                        yield f"data: {json.dumps(text_data)}\n\n"
                        
                        # Имитируем завершение
                        completion_data = {
                            'status': 'done',
                            'full_text': result.get('response'),
                            'provider': result.get('provider'),
                            'model': result.get('model'),
                            'elapsed': result.get('elapsed', time.time() - start_time)
                        }
                        yield f"data: {json.dumps(completion_data)}\n\n"
            
            except Exception as e:
                print(f"Ошибка стриминга: {str(e)}")
                traceback.print_exc()
                
                # Отправляем информацию об ошибке
                error_data = {'error': str(e)}
                yield f"data: {json.dumps(error_data)}\n\n"
                
                # Отправляем демо-ответ
                demo_response = get_demo_response(message)
                text_data = {'text': demo_response, 'provider': 'BOOOMERANGS-Error'}
                yield f"data: {json.dumps(text_data)}\n\n"
                
                # Имитируем завершение
                completion_data = {
                    'status': 'done',
                    'full_text': demo_response,
                    'provider': 'BOOOMERANGS-Error',
                    'model': 'error-mode',
                    'elapsed': time.time() - start_time
                }
                yield f"data: {json.dumps(completion_data)}\n\n"
        
        # Возвращаем потоковый ответ
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        print(f"Ошибка при обработке запроса стриминга: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return "BOOOMERANGS Python G4F API работает!"

if __name__ == '__main__':
    # Вывод списка доступных провайдеров
    available_providers = [name for name in dir(g4f.Provider) if not name.startswith('_') and name[0].isupper()]
    print(f"🤖 Загружено {len(available_providers)} провайдеров: {', '.join(available_providers)}")
    
    # Используем порт 5004, так как 5002 и 5003 могут быть заняты
    app.run(host='0.0.0.0', port=5004, debug=False)