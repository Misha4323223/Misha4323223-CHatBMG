import g4f
import sys

def test_g4f():
    """Тестирование G4F с конкретным вопросом"""
    question = "Привет, кто ты и чем можешь помочь?"
    
    if len(sys.argv) > 1:
        # Если передан аргумент, используем его как вопрос
        question = " ".join(sys.argv[1:])
    
    print(f"\nВопрос: {question}")
    print("-" * 50)
    
    # Вывод информации о рабочих провайдерах
    working_providers = []
    for provider_name in g4f.Provider.__all__:
        try:
            provider = getattr(g4f.Provider, provider_name)
            if hasattr(provider, "working") and provider.working and not (hasattr(provider, "needs_auth") and provider.needs_auth):
                working_providers.append(provider)
        except:
            pass
    
    print(f"Найдено {len(working_providers)} рабочих провайдеров без авторизации")
    
    # Пробуем получить ответ от каждого рабочего провайдера
    for provider in working_providers[:5]:  # Ограничиваем первыми 5 для скорости
        try:
            print(f"\nПробуем провайдера: {provider.__name__}")
            
            response = g4f.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": question}],
                provider=provider
            )
            
            if response:
                print(f"\nОтвет от {provider.__name__}:")
                print("-" * 50)
                print(response)
                print("-" * 50)
                return
            
        except Exception as e:
            print(f"Ошибка с провайдером {provider.__name__}: {str(e)[:100]}...")
    
    print("\nНе удалось получить ответ ни от одного провайдера.")
    
    # Проверка провайдера из примера
    try:
        print("\nПробуем метод из вашего примера через Client:")
        from g4f.client import Client
        client = Client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": question}]
        )
        
        print("\nОтвет через Client API:")
        print("-" * 50)
        print(response.choices[0].message.content)
        print("-" * 50)
    except Exception as e:
        print(f"Ошибка при использовании Client API: {str(e)}")

if __name__ == "__main__":
    test_g4f()