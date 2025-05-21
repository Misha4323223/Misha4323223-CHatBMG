#!/usr/bin/env python3
"""
BOOOMERANGS G4F Python Provider
Версия с улучшенной системой резервных провайдеров и автоматическим переключением
между разными моделями для повышения надежности
"""
import g4f
import g4f.Provider
import sys
import json
import time
import random

# Получаем список доступных провайдеров из библиотеки g4f
AVAILABLE_PROVIDERS = {}

# Добавляем провайдеры, которые есть в библиотеке
for provider_class in g4f.Provider.__providers__:
    # Наиболее стабильные бесплатные провайдеры
    if provider_class.__name__ == "You":
        AVAILABLE_PROVIDERS["You"] = provider_class
    elif provider_class.__name__ == "DDG":
        AVAILABLE_PROVIDERS["DDG"] = provider_class
    elif provider_class.__name__ == "Phind":
        AVAILABLE_PROVIDERS["Phind"] = provider_class
    elif provider_class.__name__ == "DeepInfra":
        AVAILABLE_PROVIDERS["DeepInfra"] = provider_class
    elif provider_class.__name__ == "FreeGpt":
        AVAILABLE_PROVIDERS["FreeGpt"] = provider_class
    elif provider_class.__name__ == "ChatgptFree":
        AVAILABLE_PROVIDERS["ChatgptFree"] = provider_class
    elif provider_class.__name__ == "Liaobots":
        AVAILABLE_PROVIDERS["Liaobots"] = provider_class
    elif provider_class.__name__ == "Gemini":
        AVAILABLE_PROVIDERS["Gemini"] = provider_class
    elif provider_class.__name__ == "GeminiPro":
        AVAILABLE_PROVIDERS["GeminiPro"] = provider_class
    elif provider_class.__name__ == "Aichat":
        AVAILABLE_PROVIDERS["Aichat"] = provider_class
    elif provider_class.__name__ == "ChatGLM":
        AVAILABLE_PROVIDERS["ChatGLM"] = provider_class
    elif provider_class.__name__ == "AIChatFree":
        AVAILABLE_PROVIDERS["AIChatFree"] = provider_class
    elif provider_class.__name__ == "Yqcloud":
        AVAILABLE_PROVIDERS["Yqcloud"] = provider_class
    # Добавляем новые провайдеры
    elif provider_class.__name__ == "Qwen":
        AVAILABLE_PROVIDERS["Qwen"] = provider_class
    elif provider_class.__name__ == "Qwen_Qwen_2_5":
        AVAILABLE_PROVIDERS["Qwen_72B"] = provider_class
    elif provider_class.__name__ == "Qwen_Qwen_2_5_Max":
        AVAILABLE_PROVIDERS["Qwen_Max"] = provider_class
    elif provider_class.__name__ == "Qwen_Qwen_3":
        AVAILABLE_PROVIDERS["Qwen_3"] = provider_class

# Выводим список провайдеров, которые будем использовать
print(f"🤖 Загружено {len(AVAILABLE_PROVIDERS)} провайдеров: {', '.join(AVAILABLE_PROVIDERS.keys())}")

# Шаблоны ответов для демо-режима
DEMO_RESPONSES = [
    {
        "pattern": ["привет", "здравствуй", "hello", "hi"],
        "responses": [
            "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?",
            "Здравствуйте! Я ассистент BOOOMERANGS. Готов ответить на вопросы о нашем сервисе или просто поболтать!",
            "Добрый день! BOOOMERANGS AI на связи. Как я могу вам помочь?"
        ]
    },
    {
        "pattern": ["что такое booomerangs", "расскажи о booomerangs", "booomerangs это"],
        "responses": [
            "BOOOMERANGS - это инновационный инструмент для работы с искусственным интеллектом, который объединяет возможности текстовых AI-моделей и генерации изображений. С BOOOMERANGS вы можете бесплатно использовать функции, аналогичные ChatGPT и DALL-E, без необходимости платить за подписки или покупать API ключи. Наше приложение работает напрямую в браузере и оптимизировано для использования на мобильных устройствах.",
            "BOOOMERANGS - это мультимодальная AI-платформа, предоставляющая доступ к генерации текста и изображений без необходимости покупки API ключей. Мы используем свободные AI провайдеры, обеспечиваем постоянное переключение между ними для стабильной работы и предлагаем удобный интерфейс для всех устройств."
        ]
    },
    {
        "pattern": ["что ты умеешь", "возможности", "функции"],
        "responses": [
            "Я умею многое! Вот мои основные возможности:\n\n1. Отвечать на ваши вопросы с использованием современных AI-моделей\n2. Генерировать текстовые описания и контент\n3. Помогать с решением проблем\n4. Давать рекомендации\n\nКроме того, BOOOMERANGS приложение позволяет:\n• Создавать изображения по текстовому описанию\n• Конвертировать изображения в SVG формат\n• Использовать различные AI-провайдеры для получения разнообразных ответов"
        ]
    }
]

def get_demo_response(message):
    """Получение демо-ответа по шаблону"""
    message_lower = message.lower()
    
    # Проверяем совпадение с шаблонами
    for template in DEMO_RESPONSES:
        if any(pattern in message_lower for pattern in template["pattern"]):
            # Выбираем случайный ответ из доступных
            return random.choice(template["responses"])
    
    # Общий ответ, если ни один шаблон не подошел
    return "Я BOOOMERANGS AI ассистент. К сожалению, внешние AI-провайдеры сейчас недоступны, но я все равно могу помочь с базовой информацией о BOOOMERANGS и подсказать, как использовать генератор изображений!"

def try_provider(provider_name, message, timeout=15, use_stream=False):
    """Попытка получить ответ от провайдера с обработкой ошибок и системой резервных моделей"""
    if provider_name not in AVAILABLE_PROVIDERS:
        print(f"❌ Провайдер {provider_name} не найден")
        return None
    
    provider = AVAILABLE_PROVIDERS[provider_name]
    print(f"Попытка использования провайдера {provider_name}...")
    
    # Таблица моделей для каждого провайдера с резервными вариантами
    provider_models = {
        "Qwen_Max": ["qwen-max", "qwen-plus", "qwen-turbo"],
        "Qwen_3": ["qwen3-8b", "qwen3-4b", "qwen3-1.7b", "qwen3-0.6b", "qwen3-14b", "qwen3-32b", "qwen3-235b-a22b", "qwen3-30b-a3b"],
        "Qwen": ["qwen-turbo", "qwen-plus"],
        "Qwen_72B": ["qwen-72b"],
        "You": ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo"],
        "Phind": ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"],
        "GeminiPro": ["gemini-pro", "gemini-1.5-pro"],
        "Gemini": ["gemini-pro", "gemini-1.5-pro"],
        "DeepInfra": ["meta-llama/Llama-3-8b-chat", "meta-llama/Llama-3-70b-chat"],
        "Liaobots": ["gpt-4", "gpt-3.5-turbo"],
        "AIChatFree": ["gpt-3.5-turbo", "gpt-4"],
        "ChatgptFree": ["gpt-3.5"],
        "DDG": ["gpt-3.5"],
        "FreeGpt": ["gpt-3.5"]
    }
    
    # Провайдеры, которые поддерживают стриминг
    streaming_providers = [
        "Qwen_Max", "Qwen_3", "Gemini", "GeminiPro", "DeepInfra", "You"
    ]
    
    # Определяем, поддерживает ли провайдер стриминг
    supports_streaming = provider_name in streaming_providers
    
    # Если запрошен стриминг, но провайдер его не поддерживает, выводим предупреждение
    if use_stream and not supports_streaming:
        print(f"⚠️ Провайдер {provider_name} не поддерживает стриминг, будет использован обычный запрос")
    
    # Используем стриминг только если он запрошен и провайдер его поддерживает
    use_streaming = use_stream and supports_streaming
    
    # Получаем список моделей для данного провайдера
    models_to_try = provider_models.get(provider_name, ["gpt-3.5-turbo"])
    
    # Если модели не определены для провайдера, используем стандартную
    if not models_to_try:
        models_to_try = ["gpt-3.5-turbo"]
    
    # Информация о попытках
    attempt_info = []
    
    # Попытка получить ответ с перебором моделей
    for model in models_to_try:
        try:
            # Засекаем время
            start_time = time.time()
            
            # Формируем сообщение для модели
            messages = [{"role": "user", "content": message}]
            
            # Для некоторых моделей нужно добавить системный промпт
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
            
            print(f"  📝 Пробуем модель: {model}, стриминг: {use_streaming}")
            
            # Параметры запроса
            request_params = {
                "model": model,
                "provider": provider,
                "messages": messages,
                "timeout": timeout,  # Используем переданный таймаут
            }
            
            # Добавляем stream=True если используем стриминг
            if use_streaming:
                request_params["stream"] = True
            
            # Выполняем запрос
            response = g4f.ChatCompletion.create(**request_params)
            
            # Проверяем результат
            if use_streaming:
                # Для стриминга проверяем, что response является итератором
                if hasattr(response, '__iter__') or hasattr(response, '__next__'):
                    print(f"✅ {provider_name} (модель {model}) успешно начал стриминг")
                    
                    # Для стриминга возвращаем итератор
                    elapsed = time.time() - start_time
                    return {
                        "streaming": True,
                        "response": response,
                        "provider": provider_name,
                        "model": model,
                        "elapsed": elapsed
                    }
                else:
                    print(f"⚠️ Провайдер {provider_name} не вернул итератор для стриминга")
                    # Продолжаем перебор моделей
                    continue
            else:
                # Для обычного запроса проверяем, что ответ не пустой
                if not response or (isinstance(response, str) and len(response.strip()) == 0):
                    print(f"  ⚠️ Модель {model} вернула пустой ответ")
                    attempt_info.append(f"{model}: пустой ответ")
                    continue
                
                elapsed = time.time() - start_time
                print(f"✅ {provider_name} (модель {model}) успешно ответил за {elapsed:.2f} сек")
                
                return {
                    "streaming": False,
                    "response": response,
                    "provider": provider_name,
                    "model": model,
                    "elapsed": elapsed
                }
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ❌ Ошибка с моделью {model}: {error_msg}")
            attempt_info.append(f"{model}: {error_msg}")
            
            # Если ошибка связана с unsupported model, пробуем следующую модель
            if "Model is not supported" in error_msg or "model not supported" in error_msg.lower():
                continue
            
            # Если ошибка связана с таймаутом, можно увеличить таймаут для следующей попытки
            if "timeout" in error_msg.lower():
                timeout += 5  # Увеличиваем таймаут на 5 секунд
                print(f"  ⏱️ Увеличиваем таймаут до {timeout} сек для следующей попытки")
    
    # Все модели провайдера не сработали
    print(f"❌ Провайдер {provider_name} не смог ответить. Попытки: {', '.join(attempt_info)}")
    return None

def get_chat_response(message, specific_provider=None, use_stream=False):
    """Получение ответа с улучшенной системой резервных провайдеров (fallback) и поддержкой стриминга"""
    results = []
    
    # Приоритетные провайдеры для стриминга
    streaming_priority = ["Qwen_Max", "Qwen_3", "DeepInfra", "You", "Gemini", "GeminiPro"]
    
    # Определяем группы провайдеров для fallback
    provider_groups = {
        "primary": ["Qwen_Max", "Qwen_3", "Qwen", "Qwen_72B"],
        "secondary": ["You", "DDG", "DeepInfra", "Phind"],
        "tertiary": ["Liaobots", "GeminiPro", "Gemini", "AIChatFree"],
        "fallback": ["FreeGpt", "ChatgptFree", "Yqcloud", "ChatGLM"]
    }
    
    # Если включен стриминг, перераспределяем приоритеты в пользу провайдеров с поддержкой стриминга
    if use_stream:
        # Создаем новый список приоритетов, начиная с провайдеров с поддержкой стриминга
        provider_groups["primary"] = [p for p in streaming_priority if p in provider_groups["primary"]]
        provider_groups["primary"].extend([p for p in provider_groups["primary"] if p not in provider_groups["primary"]])
        
        print(f"🔄 Включен режим стриминга, приоритет отдан провайдерам: {streaming_priority}")
    
    # Если указан конкретный провайдер, сначала пробуем его
    if specific_provider and specific_provider in AVAILABLE_PROVIDERS:
        print(f"🔍 Попытка использования запрошенного провайдера: {specific_provider}")
        result = try_provider(specific_provider, message, use_stream=use_stream)
        if result:
            print(f"✅ Успешно получен ответ от запрошенного провайдера: {specific_provider}")
            return result
        print(f"⚠️ Запрошенный провайдер {specific_provider} не ответил, переключаемся на систему резервных провайдеров")
    
    # Функция для перебора группы провайдеров
    def try_provider_group(group_name):
        nonlocal results
        print(f"🔄 Перебор группы провайдеров: {group_name}")
        group_results = []
        
        for provider_name in provider_groups[group_name]:
            if provider_name in AVAILABLE_PROVIDERS:
                result = try_provider(provider_name, message, use_stream=use_stream)
                if result:
                    group_results.append(result)
                    # Возвращаем результат сразу после первого успешного провайдера
                    return result
        
        print(f"⚠️ Ни один провайдер из группы {group_name} не ответил")
        return None
    
    # Перебираем группы провайдеров по приоритету
    for group in ["primary", "secondary", "tertiary", "fallback"]:
        group_result = try_provider_group(group)
        if group_result:
            print(f"✅ Группа {group} успешно вернула ответ")
            return group_result
    
    # Если все провайдеры не ответили, используем демо-ответ
    print("⚠️ Все провайдеры недоступны, используем демо-режим")
    return {
        "streaming": False,
        "response": get_demo_response(message),
        "provider": "BOOOMERANGS-Demo",
        "model": "demo-mode",
        "elapsed": 0.0
    }

# Обработка аргументов командной строки
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Отсутствует сообщение",
            "response": get_demo_response("ошибка"),
            "provider": "BOOOMERANGS-Demo",
            "model": "error-mode"
        }))
        sys.exit(1)
    
    message = sys.argv[1]
    specific_provider = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Проверяем, запрошен ли стриминг
    use_stream = False
    if len(sys.argv) > 3 and sys.argv[3].lower() == "stream":
        use_stream = True
    
    try:
        result = get_chat_response(message, specific_provider, use_stream=use_stream)
        
        # Если результат содержит стриминг, мы не можем вернуть итератор через JSON
        if result and result.get("streaming", False) and use_stream:
            # Для стриминга будем возвращать частями текст через стандартный вывод
            # Преобразуем итератор стриминга в текст
            print(json.dumps({
                "streaming": True,
                "starting": True,
                "provider": result.get("provider", "Unknown"),
                "model": result.get("model", "unknown"),
            }, ensure_ascii=False))
            
            try:
                stream_iterator = result.get("response", [])
                accumulated_text = ""
                
                for chunk in stream_iterator:
                    if chunk:
                        # Выводим каждый чанк как отдельную строку JSON
                        print(json.dumps({
                            "streaming": True,
                            "chunk": str(chunk),
                            "provider": result.get("provider", "Unknown"),
                            "model": result.get("model", "unknown"),
                        }, ensure_ascii=False))
                        sys.stdout.flush()  # Важно для передачи данных в реальном времени
                        
                        accumulated_text += str(chunk)
                
                # Отправляем финальный результат
                print(json.dumps({
                    "streaming": True,
                    "complete": True,
                    "response": accumulated_text,
                    "provider": result.get("provider", "Unknown"),
                    "model": result.get("model", "unknown"),
                }, ensure_ascii=False))
                
            except Exception as stream_error:
                print(json.dumps({
                    "streaming": True,
                    "error": str(stream_error),
                    "response": get_demo_response("ошибка стриминга"),
                    "provider": "BOOOMERANGS-Fallback",
                    "model": "streaming-error"
                }, ensure_ascii=False))
        else:
            # Обычный режим
            # Убедимся, что response - строка для корректного форматирования
            if isinstance(result, dict) and "response" in result:
                if not isinstance(result["response"], str):
                    result["response"] = str(result["response"])
            
            # Выводим результат с поддержкой Unicode
            print(json.dumps(result, ensure_ascii=False))
            
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "response": get_demo_response("ошибка"),
            "provider": "BOOOMERANGS-Demo",
            "model": "error-mode"
        }, ensure_ascii=False))
        sys.exit(1)