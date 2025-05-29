#!/usr/bin/env python3
"""
Тестирование провайдеров G4F для диагностики проблем
"""

import g4f
import logging
import asyncio

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)

async def test_provider(provider_name):
    """Тестирует конкретный провайдер"""
    try:
        print(f"\n🔍 Тестируем провайдер: {provider_name}")
        
        provider = getattr(g4f.Provider, provider_name)
        
        # Простой тест запрос
        response = await g4f.ChatCompletion.create_async(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Привет"}],
            provider=provider
        )
        
        result = str(response).strip()
        if result and len(result) > 5:
            print(f"✅ {provider_name}: {result[:100]}...")
            return True
        else:
            print(f"❌ {provider_name}: Пустой ответ")
            return False
            
    except Exception as e:
        print(f"❌ {provider_name}: Ошибка - {str(e)}")
        return False

async def main():
    """Основная функция тестирования"""
    
    # Список бесплатных провайдеров для тестирования
    free_providers = ['FreeGpt', 'You', 'Blackbox', 'Liaobots', 'DDG', 'Phind']
    
    print("🚀 Начинаем тестирование бесплатных AI провайдеров...")
    
    working_providers = []
    
    for provider in free_providers:
        try:
            success = await test_provider(provider)
            if success:
                working_providers.append(provider)
        except Exception as e:
            print(f"❌ Критическая ошибка при тестировании {provider}: {e}")
    
    print(f"\n📊 Результаты тестирования:")
    print(f"Протестировано: {len(free_providers)}")
    print(f"Работают: {len(working_providers)}")
    print(f"Рабочие провайдеры: {working_providers}")
    
    if not working_providers:
        print("\n⚠️ Ни один бесплатный провайдер не работает!")
        print("Возможные причины:")
        print("- Ограничения сети/файрвола")
        print("- Изменения в API провайдеров")
        print("- Требуются дополнительные настройки")
    
    return working_providers

if __name__ == '__main__':
    asyncio.run(main())