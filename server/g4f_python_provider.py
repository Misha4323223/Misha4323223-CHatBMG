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

# Справочник моделей для каждого провайдера
models_per_provider = {
    "Qwen_Qwen_2_5_Max": "qwen-max",
    "Qwen_Qwen_3": "qwen-plus",
    "You": "you-chat",
    "Phind": "phind-70b",
    "DeepInfra": "deepinfra-mistral",
    "GeminiPro": "gemini-pro",
    "Liaobots": "llama-3-70b"
}

# Организуем провайдеры в группы по надежности
provider_groups = {
    "primary": ["Qwen_Qwen_2_5_Max", "Qwen_Qwen_3", "You"],
    "secondary": ["DeepInfra", "GeminiPro", "Phind"],
    "fallback": ["Liaobots"]
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
            # Создаем сообщения с системным промптом
            messages = [
                {"role": "system", "content": "Вы AI-ассистент BOOOMERANGS. Отвечайте по-русски, если вопрос на русском. Давайте краткие и полезные ответы."},
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
    if specific_provider:
        result = try_provider(specific_provider, message, timeout=25, use_stream=use_stream)
        if "error" not in result or use_stream:
            return result
    
    # Стратегия с группами провайдеров
    def try_provider_group(group_name):
        # Перемешиваем провайдеры в группе для равномерной нагрузки
        providers = provider_groups.get(group_name, []).copy()
        random.shuffle(providers)
        
        print(f"🔄 Перебор группы провайдеров: {group_name}")
        
        for provider_name in providers:
            result = try_provider(provider_name, message, timeout=25, use_stream=use_stream)
            if "error" not in result:
                print(f"✅ Группа {group_name} успешно вернула ответ")
                return result
            elif use_stream and "response_stream" in result:
                return result
        
        return None
    
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

@app.route('/python/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        provider = data.get('provider')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
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
    
    # Используем порт 5002 вместо 5000, который занят Express сервером
    app.run(host='0.0.0.0', port=5002, debug=False)