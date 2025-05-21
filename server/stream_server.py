"""
Стриминговый сервер для BOOOMERANGS
Обеспечивает потоковую передачу ответов от моделей G4F
"""
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import g4f
import json
import time
import random
import traceback

# Основные провайдеры с поддержкой потоковой передачи
# Используем более гибкий подход с getattr вместо прямого доступа
# для избежания ошибок AttributeError
def get_provider(name):
    try:
        return getattr(g4f.Provider, name)
    except AttributeError:
        print(f"Провайдер {name} не найден в g4f")
        return None

providers = {}
for name in ["Qwen_Qwen_2_5_Max", "Qwen_Qwen_3", "You", "DeepInfra", "Gemini", "GeminiPro", "Phind", "Liaobots", "Anthropic"]:
    provider = get_provider(name)
    if provider:
        providers[name] = provider
        print(f"Успешно загружен провайдер: {name}")
    else:
        print(f"Не удалось загрузить провайдер: {name}")

# Проверяем доступность Claude через Anthropic
anthropic_available = "Anthropic" in providers
if anthropic_available:
    print("✅ Провайдер Anthropic (Claude) доступен для использования!")
else:
    print("❌ Провайдер Anthropic (Claude) недоступен или требует API ключ")

# Организуем провайдеры в группы по надежности
provider_groups = {
    'primary': ['Qwen_Qwen_2_5_Max', 'Qwen_Qwen_3', 'You'],
    'secondary': ['DeepInfra', 'Gemini', 'GeminiPro', 'Phind'],
    'fallback': ['You', 'DeepInfra']
}

# Добавляем Claude в группы, если доступен
if anthropic_available:
    provider_groups['primary'].insert(0, 'Anthropic')  # Добавляем в начало списка primary

app = Flask(__name__)
CORS(app)

def get_demo_response(message):
    """Генерирует демо-ответ для случаев, когда API недоступен"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['привет', 'здравствуй', 'hello', 'hi']):
        return "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
    elif any(word in message_lower for word in ['как дела', 'как ты', 'how are you']):
        return "У меня всё отлично, спасибо что спросили! Как ваши дела?"
    elif any(word in message_lower for word in ['изображен', 'картин', 'image', 'picture']):
        return "Вы можете создать изображение, перейдя на вкладку \"Генератор изображений\". Просто опишите, что хотите увидеть!"
    elif 'бот' in message_lower:
        return "Да, я бот-ассистент BOOOMERANGS. Я использую различные AI модели для ответов на ваши вопросы без необходимости платных API ключей."
    elif any(word in message_lower for word in ['booomerangs', 'буумеранг']):
        return "BOOOMERANGS - это бесплатный мультимодальный AI-сервис для общения и создания изображений без необходимости платных API ключей."
    
    # Если не нашли ключевых слов, используем случайный ответ    
    random_responses = [
        "BOOOMERANGS использует различные AI-провайдеры, чтобы предоставлять ответы даже без платных API ключей. Наша система автоматически выбирает лучший доступный провайдер в каждый момент времени.",
        "BOOOMERANGS позволяет не только общаться с AI, но и генерировать изображения по текстовому описанию, а также конвертировать их в векторный формат SVG.",
        "BOOOMERANGS стремится сделать технологии искусственного интеллекта доступными для всех. Наше приложение работает прямо в браузере и оптимизировано для использования на мобильных устройствах."
    ]
        
    return random.choice(random_responses)

@app.route('/stream', methods=['POST'])
def stream_chat():
    """Потоковый вывод ответов от G4F моделей с поддержкой стриминга"""
    if request.method != 'POST':
        return Response('Метод не поддерживается', status=405)
    
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_name = data.get('provider', 'Qwen_Qwen_2_5_Max')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
        if not message:
            return Response('Не указано сообщение', status=400)
        
        print(f"Получен запрос стриминга: '{message}' от провайдера {provider_name}")
        
        # Подготавливаем диалог с системным промптом
        messages = [
            {"role": "system", "content": "Вы AI-ассистент BOOOMERANGS. Отвечайте по-русски, если вопрос на русском. Давайте краткие и полезные ответы."},
            {"role": "user", "content": message}
        ]
        
        def stream_generator():
            """Генератор для стриминга ответов"""
            # Используем локальные переменные внутри генератора
            current_provider = provider_name
            start_time = time.time()
            yielded_anything = False
            
            # Отправляем событие начала стриминга
            print(f"Начинаем стриминг от провайдера {current_provider}")
            yield f"event: start\ndata: {json.dumps({'provider': current_provider})}\n\n"
            
            try:
                # Исправляем имя провайдера, если нужно
                if current_provider == "Qwen_Max":
                    current_provider = "Qwen_Qwen_2_5_Max"
                
                # Попробуем сначала использовать запрошенный провайдер
                if current_provider in providers:
                    try:
                        provider = providers[current_provider]
                        print(f"Пробуем использовать провайдера {current_provider}")
                        
                        # Пробуем получить ответ от провайдера
                        try:
                            response_stream = g4f.ChatCompletion.create(
                                model="gpt-3.5-turbo",
                                messages=messages,
                                provider=provider,
                                stream=True,
                                timeout=timeout
                            )
                            
                            print(f"Получен поток от провайдера {current_provider}")
                            response_text = ''
                            chunk_count = 0
                            
                            # Пробуем получить первый чанк с таймаутом
                            got_first_chunk = False
                            
                            for chunk in response_stream:
                                chunk_count += 1
                                if isinstance(chunk, str):
                                    response_text += chunk
                                    print(f"Чанк {chunk_count} от {current_provider}: {chunk[:30]}...")
                                    yield f"event: chunk\ndata: {json.dumps({'text': chunk, 'provider': current_provider})}\n\n"
                                    yielded_anything = True
                                    got_first_chunk = True
                                    
                            # Если получили хотя бы один чанк, отправляем завершающее событие
                            if got_first_chunk:
                                elapsed = time.time() - start_time
                                print(f"Стриминг от {current_provider} завершен успешно")
                                yield f"event: complete\ndata: {json.dumps({'text': response_text, 'provider': current_provider, 'elapsed': elapsed})}\n\n"
                                return
                                
                        except Exception as e:
                            print(f"Ошибка при работе с провайдером {current_provider}: {str(e)}")
                    
                    except Exception as provider_error:
                        print(f"Ошибка при инициализации провайдера {current_provider}: {str(provider_error)}")
                else:
                    print(f"Провайдер {current_provider} не найден в списке доступных")
                
                # Если не получилось использовать основной провайдер, попробуем другие группы
                for group_name in ['primary', 'secondary', 'fallback']:
                    print(f"Пробуем группу провайдеров: {group_name}")
                    
                    for backup_provider in provider_groups[group_name]:
                        if backup_provider == current_provider or backup_provider not in providers:
                            continue
                            
                        try:
                            provider = providers[backup_provider]
                            print(f"Пробуем резервный провайдер {backup_provider}")
                            
                            yield f"event: update\ndata: {json.dumps({'text': f'Переключаемся на {backup_provider}...', 'provider': backup_provider})}\n\n"
                            
                            try:
                                response_stream = g4f.ChatCompletion.create(
                                    model="gpt-3.5-turbo",
                                    messages=messages,
                                    provider=provider,
                                    stream=True,
                                    timeout=timeout
                                )
                                
                                response_text = ''
                                chunk_count = 0
                                got_any_chunks = False
                                
                                for chunk in response_stream:
                                    chunk_count += 1
                                    if isinstance(chunk, str):
                                        response_text += chunk
                                        print(f"Резервный чанк {chunk_count} от {backup_provider}: {chunk[:30]}...")
                                        yield f"event: chunk\ndata: {json.dumps({'text': chunk, 'provider': backup_provider})}\n\n"
                                        yielded_anything = True
                                        got_any_chunks = True
                                
                                if got_any_chunks:
                                    elapsed = time.time() - start_time
                                    print(f"Стриминг от резервного провайдера {backup_provider} завершен успешно")
                                    yield f"event: complete\ndata: {json.dumps({'text': response_text, 'provider': backup_provider, 'elapsed': elapsed})}\n\n"
                                    return
                                    
                            except Exception as e:
                                print(f"Ошибка при работе с резервным провайдером {backup_provider}: {str(e)}")
                                
                        except Exception as provider_error:
                            print(f"Ошибка при инициализации резервного провайдера {backup_provider}: {str(provider_error)}")
                
                # Если все провайдеры не сработали, используем демо-ответ
                print("Все провайдеры не работают, используем демо-ответ")
                demo_response = get_demo_response(message)
                
                yield f"event: update\ndata: {json.dumps({'text': 'Используем демо-режим...', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                
                # Имитируем стриминг для демо-ответа
                words = demo_response.split()
                chunk_size = max(1, len(words) // 5)  # Разбиваем на 5 частей
                
                for i in range(0, len(words), chunk_size):
                    chunk = ' '.join(words[i:i+chunk_size])
                    yield f"event: chunk\ndata: {json.dumps({'text': chunk + ' ', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                    time.sleep(0.1)  # Небольшая задержка для имитации печати
                
                # Отправляем полный ответ в конце
                elapsed = time.time() - start_time
                yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': elapsed})}\n\n"
            
            except Exception as e:
                print(f"Критическая ошибка в генераторе стриминга: {str(e)}")
                traceback.print_exc()
                
                # В случае общей ошибки, отправляем сообщение об ошибке
                demo_response = "Извините, произошла ошибка при обработке запроса. Попробуйте еще раз."
                
                yield f"event: update\ndata: {json.dumps({'text': 'Ошибка соединения...', 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                yield f"event: chunk\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo'})}\n\n"
                
                # Отправляем завершающее событие
                elapsed = time.time() - start_time
                yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': elapsed})}\n\n"
        
        # Возвращаем потоковый ответ
        return Response(stream_generator(), content_type='text/event-stream')
        
    except Exception as e:
        print(f"Критическая ошибка в обработчике запроса: {str(e)}")
        traceback.print_exc()
        return Response('Внутренняя ошибка сервера', status=500)

# Простой тестовый маршрут
@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok", "message": "Flask-сервер стриминга работает"})

# Функция для запуска сервера
if __name__ == '__main__':
    print("Запуск стримингового сервера на порту 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
