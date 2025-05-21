#!/usr/bin/env python3
"""
Тестирование провайдера Qwen для BOOOMERANGS
"""
import g4f
from g4f.Provider import Qwen_Qwen_3, Qwen_Qwen_2_5_Max, You, Phind

# Тест синхронной функции для Qwen 3
def test_qwen3_sync():
    try:
        print("Тестирование Qwen 3 синхронно...")
        response = g4f.ChatCompletion.create(
            model="qwen3-8b",  # Используем поддерживаемую модель
            provider=Qwen_Qwen_3,
            messages=[{"role": "user", "content": "Расскажи о себе, кто ты?"}],
            timeout=20  # 20 секунд на ответ
        )
        print(f"✅ Ответ от Qwen 3: {response}")
        return response
    except Exception as e:
        print(f"❌ Ошибка Qwen 3: {str(e)}")
        return None

# Тест синхронной функции для Qwen 2.5 Max
def test_qwen25max_sync():
    try:
        print("Тестирование Qwen 2.5 Max синхронно...")
        response = g4f.ChatCompletion.create(
            model="qwen-max",  # Используем предполагаемую модель для Qwen 2.5 Max
            provider=Qwen_Qwen_2_5_Max, 
            messages=[{"role": "user", "content": "Расскажи о себе, кто ты?"}],
            timeout=20  # 20 секунд на ответ
        )
        print(f"✅ Ответ от Qwen 2.5 Max: {response}")
        return response
    except Exception as e:
        print(f"❌ Ошибка Qwen 2.5 Max: {str(e)}")
        return None

# Тестирование других провайдеров для сравнения
def test_other_providers():
    providers = [
        {"name": "You", "provider": You},
        {"name": "Phind", "provider": Phind}
    ]
    
    for provider_info in providers:
        try:
            print(f"Тестирование {provider_info['name']}...")
            response = g4f.ChatCompletion.create(
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
    
    # Запускаем синхронные тесты разных версий Qwen
    test_qwen3_sync()
    test_qwen25max_sync()
    
    # Запускаем тесты других провайдеров
    test_other_providers()
    
    print("Тестирование провайдеров завершено.")