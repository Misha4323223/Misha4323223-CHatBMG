import g4f
import sys
import time
import random

def get_provider_and_model():
    """Находит рабочие провайдеры и модели для них"""
    provider_models = []
    
    # Список надежных провайдеров
    priority_providers = [
        "Blackbox", "FreeGpt", "You", "Bing", "DeepAI", 
        "ChatBase", "Aichat", "GptGo", "Koala"
    ]
    
    # Сначала проверяем приоритетные провайдеры
    for provider_name in priority_providers:
        try:
            provider = getattr(g4f.Provider, provider_name)
            
            # Проверяем, работает ли провайдер и не требует ли авторизации
            if getattr(provider, "working", False) and not getattr(provider, "needs_auth", False):
                # Определяем модель для провайдера
                default_model = getattr(provider, "default_model", None)
                
                # Если у провайдера есть модель по умолчанию, используем ее
                if default_model:
                    provider_models.append((provider, default_model))
                    print(f"Найден рабочий провайдер: {provider_name} с моделью {default_model}")
        except Exception as e:
            print(f"Ошибка при проверке провайдера {provider_name}: {str(e)[:50]}...")
    
    # Если не нашли ни одного приоритетного провайдера, ищем среди всех
    if not provider_models:
        for provider_name in g4f.Provider.__all__:
            try:
                if provider_name in priority_providers:
                    continue  # Пропускаем уже проверенные
                
                provider = getattr(g4f.Provider, provider_name)
                
                if getattr(provider, "working", False) and not getattr(provider, "needs_auth", False):
                    default_model = getattr(provider, "default_model", None)
                    
                    if default_model:
                        provider_models.append((provider, default_model))
                        print(f"Найден дополнительный провайдер: {provider_name} с моделью {default_model}")
            except Exception:
                pass
    
    # Перемешиваем список для распределения нагрузки
    random.shuffle(provider_models)
    return provider_models

def get_response(message, max_retries=3):
    """Получение ответа от GPT через G4F с несколькими провайдерами"""
    # Получаем список рабочих провайдеров с моделями
    provider_models = get_provider_and_model()
    
    # Если нет доступных провайдеров
    if not provider_models:
        return {
            "response": "Не найдено доступных провайдеров G4F. Все провайдеры либо не работают, либо требуют авторизацию.",
            "provider": "none",
            "model": "none",
            "success": False
        }
    
    # Формируем сообщения для модели
    messages = [{"role": "user", "content": message}]
    
    # Пробуем каждую пару провайдер-модель несколько раз
    for retry in range(max_retries):
        for provider, model in provider_models:
            try:
                print(f"Попытка {retry+1} с провайдером {provider.__name__} и моделью {model}...")
                
                # Получаем ответ от провайдера
                response = g4f.ChatCompletion.create(
                    model=model,
                    messages=messages,
                    provider=provider,
                    timeout=30  # Ограничиваем время ожидания
                )
                
                # Если получен корректный ответ
                if response and isinstance(response, str) and len(response) > 10:
                    print(f"✓ Успешно получен ответ от {provider.__name__} с моделью {model}")
                    return {
                        "response": response,
                        "provider": provider.__name__,
                        "model": model,
                        "success": True
                    }
                else:
                    print(f"✗ Неполный ответ от {provider.__name__}: {response[:50] if response else 'нет ответа'}...")
            
            except Exception as e:
                print(f"✗ Ошибка с {provider.__name__}: {str(e)[:100]}...")
                continue
        
        # Если все провайдеры не сработали, ждем немного перед следующей попыткой
        if retry < max_retries - 1 and provider_models:
            wait_time = 2 * (retry + 1)  # Увеличиваем время ожидания с каждой попыткой
            print(f"Ждем {wait_time} секунд перед следующей попыткой...")
            time.sleep(wait_time)
    
    # Если все провайдеры не сработали после всех попыток
    return {
        "response": "К сожалению, не удалось получить ответ от провайдеров G4F. Попробуйте позже или используйте другую модель.",
        "provider": "none",
        "model": "none",
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