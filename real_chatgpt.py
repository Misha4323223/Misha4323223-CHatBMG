import g4f
import sys
import os
import time
import random

# Список стабильных провайдеров G4F без авторизации (на основе тестов)
RELIABLE_PROVIDERS = [
    "FreeGpt",
    "You",
    "Bing",
    "DeepAI",
    "ChatBase",
    "Aichat",
    "Blackbox", 
    "GptGo",
    "Koala"
]

def get_working_providers():
    """Получение списка рабочих провайдеров без авторизации"""
    working_providers = []
    
    for provider_name in RELIABLE_PROVIDERS:
        try:
            provider = getattr(g4f.Provider, provider_name)
            if getattr(provider, "working", False) and not getattr(provider, "needs_auth", False):
                working_providers.append(provider)
        except Exception:
            continue
    
    # Если не найдено ни одного из надежных провайдеров, пробуем все рабочие
    if not working_providers:
        for provider_name in g4f.Provider.__all__:
            try:
                provider = getattr(g4f.Provider, provider_name)
                if getattr(provider, "working", False) and not getattr(provider, "needs_auth", False):
                    working_providers.append(provider)
            except Exception:
                continue
    
    return working_providers

def get_response(message, model="gpt-3.5-turbo", max_retries=5):
    """Получение ответа от GPT через G4F с несколькими провайдерами"""
    # Получаем список рабочих провайдеров
    providers = get_working_providers()
    
    # Перемешиваем список для распределения нагрузки
    random.shuffle(providers)
    
    # Формируем сообщения для модели
    messages = [{"role": "user", "content": message}]
    
    # Обходим всех провайдеров
    for retry in range(max_retries):
        for provider in providers:
            try:
                print(f"Попытка {retry+1} с провайдером {provider.__name__}...")
                
                # Получаем ответ от провайдера
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    provider=provider,
                    timeout=30  # Ограничиваем время ожидания
                )
                
                # Если получен корректный ответ
                if response and isinstance(response, str) and len(response) > 10:
                    print(f"✓ Успешно получен ответ от {provider.__name__}")
                    return {
                        "response": response,
                        "provider": provider.__name__,
                        "model": model,
                        "success": True
                    }
                else:
                    print(f"✗ Неполный ответ от {provider.__name__}: {response[:50]}...")
            
            except Exception as e:
                print(f"✗ Ошибка с {provider.__name__}: {str(e)[:100]}...")
                continue
        
        # Если все провайдеры не сработали, ждем немного перед следующей попыткой
        if retry < max_retries - 1:
            wait_time = 2 * (retry + 1)  # Увеличиваем время ожидания с каждой попыткой
            print(f"Ждем {wait_time} секунд перед следующей попыткой...")
            time.sleep(wait_time)
    
    # Если все провайдеры не сработали после всех попыток
    return {
        "response": "К сожалению, не удалось получить ответ от провайдеров G4F. Попробуйте позже или используйте другую модель.",
        "provider": "none",
        "model": model,
        "success": False
    }

def chat_with_gpt(question=None):
    """Функция для обработки разговора с GPT"""
    if not question:
        # Если вопрос не передан, пытаемся получить его из аргументов
        if len(sys.argv) > 1:
            question = " ".join(sys.argv[1:])
        else:
            question = "Привет, расскажи о себе."
    
    print(f"\nВопрос: {question}")
    print("-" * 50)
    
    start_time = time.time()
    result = get_response(question)
    end_time = time.time()
    
    print("\nОтвет:")
    print("-" * 50)
    print(result["response"])
    print("-" * 50)
    print(f"Провайдер: {result['provider']}")
    print(f"Модель: {result['model']}")
    print(f"Время ответа: {end_time - start_time:.2f} секунд")
    
    return result["response"]

if __name__ == "__main__":
    chat_with_gpt()