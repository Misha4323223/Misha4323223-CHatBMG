#!/usr/bin/env python3
import g4f

print("Начинаю тест провайдера Qwen_Max...")

try:
    # Используем правильное имя класса провайдера и правильную модель
    response = g4f.ChatCompletion.create(
        model="qwen-max",
        provider=g4f.Provider.Qwen_Qwen_2_5_Max,
        messages=[{"role": "user", "content": "Привет! Кто ты?"}],
        timeout=30
    )
    
    print("Класс ответа:", type(response))
    print("Ответ от провайдера:", response)
    
    # Если ответ пустой или отсутствует, выводим сообщение
    if not response or (isinstance(response, str) and len(response.strip()) == 0):
        print("Получен пустой ответ")
    
    # Для форматированного вывода JSON
    if isinstance(response, dict):
        import json
        print("JSON ответ:", json.dumps(response, indent=2))
        
    # Конвертируем ответ в формат для API
    result = {
        "success": True,
        "response": response if isinstance(response, str) else str(response),
        "provider": "Qwen_Max",
        "model": "qwen-max"
    }
    
    print("Форматированный ответ для API:", result)
    
except Exception as e:
    print(f"Ошибка при работе с Qwen: {str(e)}")