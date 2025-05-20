import g4f
import sys

def print_providers():
    """Вывод информации о доступных провайдерах"""
    print("\nДоступные провайдеры G4F:")
    for provider in g4f.Provider.__all__:
        try:
            provider_class = getattr(g4f.Provider, provider)
            working = getattr(provider_class, "working", False)
            status = "✅ работает" if working else "❌ не работает"
            needs_auth = getattr(provider_class, "needs_auth", False)
            auth_status = "🔑 нужна авторизация" if needs_auth else "🔓 без авторизации"
            print(f"- {provider}: {status}, {auth_status}")
        except:
            print(f"- {provider}: ошибка загрузки")

def chat_with_g4f(message, model="gpt-3.5-turbo"):
    """Отправка сообщения провайдеру G4F и получение ответа"""
    print(f"\nОтправка сообщения [{model}]: {message}")

    # Создаем сообщения для модели
    messages = [{"role": "user", "content": message}]
    
    # Пробуем использовать разных рабочих провайдеров
    providers_to_try = [
        g4f.Provider.DeepAi,
        g4f.Provider.Aichat,
        g4f.Provider.You,
        g4f.Provider.Bing,
        g4f.Provider.GptGo,
        g4f.Provider.FreeGpt
    ]
    
    for provider in providers_to_try:
        if not getattr(provider, "working", False):
            continue
            
        try:
            print(f"Пробуем провайдера: {provider.__name__}")
            response = g4f.ChatCompletion.create(
                model=model,
                messages=messages,
                provider=provider
            )
            
            if response:
                print(f"\nПолучен ответ от {provider.__name__}")
                return response
        except Exception as e:
            print(f"Ошибка при использовании {provider.__name__}: {str(e)}")
    
    # Если ни один из провайдеров не сработал
    return "Извините, не удалось получить ответ ни от одного провайдера G4F."

def main():
    """Основная функция чат-бота"""
    print("=" * 50)
    print("G4F Бесплатный ChatGPT бот")
    print("=" * 50)
    print("Используйте 'выход', 'exit' или 'quit', чтобы завершить")
    print("Используйте 'провайдеры', чтобы посмотреть список провайдеров")
    print("=" * 50)
    
    # Выводим информацию о провайдерах
    print_providers()
    
    while True:
        try:
            user_input = input("\nВы: ")
            
            # Проверка команд
            if user_input.lower() in ["выход", "exit", "quit"]:
                print("До свидания!")
                break
            
            if user_input.lower() in ["провайдеры", "providers"]:
                print_providers()
                continue
            
            # Получаем ответ от G4F
            response = chat_with_g4f(user_input)
            
            # Выводим ответ
            print(f"\nБот: {response}")
            
        except KeyboardInterrupt:
            print("\nПрограмма прервана пользователем. До свидания!")
            break
        except Exception as e:
            print(f"Произошла ошибка: {str(e)}")

if __name__ == "__main__":
    main()