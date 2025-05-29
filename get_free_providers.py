#!/usr/bin/env python3
import g4f

# Проверим бесплатные провайдеры
try:
    from g4f import Provider
    
    # Список проверенных бесплатных провайдеров
    free_providers = [
        'FreeGpt', 'Liaobots', 'HuggingChat', 'DeepInfra', 'You',
        'Gemini', 'Anthropic', 'Blackbox', 'ChatGpt', 'AiChats',
        'Poe', 'DDG', 'DuckDuckGo', 'AIChatFree', 'ChatGptEs',
        'Phind', 'Groq', 'OpenaiChat', 'GeekGpt', 'FastGpt'
    ]
    
    working_providers = []
    
    for name in free_providers:
        try:
            provider = getattr(Provider, name, None)
            if provider:
                working_providers.append(name)
                print(f"✅ {name}")
            else:
                print(f"❌ {name} - не найден")
        except Exception as e:
            print(f"❌ {name} - ошибка: {e}")
    
    print(f"\nРабочих провайдеров: {len(working_providers)}")
    print("Список для кода:", working_providers)
    
except Exception as e:
    print(f"Ошибка: {e}")