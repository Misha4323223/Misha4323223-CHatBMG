#!/usr/bin/env python3
"""
Поиск рабочих Gradio Spaces для редактирования изображений
"""

from gradio_client import Client

# Список популярных публичных Spaces для обработки изображений
spaces_to_test = [
    "Salesforce/BLIP",
    "microsoft/DialoGPT-medium",
    "huggingface/CodeBERTa-small-v1",
    "facebook/detr-resnet-50",
    "google/vit-base-patch16-224",
    "stabilityai/stable-diffusion-2-1",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4"
]

working_spaces = []

for space in spaces_to_test:
    try:
        print(f"🔍 Проверяем {space}...")
        client = Client(space)
        working_spaces.append(space)
        print(f"✅ {space} работает")
        
        # Попробуем получить API информацию
        try:
            api_info = client.view_api()
            print(f"📋 Методы: {len(api_info)} доступны")
        except:
            print("📋 API информация недоступна")
            
    except Exception as e:
        print(f"❌ {space}: {str(e)[:100]}...")

print(f"\n🎉 Найдено рабочих Spaces: {len(working_spaces)}")
for space in working_spaces:
    print(f"  ✅ {space}")