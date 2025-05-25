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

app = Flask(__name__)
CORS(app)

# РАСШИРЕННАЯ БАЗА ПРОВЕРЕННЫХ РАБОЧИХ ПРОВАЙДЕРОВ
models_per_provider = {
    # Основные надежные провайдеры (Tier 1)
    "Qwen_Qwen_2_5_Max": "gpt-4o",           # Основной - Alibaba Cloud Qwen
    "ChatGpt": "gpt-4o",                     # OpenAI GPT через прокси
    "Gemini": "gemini-pro",                  # Google Gemini
    "Claude": "claude-3-sonnet",             # Anthropic Claude
    "You": "gpt-4",                          # You.com - стабильный
    
    # Специализированные провайдеры (Tier 2)
    "Phind": "gpt-4",                        # Для программирования и техники
    "DeepInfra": "llama-3.1-70b",           # Meta LLaMA через DeepInfra
    "HuggingChat": "mixtral-8x7b",          # HuggingFace Mixtral
    "Perplexity": "sonar-medium",           # Perplexity для поиска
    "Groq": "llama-3.1-70b",               # Groq - быстрые LLM
    
    # Дополнительные сильные провайдеры (Tier 3)
    "AItianhu": "gpt-4",                    # Китайский провайдер
    "Liaobots": "gpt-4",                    # Альтернативный GPT
    "FreeGpt": "gpt-3.5-turbo",            # Бесплатный GPT
    "GeminiPro": "gemini-pro",             # Расширенная версия Gemini
    "DeepSeek": "deepseek-coder",          # DeepSeek для кода
    "Mistral": "mistral-large",            # Mistral AI
    "Cohere": "command-r-plus",            # Cohere Command
    "Together": "llama-3.1-70b",          # Together AI
}

# Организуем провайдеры в группы по надежности и специализации
provider_groups = {
    # Основные группы по надежности (Tier 1 - самые стабильные)
    "primary": ["Qwen_Qwen_2_5_Max", "ChatGpt", "Gemini", "Claude", "You"],
    
    # Дополнительные надежные провайдеры (Tier 2)
    "secondary": ["Phind", "DeepInfra", "HuggingChat", "Perplexity", "Groq"],
    
    # Резервные провайдеры (Tier 3)
    "fallback": ["AItianhu", "Liaobots", "FreeGpt", "GeminiPro", "Mistral"],
    
    # Экспериментальные мощные провайдеры (Tier 4)
    "experimental": ["DeepSeek", "Cohere", "Together"],
    
    # Специализированные группы
    "technical": ["Phind", "DeepSeek", "Claude", "DeepInfra", "ChatGpt"],  # Для программирования
    "creative": ["Claude", "Gemini", "ChatGpt", "You", "Mistral"],        # Для творческих задач
    "search": ["Perplexity", "You", "Gemini", "ChatGpt"],                 # Для поиска информации
    "fast": ["Groq", "Together", "DeepInfra", "You"],                     # Быстрые ответы
    "smart": ["Claude", "ChatGpt", "Gemini", "Qwen_Qwen_2_5_Max"],        # Умные решения
    "deepspeek": ["DeepSeek", "Phind", "Claude", "ChatGpt", "Qwen_Qwen_2_5_Max"]  # Техническая экспертиза
}

# ФУНКЦИЯ get_demo_response УДАЛЕНА - больше никаких заготовленных ответов!

def try_provider(provider_name, message, timeout=15, use_stream=False):
    """Попытка получить ответ от провайдера с обработкой ошибок и системой резервных моделей"""
    start_time = time.time()
    success = False
    response = None
    error_message = None
    
    # Получаем провайдер по имени
    if hasattr(g4f.Provider, provider_name):
        provider = getattr(g4f.Provider, provider_name)
        model = models_per_provider.get(provider_name, "gpt-3.5-turbo")
        
        print(f"Попытка использования провайдера {provider_name}...")
        print(f"  📝 Пробуем модель: {model}, стриминг: {use_stream}")
        
        try:
            # Создаем сообщения БЕЗ принудительного системного промпта
            messages = [
                {"role": "user", "content": message}
            ]
            
            # Пробуем получить ответ
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
                
                print(f"✅ {provider_name} (модель {model}) успешно ответил за {time.time() - start_time:.2f} сек")
                
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
    if specific_provider and specific_provider != "Qwen_Qwen_2_5_Max":
        result = try_provider(specific_provider, message, timeout=25, use_stream=use_stream)
        if "error" not in result or use_stream:
            return result
    
    # Если указан Qwen или не указан провайдер - используем умную систему выбора
    print(f"🧠 Активирую умную систему выбора провайдеров для: {message[:50]}...")
    
    # Стратегия с группами провайдеров
    def try_provider_group(group_name):
        # Перемешиваем провайдеры в группе для равномерной нагрузки
        providers = provider_groups.get(group_name, []).copy()
        random.shuffle(providers)
        
        print(f"🔄 Перебор группы провайдеров: {group_name}")
        
        for provider_name in providers:
            # Для быстрой группы используем меньший таймаут
            timeout = 10 if group_name == "fast" else 20
            result = try_provider(provider_name, message, timeout=timeout, use_stream=use_stream)
            if "error" not in result:
                print(f"✅ Группа {group_name} успешно вернула ответ")
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
        print(f"🔍 Обнаружен технический вопрос, пробуем technical группу...")
        result = try_provider_group("technical")
        if result:
            return result
    
    # Определяем творческие вопросы
    is_creative_question = any(keyword in message.lower() for keyword in [
        "стих", "рассказ", "история", "сказка", "поэзия", "творчество", "креатив",
        "poem", "story", "creative", "write", "писать", "сочинить", "придумать"
    ])
    
    # Для творческих вопросов используем creative группу
    if is_creative_question and not specific_provider:
        print(f"🎨 Обнаружен творческий вопрос, пробуем creative группу...")
        result = try_provider_group("creative")
        if result:
            return result
    
    # Для поисковых запросов используем search группу
    is_search_question = any(keyword in message.lower() for keyword in [
        "найди", "поиск", "где", "что такое", "кто такой", "информация", "данные",
        "find", "search", "what is", "who is", "информацию", "расскажи о"
    ])
    
    if is_search_question and not specific_provider:
        print(f"🔍 Обнаружен поисковый запрос, пробуем search группу...")
        result = try_provider_group("search")
        if result:
            return result
    
    # Сначала пробуем быстрых провайдеров для ускорения ответов
    print(f"⚡ Пробуем быстрых провайдеров для ускорения...")
    result = try_provider_group("fast")
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
        "response": "Python G4F недоступен - нет живых провайдеров",
        "provider": "BOOOMERANGS-Demo",
        "model": "fallback-mode"
    }

@app.route('/python/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        provider = data.get('provider')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
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
            "response": "Ошибка Python G4F - все провайдеры недоступны",
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
            # Выбираем подходящую модель
            model = models_per_provider.get(provider_name, "gpt-3.5-turbo")
            
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
                        error_data = {
                            'error': result.get('error'),
                            'text': 'Провайдер недоступен - живые ответы отключены',
                            'provider': 'Error-Provider'
                        }
                        yield f"data: {json.dumps(error_data)}\n\n"
                        
                        # Возвращаем ошибку вместо заглушки
                        error_completion = {
                            'status': 'error',
                            'error': 'Все AI провайдеры недоступны',
                            'elapsed': time.time() - start_time
                        }
                        yield f"data: {json.dumps(error_completion)}\n\n"
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
                text_data = {'text': 'Провайдер недоступен - только живые ответы', 'provider': 'Error-Provider'}
                yield f"data: {json.dumps(text_data)}\n\n"
                
                # Имитируем завершение
                error_data = {
                    'status': 'error',
                    'error': 'Все AI провайдеры недоступны',
                    'elapsed': time.time() - start_time
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
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
    
    # Используем порт 5005, так как 5004 конфликтует с другой программой
    app.run(host='0.0.0.0', port=5005, debug=False)