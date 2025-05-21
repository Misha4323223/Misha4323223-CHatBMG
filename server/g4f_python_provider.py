#!/usr/bin/env python3
"""
BOOOMERANGS G4F Python Provider
Более стабильная версия провайдера на Python, использующая библиотеку g4f
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

def try_provider(provider_name, message, timeout=10):
    """Попытка получить ответ от провайдера с обработкой ошибок"""
    if provider_name not in AVAILABLE_PROVIDERS:
        print(f"❌ Провайдер {provider_name} не найден")
        return None
    
    provider = AVAILABLE_PROVIDERS[provider_name]
    print(f"Попытка использования провайдера {provider_name}...")
    
    try:
        # Обертка с таймаутом (временно без настоящего таймаута)
        start_time = time.time()
        
        # Используем модель в зависимости от провайдера
        model = "gpt-4o-mini"  # Модель по умолчанию
        
        # Специфические модели для разных провайдеров
        if provider_name == "You":
            model = "gpt-4o-mini"
        elif provider_name == "Phind":
            model = "claude-3-haiku" 
        elif provider_name == "Bing":
            model = "gpt-4"
        elif provider_name == "Qwen_Qwen_3":
            model = "qwen3-8b"
        elif provider_name == "Qwen_Qwen_2_5_Max":
            model = "qwen-max"
            
        response = g4f.ChatCompletion.create(
            model=model,
            provider=provider,
            messages=[{"role": "user", "content": message}],
            timeout=15  # Устанавливаем таймаут 15 секунд для всех провайдеров
        )
        
        # Проверяем результат
        if not response or (isinstance(response, str) and len(response.strip()) == 0):
            print(f"❌ Провайдер {provider_name} вернул пустой ответ")
            return None
        
        elapsed = time.time() - start_time
        print(f"✅ {provider_name} успешно ответил за {elapsed:.2f} сек")
        
        return {
            "response": response,
            "provider": provider_name,
            "model": "g4f-python"
        }
    except Exception as e:
        print(f"❌ Ошибка при использовании провайдера {provider_name}: {str(e)}")
        return None

def get_chat_response(message, specific_provider=None):
    """Получение ответа с перебором провайдеров"""
    result = None
    
    # Если указан конкретный провайдер, пробуем его
    if specific_provider and specific_provider in AVAILABLE_PROVIDERS:
        result = try_provider(specific_provider, message)
        if result:
            return result
        print(f"Указанный провайдер {specific_provider} не ответил, пробуем другие...")
    
    # Порядок перебора провайдеров (от более стабильных к менее)
    providers_priority = ["Qwen", "Qwen_3", "Qwen_Max", "Qwen_72B", "You", "DDG", "DeepInfra", "Phind", "Liaobots", "GeminiPro", "Gemini", "AIChatFree", "FreeGpt", "ChatgptFree", "Yqcloud", "ChatGLM"]
    
    # Перебираем провайдеры
    for provider_name in providers_priority:
        result = try_provider(provider_name, message)
        if result:
            return result
    
    # Если все провайдеры не ответили, используем демо-ответ
    print("⚠️ Все провайдеры недоступны, используем демо-режим")
    return {
        "response": get_demo_response(message),
        "provider": "BOOOMERANGS-Demo",
        "model": "demo-mode"
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
    
    try:
        result = get_chat_response(message, specific_provider)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "response": get_demo_response("ошибка"),
            "provider": "BOOOMERANGS-Demo",
            "model": "error-mode"
        }, ensure_ascii=False))
        sys.exit(1)