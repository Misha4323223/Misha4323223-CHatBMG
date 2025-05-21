#!/usr/bin/env python3
"""
Стриминговый сервер для BOOOMERANGS
Обеспечивает потоковую передачу ответов от моделей G4F
"""
import json
import sys
import time
import g4f
from flask import Flask, request, Response, stream_with_context

app = Flask(__name__)

# Провайдеры, которые стабильно поддерживают стриминг
STREAMING_PROVIDERS = {
    "Qwen_Max": g4f.Provider.Qwen_Qwen_2_5_Max,
    "Qwen_3": g4f.Provider.Qwen_Qwen_3,
    "You": g4f.Provider.You,
    "DeepInfra": g4f.Provider.DeepInfra,
    "Gemini": g4f.Provider.Gemini,
    "GeminiPro": g4f.Provider.GeminiPro
}

# Модели для каждого провайдера
PROVIDER_MODELS = {
    "Qwen_Max": ["qwen-max", "qwen-plus", "qwen-turbo"],
    "Qwen_3": ["qwen3-8b", "qwen3-4b", "qwen3-1.7b", "qwen3-0.6b"],
    "You": ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo"],
    "DeepInfra": ["meta-llama/Llama-3-8b-chat", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    "Gemini": ["gemini-pro"],
    "GeminiPro": ["gemini-pro", "gemini-1.5-pro"]
}

def get_demo_response(message):
    """Генерирует демо-ответ для случаев, когда API недоступен"""
    message_lower = message.lower()
    
    if "привет" in message_lower or "здравствуй" in message_lower:
        return "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?"
    
    if "как дела" in message_lower or "как ты" in message_lower:
        return "У меня всё отлично, спасибо что спросили! Как ваши дела?"
    
    if "что ты умеешь" in message_lower:
        return "Я умею отвечать на вопросы, помогать с задачами, генерировать идеи и многое другое. BOOOMERANGS также позволяет генерировать изображения и конвертировать их в SVG формат."
    
    # Общий ответ
    return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией. Попробуйте задать другой вопрос или попробовать позже."


@app.route('/stream', methods=['POST'])
def stream_chat():
    """Потоковый вывод ответов от G4F моделей с поддержкой стриминга"""
    try:
        # Получаем данные запроса
        data = request.json
        message = data.get('message', '')
        provider_name = data.get('provider', 'Qwen_Max')
        timeout = data.get('timeout', 25)
        
        # Проверяем наличие обязательных параметров
        if not message:
            return json.dumps({"error": "Message is required"}), 400
        
        # Выбираем провайдер или используем Qwen_Max по умолчанию
        if provider_name not in STREAMING_PROVIDERS:
            provider_name = "Qwen_Max"
            
        provider = STREAMING_PROVIDERS[provider_name]
        
        # Выбираем модель для провайдера
        model = PROVIDER_MODELS.get(provider_name, ["gpt-3.5-turbo"])[0]
        
        # Подготавливаем сообщения для модели
        messages = [{"role": "user", "content": message}]
        
        # Для некоторых моделей добавляем системный промпт
        system_prompt = "Ты полезный ассистент BOOOMERANGS. Отвечай кратко и по существу."
        
        if provider_name.startswith("Qwen"):
            if "3" in provider_name:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ]
        elif provider_name in ["Gemini", "GeminiPro"]:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
        
        # Функция для генерации потокового ответа
        def generate():
            # Отправляем начальное уведомление о старте стриминга
            yield f"event: start\ndata: {json.dumps({'provider': provider_name, 'model': model})}\n\n"
            
            start_time = time.time()
            
            try:
                # Создаем запрос к провайдеру со стримингом
                print(f"Начинаем стриминг от {provider_name} с моделью {model}")
                stream = g4f.ChatCompletion.create(
                    model=model,
                    provider=provider,
                    messages=messages,
                    stream=True,
                    timeout=timeout
                )
                
                completed = False
                full_response = ""
                
                # Обрабатываем поток ответов
                for chunk in stream:
                    if chunk:
                        # Отправляем каждый чанк с типом события "chunk"
                        yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"
                        full_response += chunk
                        
                # Отправляем финальное сообщение о завершении
                elapsed = time.time() - start_time
                yield f"event: complete\ndata: {json.dumps({'text': full_response, 'elapsed': elapsed})}\n\n"
                completed = True
                
            except Exception as e:
                # В случае ошибки отправляем сообщение об ошибке
                error_message = str(e)
                print(f"Ошибка стриминга: {error_message}")
                
                yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"
                
                # Отправляем демо-ответ после ошибки
                demo_resp = get_demo_response(message)
                yield f"event: fallback\ndata: {json.dumps({'text': demo_resp})}\n\n"
        
        # Возвращаем потоковый ответ
        return Response(
            stream_with_context(generate()),
            content_type='text/event-stream'
        )
        
    except Exception as e:
        print(f"Ошибка сервера: {e}")
        return json.dumps({"error": str(e)}), 500


# Запускаем сервер на порте 5001, чтобы не конфликтовать с основным сервером
if __name__ == '__main__':
    print("Запуск стримингового сервера на порту 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)