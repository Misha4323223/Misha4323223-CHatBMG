from flask import Flask, request, jsonify
from edgegpt import Chatbot
import asyncio
import os

app = Flask(__name__)

EMAIL = os.getenv("CHATGPT_EMAIL")
PASSWORD = os.getenv("CHATGPT_PASSWORD")

bot = None

@app.before_first_request
def init_bot():
    global bot
    bot = Chatbot(email=EMAIL, password=PASSWORD)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message", "")
    if not message:
        return jsonify({"error": "No message provided"}), 400

    async def ask_bot():
        response = await bot.ask(message)
        return response["message"]

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    answer = loop.run_until_complete(ask_bot())
    return jsonify({"response": answer})

@app.route("/api/close", methods=["POST"])
def close_bot():
    global bot
    async def close():
        await bot.aclose()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(close())
    return jsonify({"status": "bot closed"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)