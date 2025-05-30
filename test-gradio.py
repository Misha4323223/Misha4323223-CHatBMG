#!/usr/bin/env python3
"""
Тест интеграции с Gradio Spaces
"""

try:
    from gradio_client import Client
    print("✅ Gradio Client успешно импортирован")
    
    # Проверяем доступность популярного Space
    try:
        client = Client("briaai/RMBG-1.4")
        print("✅ Подключение к Gradio Space RMBG-1.4 успешно")
        print("📋 Доступные методы:", client.view_api())
    except Exception as e:
        print("⚠️ Не удалось подключиться к Space:", str(e))
    
    # Проверяем другие Spaces
    spaces_to_test = [
        "multimodalart/stable-diffusion-inpainting",
        "tencentarc/gfpgan"
    ]
    
    for space in spaces_to_test:
        try:
            client = Client(space)
            print(f"✅ Space {space} доступен")
        except Exception as e:
            print(f"❌ Space {space} недоступен: {str(e)}")
            
except ImportError as e:
    print("❌ Ошибка импорта Gradio Client:", str(e))
except Exception as e:
    print("❌ Общая ошибка:", str(e))