from g4f.client import Client
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('g4f-test')

def test_g4f_client():
    try:
        logger.info("Создание клиента G4F...")
        client = Client()
        
        # Вывод доступных методов клиента
        logger.info(f"Методы клиента: {dir(client)}")
        
        # Проверка доступа к моделям
        if hasattr(client, 'models') and hasattr(client.models, 'list'):
            models = client.models.list()
            logger.info(f"Доступные модели: {models}")
        else:
            logger.warning("Метод для получения списка моделей недоступен")
        
        # Тестовый запрос
        message = "Привет, кто ты?"
        logger.info(f"Отправка тестового запроса: {message}")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Попробуем с этой моделью
            messages=[{"role": "user", "content": message}]
        )
        
        logger.info(f"Тип ответа: {type(response)}")
        logger.info(f"Структура ответа: {dir(response)}")
        
        if hasattr(response, 'choices') and len(response.choices) > 0:
            answer = response.choices[0].message.content
            logger.info(f"Ответ: {answer}")
        else:
            logger.error("Не удалось получить ответ из response")
            logger.info(f"Полный response: {response}")
            
    except Exception as e:
        logger.exception(f"Ошибка при использовании G4F Client: {e}")

if __name__ == "__main__":
    test_g4f_client()
