#!/usr/bin/env python3
"""
Тестирование провайдера Qwen для BOOOMERANGS
"""
import asyncio
import g4f
from g4f.Provider import Qwen, You, Phind

# Тест асинхронной функции
async def test_qwen_async():
    try:
        print("Тестирование Qwen асинхронно...")
        response = await g4f.ChatCompletion.create_async(
            model="gpt-4",
            provider=Qwen,
            messages=[{"role": "user", "content": "Расскажи о себе, кто ты?"}],
            timeout=20  # 20 секунд на ответ
        )
        print(f"✅ Ответ от Qwen (async): {response}")
        return response
    except Exception as e:
        print(f"❌ Ошибка Qwen (async): {str(e)}")
        return None

# Тест синхронной функции
def test_qwen_sync():
    try:
        print("Тестирование Qwen синхронно...")
        response = g4f.ChatCompletion.create(
            model="gpt-4",
            provider=Qwen,
            messages=[{"role": "user", "content": "Расскажи о себе, кто ты?"}],
            timeout=20  # 20 секунд на ответ
        )
        print(f"✅ Ответ от Qwen (sync): {response}")
        return response
    except Exception as e:
        print(f"❌ Ошибка Qwen (sync): {str(e)}")
        return None

# Тестирование других провайдеров для сравнения
async def test_other_providers():
    providers = [
        {"name": "You", "provider": You},
        {"name": "Phind", "provider": Phind}
    ]
    
    for provider_info in providers:
        try:
            print(f"Тестирование {provider_info['name']}...")
            response = await g4f.ChatCompletion.create_async(
                model="gpt-4",
                provider=provider_info['provider'],
                messages=[{"role": "user", "content": "Расскажи о себе, кто ты?"}],
                timeout=15
            )
            print(f"✅ Ответ от {provider_info['name']}: {response}")
        except Exception as e:
            print(f"❌ Ошибка {provider_info['name']}: {str(e)}")

# Точка входа для запуска тестов
if __name__ == "__main__":
    print("Запуск тестирования провайдеров G4F для BOOOMERANGS...")
    
    # Запускаем синхронный тест
    test_qwen_sync()
    
    # Запускаем асинхронные тесты
    asyncio.run(test_qwen_async())
    asyncio.run(test_other_providers())
    
    print("Тестирование провайдеров завершено.")