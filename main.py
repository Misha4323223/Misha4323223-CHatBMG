from flask import Flask, request, jsonify
import asyncio
import os

app = Flask(__name__)

# Глобальные переменные для EdgeGPT
EMAIL = os.getenv("CHATGPT_EMAIL")
PASSWORD = os.getenv("CHATGPT_PASSWORD")
bot = None

async def init_chatgpt():
    """Инициализация EdgeGPT бота"""
    global bot
    try:
        from EdgeGPT import Chatbot
        
        # Создаем бота без cookies файла (автоматическое подключение)
        bot = Chatbot()
        print(f"✅ EdgeGPT успешно инициализирован с аккаунтом: {EMAIL}")
        return True
    except Exception as e:
        print(f"❌ Ошибка инициализации EdgeGPT: {e}")
        return False

@app.route("/api/chatgpt", methods=["POST"])
def chatgpt_endpoint():
    global bot
    
    data = request.get_json()
    message = data.get("message", "")
    
    if not message:
        return jsonify({"success": False, "error": "Сообщение не может быть пустым"})

    async def get_response():
        global bot
        try:
            # Если бот не инициализирован, создаем его
            if bot is None:
                success = await init_chatgpt()
                if not success:
                    return {"success": False, "error": "Не удалось подключиться к ChatGPT"}
            
            # Отправляем сообщение
            response = await bot.ask(prompt=message)
            
            # Извлекаем текст ответа
            if response and 'item' in response:
                messages = response['item']['messages']
                if messages:
                    last_message = messages[-1]
                    if 'adaptiveCards' in last_message:
                        text = last_message['adaptiveCards'][0]['body'][0]['text']
                        return {
                            "success": True, 
                            "response": text,
                            "provider": "EdgeGPT (Real ChatGPT)",
                            "model": "gpt-4"
                        }
            
            return {"success": False, "error": "Не удалось получить ответ от ChatGPT"}
            
        except Exception as e:
            print(f"❌ Ошибка EdgeGPT: {e}")
            return {"success": False, "error": f"Ошибка ChatGPT: {str(e)}"}

    # Запускаем асинхронную функцию
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(get_response())
    loop.close()
    
    return jsonify(result)

@app.route("/api/chatgpt/status", methods=["GET"])
def chatgpt_status():
    """Проверка статуса подключения к ChatGPT"""
    global bot
    
    status = {
        "connected": bot is not None,
        "email": EMAIL if EMAIL else "Не задан",
        "password_set": bool(PASSWORD)
    }
    
    return jsonify(status)

if __name__ == "__main__":
    print("🚀 Запуск EdgeGPT сервера...")
    print(f"📧 Email: {EMAIL}")
    print(f"🔑 Password: {'✓ Задан' if PASSWORD else '✗ Не задан'}")
    app.run(host="0.0.0.0", port=3000, debug=True)