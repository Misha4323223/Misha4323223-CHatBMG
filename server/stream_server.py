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
for name in ["Qwen_Qwen_2_5_Max", "Qwen_Qwen_3", "You", "DeepInfra", "Gemini", "GeminiPro", "Phind", "Liaobots"]:
    provider = get_provider(name)
    if provider:
        providers[name] = provider

# Организуем провайдеры в группы по надежности
provider_groups = {
    'primary': ['Qwen_Qwen_2_5_Max', 'Qwen_Qwen_3', 'You'],
    'secondary': ['DeepInfra', 'Gemini', 'GeminiPro', 'Phind'],
    'fallback': ['You', 'DeepInfra']
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
                # Используем демо-ответ для отладки
                demo_response = get_demo_response(message)
                print("Отправляем демо-ответ для проверки стриминга")
                
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
