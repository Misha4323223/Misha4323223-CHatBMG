#!/usr/bin/env python3
"""
Тест аутентификации с Hugging Face и проверка доступных Spaces
"""

import os
from huggingface_hub import login, whoami
from gradio_client import Client

# Проверяем аутентификацию
hf_token = os.getenv('HUGGINGFACE_API_KEY')

if not hf_token:
    print("❌ HUGGINGFACE_API_KEY не найден в переменных окружения")
    exit(1)

try:
    # Аутентификация
    login(token=hf_token)
    print("✅ Успешная аутентификация с Hugging Face")
    
    # Проверяем информацию об аккаунте
    user_info = whoami()
    print(f"👤 Пользователь: {user_info['name']}")
    
    # Список Spaces для тестирования с аутентификацией
    spaces_to_test = [
        "stabilityai/stable-diffusion-2-1",
        "runwayml/stable-diffusion-v1-5",
        "CompVis/stable-diffusion-v1-4",
        "multimodalart/stable-diffusion-inpainting"
    ]
    
    working_spaces = []
    
    for space in spaces_to_test:
        try:
            print(f"🔍 Проверяем {space}...")
            client = Client(space, hf_token=hf_token)
            working_spaces.append(space)
            print(f"✅ {space} доступен")
            
        except Exception as e:
            print(f"❌ {space}: {str(e)[:100]}...")
    
    print(f"\n🎉 Найдено доступных Spaces: {len(working_spaces)}")
    for space in working_spaces:
        print(f"  ✅ {space}")
    
except Exception as e:
    print(f"❌ Ошибка аутентификации: {e}")
    print("💡 Убедитесь, что ваш Hugging Face токен действителен и имеет необходимые права доступа")