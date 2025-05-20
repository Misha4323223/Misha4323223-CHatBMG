from g4f.client import Client

client = Client()

while True:
    user_input = input("Вы: ")
    if user_input.lower() in ["выход", "exit", "quit"]:
        break
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": user_input}]
    )
    print("Бот:", response.choices[0].message.content)