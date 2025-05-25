import g4f

# Включаем подробный лог (опционально)
g4f.debug.logging = True

# Сообщения для чата (можно изменить под себя)
messages = [
    {"role": "system", "content": "Ты — профессиональный AI-ассистент, отвечай ясно и по делу."},
    {"role": "user", "content": "Расскажи интересный факт о космосе."}
]

# Выбор моделей (можно менять)
models = {
    "Phind": g4f.Provider.Phind,
    "Poe": g4f.Provider.Poe,
    "Gemini": g4f.Provider.Gemini
}

# Перебор всех провайдеров
for name, provider in models.items():
    print(f"\n🔹 Ответ от: {name}\n" + "-" * 40)
    try:
        response = g4f.ChatCompletion.create(
            model="gpt-3.5-turbo",  # Или "gemini-pro" для Gemini
            provider=provider,
            messages=messages,
            stream=False
        )
        print(response)
    except Exception as e:
        print(f"❌ Ошибка с {name}: {e}")