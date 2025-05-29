#!/usr/bin/env python3
import g4f

# Проверим доступные провайдеры
try:
    from g4f import Provider
    print("Доступные провайдеры:")
    
    # Получаем все атрибуты модуля Provider
    provider_names = [name for name in dir(Provider) if not name.startswith('_')]
    
    for name in provider_names[:20]:  # Показываем первые 20
        try:
            provider = getattr(Provider, name)
            if hasattr(provider, '__name__'):
                print(f"✅ {name}")
        except:
            print(f"❌ {name}")
            
    print(f"\nВсего найдено: {len(provider_names)} провайдеров")
    
except Exception as e:
    print(f"Ошибка: {e}")