"""
Стриминговый сервер для BOOOMERANGS
Обеспечивает потоковую передачу ответов от моделей G4F
"""
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import g4f
import json
import time
import threading
import random
import re
import string
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
for name in ["Qwen_Max", "Qwen_3", "You", "DeepInfra", "Gemini", "GeminiPro", "DeepAI"]:
    provider = get_provider(name)
    if provider:
        providers[name] = provider

# Организуем провайдеры в группы по надежности
provider_groups = {
    'primary': ['Qwen_Max', 'Qwen_3', 'You'],
    'secondary': ['DeepInfra', 'Gemini', 'GeminiPro'],
    'fallback': ['DeepAI']
}

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

@app.route('/stream', methods=['POST'])
def stream_chat():
    """Потоковый вывод ответов от G4F моделей с поддержкой стриминга"""
    if request.method != 'POST':
        return Response('Метод не поддерживается', status=405)
    
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_name = data.get('provider', 'Qwen_Max')
        timeout = data.get('timeout', 20000) / 1000  # Переводим миллисекунды в секунды
        
        if not message:
            return Response('Не указано сообщение', status=400)
        
        print(f"Получен запрос: {message[:30]}... от провайдера {provider_name}")
        
        # Подготавливаем диалог с системным промптом
        messages = [
            {"role": "system", "content": "Вы AI-ассистент BOOOMERANGS. Отвечайте по-русски, если вопрос на русском. Давайте краткие и полезные ответы."},
            {"role": "user", "content": message}
        ]
        
        # Подготавливаем соединение для стриминга
        def generate():
            start_time = time.time()
            yielded_anything = False
            
            # Отправляем событие начала стриминга
            yield f"event: start\ndata: {json.dumps({'provider': provider_name})}\n\n"
            
            try:
                # Попробуем использовать конкретного провайдера
                if provider_name in providers:
                    provider = providers[provider_name]
                    
                    try:
                        # Используем стриминг, если провайдер его поддерживает
                        response_stream = g4f.ChatCompletion.create(
                            model="gpt-3.5-turbo",
                            messages=messages,
                            provider=provider,
                            stream=True,
                            timeout=timeout
                        )
                        
                        # Обработка потокового ответа
                        response_text = ''
                        
                        for chunk in response_stream:
                            # Отправляем чанк как SSE событие
                            response_text += chunk
                            
                            yield f"event: chunk\ndata: {json.dumps({'text': chunk, 'provider': provider_name})}\n\n"
                            yielded_anything = True
                            
                        # Отправляем полный ответ в конце
                        elapsed = time.time() - start_time
                        yield f"event: complete\ndata: {json.dumps({'text': response_text, 'provider': provider_name, 'elapsed': elapsed})}\n\n"
                    
                    except Exception as e:
                        print(f"Ошибка при использовании провайдера {provider_name}: {str(e)}")
                        traceback.print_exc()
                        
                        # Если первый провайдер не сработал, попробуем использовать группы провайдеров
                        success = False
                        
                        for group_name in ['primary', 'secondary', 'fallback']:
                            if success:
                                break
                                
                            print(f"🔄 Перебор группы провайдеров: {group_name}")
                            
                            # Перемешиваем провайдеры в группе для баланса нагрузки
                            providers_in_group = provider_groups.get(group_name, []).copy()
                            random.shuffle(providers_in_group)
                            
                            for provider_name in providers_in_group:
                                if provider_name in providers:
                                    provider = providers[provider_name]
                                    
                                    try:
                                        print(f"Попытка использования провайдера {provider_name}...")
                                        
                                        # Сначала пробуем без стриминга для проверки доступности
                                        response = g4f.ChatCompletion.create(
                                            model="gpt-3.5-turbo",
                                            messages=messages,
                                            provider=provider,
                                            timeout=timeout
                                        )
                                        
                                        # Если дошли сюда, значит провайдер работает
                                        print(f"✅ {provider_name} успешно ответил")
                                        
                                        # Отправляем ответ как финальный результат
                                        elapsed = time.time() - start_time
                                        yield f"event: chunk\ndata: {json.dumps({'text': response, 'provider': provider_name})}\n\n"
                                        yield f"event: complete\ndata: {json.dumps({'text': response, 'provider': provider_name, 'elapsed': elapsed})}\n\n"
                                        success = True
                                        yielded_anything = True
                                        break
                                        
                                    except Exception as inner_e:
                                        print(f"❌ Ошибка при использовании провайдера {provider_name}: {str(inner_e)}")
                        
                        # Если ни один провайдер не сработал, возвращаем демо-ответ
                        if not success:
                            print("⚠️ Все провайдеры недоступны, возвращаем демо-ответ")
                            demo_response = get_demo_response(message)
                            yield f"event: fallback\ndata: {json.dumps({'text': demo_response, 'demo': True})}\n\n"
                            yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': time.time() - start_time})}\n\n"
                            yielded_anything = True
                else:
                    # Если указан неизвестный провайдер, возвращаем ошибку
                    error_message = f"Неизвестный провайдер: {provider_name}"
                    yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"
                    yielded_anything = True
            
            except Exception as e:
                error_message = f"Ошибка при обработке запроса: {str(e)}"
                print(error_message)
                traceback.print_exc()
                yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"
                yielded_anything = True
            
            finally:
                # Если ничего не было отправлено, отправляем fallback
                if not yielded_anything:
                    demo_response = get_demo_response(message)
                    yield f"event: fallback\ndata: {json.dumps({'text': demo_response, 'demo': True})}\n\n"
                    yield f"event: complete\ndata: {json.dumps({'text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'elapsed': time.time() - start_time})}\n\n"
        
        # Возвращаем стриминговый ответ
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
        print(f"Ошибка при обработке запроса: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Запуск стримингового сервера на порту 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)