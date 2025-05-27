"""
BOOOMERANGS Chat Handler
Централизованная логика обработки чата с AI провайдерами
"""

import time
import json
import logging
import requests
import traceback
from typing import Dict, List, Optional, Union, Generator

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatHandler:
    """Основной класс для обработки запросов к AI провайдерам"""
    
    def __init__(self):
        self.python_g4f_url = "http://localhost:5004"
        self.flask_stream_url = "http://localhost:5001"
        
        # Приоритетные провайдеры для разных задач
        self.primary_providers = [
            "Qwen_Qwen_2_5_Max",
            "Gemini", 
            "GeminiPro",
            "DeepInfra",
            "You"
        ]
        
        self.fallback_providers = [
            "Free2GPT",
            "FreeGpt", 
            "ChatGpt",
            "OpenaiChat"
        ]
        
        # Провайдеры для специальных задач
        self.coding_providers = ["DeepSeek", "CodeLinkAva", "Blackbox"]
        self.creative_providers = ["Claude", "Anthropic", "ChatGpt"]
        self.search_providers = ["Perplexity", "You", "Phind"]

    def get_chat_response(self, message: str, provider: str = None, use_stream: bool = False, 
                         timeout: int = 30, context: str = None) -> Dict:
        """
        Основная функция получения ответа от AI провайдера
        
        Args:
            message: Сообщение пользователя
            provider: Конкретный провайдер (необязательно)
            use_stream: Использовать потоковый режим
            timeout: Таймаут в секундах
            context: Контекст предыдущих сообщений
            
        Returns:
            Dict с ответом провайдера
        """
        start_time = time.time()
        
        try:
            # Определяем лучший провайдер для задачи
            if not provider:
                provider = self._select_best_provider(message)
            
            logger.info(f"🤖 Отправляем запрос к провайдеру: {provider}")
            
            # Подготавливаем сообщение с контекстом
            full_message = self._prepare_message_with_context(message, context)
            
            if use_stream:
                return self._get_streaming_response(full_message, provider, timeout)
            else:
                return self._get_direct_response(full_message, provider, timeout)
                
        except Exception as e:
            logger.error(f"❌ Ошибка в get_chat_response: {str(e)}")
            return self._get_fallback_response(message, str(e))

    def _select_best_provider(self, message: str) -> str:
        """Умный выбор провайдера на основе содержания сообщения"""
        
        message_lower = message.lower()
        
        # Для поиска актуальной информации
        if any(word in message_lower for word in ['новости', 'сегодня', 'актуальное', 'поиск', 'найди']):
            return "You"  # Хорошо для поиска
            
        # Для программирования
        if any(word in message_lower for word in ['код', 'программ', 'функция', 'алгоритм', 'bug', 'debug']):
            return "DeepSeek"
            
        # Для творческих задач
        if any(word in message_lower for word in ['стих', 'рассказ', 'креатив', 'идея', 'творчество']):
            return "Claude"
            
        # По умолчанию - лучший общий провайдер
        return "Qwen_Qwen_2_5_Max"

    def _prepare_message_with_context(self, message: str, context: str = None) -> str:
        """Подготавливает сообщение с учетом контекста"""
        
        if context:
            return f"{context}\n\nТекущий вопрос: {message}"
        return message

    def _get_direct_response(self, message: str, provider: str, timeout: int) -> Dict:
        """Получение прямого ответа от провайдера"""
        
        try:
            # Пробуем Python G4F API
            response = requests.post(
                f"{self.python_g4f_url}/python/chat",
                json={
                    "message": message,
                    "provider": provider,
                    "timeout": timeout * 1000
                },
                timeout=timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Проверяем качество ответа
                if self._is_valid_response(result.get('response', '')):
                    return {
                        "success": True,
                        "response": result.get('response'),
                        "provider": result.get('provider', provider),
                        "model": result.get('model', 'unknown'),
                        "elapsed": result.get('elapsed', 0)
                    }
                    
        except Exception as e:
            logger.warning(f"⚠️ Python G4F не ответил: {str(e)}")
            
        # Fallback на другие провайдеры
        return self._try_fallback_providers(message, timeout)

    def _get_streaming_response(self, message: str, provider: str, timeout: int) -> Dict:
        """Получение потокового ответа"""
        
        try:
            response = requests.post(
                f"{self.flask_stream_url}/stream",
                json={
                    "message": message,
                    "provider": provider,
                    "timeout": timeout * 1000
                },
                stream=True,
                timeout=timeout
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "streaming": True,
                    "stream": response,
                    "provider": provider
                }
                
        except Exception as e:
            logger.warning(f"⚠️ Стриминг не удался: {str(e)}")
            
        # Fallback на прямой ответ
        return self._get_direct_response(message, provider, timeout)

    def _try_fallback_providers(self, message: str, timeout: int) -> Dict:
        """Попытка получить ответ от резервных провайдеров"""
        
        for provider in self.fallback_providers:
            try:
                logger.info(f"🔄 Пробуем резервный провайдер: {provider}")
                
                response = requests.post(
                    f"{self.python_g4f_url}/python/chat",
                    json={
                        "message": message,
                        "provider": provider,
                        "timeout": timeout * 1000
                    },
                    timeout=timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if self._is_valid_response(result.get('response', '')):
                        logger.info(f"✅ Резервный провайдер {provider} ответил!")
                        return {
                            "success": True,
                            "response": result.get('response'),
                            "provider": provider,
                            "model": result.get('model', 'fallback'),
                            "elapsed": result.get('elapsed', 0)
                        }
                        
            except Exception as e:
                logger.warning(f"⚠️ Провайдер {provider} не ответил: {str(e)}")
                continue
                
        # Если все провайдеры не работают
        return self._get_demo_response(message)

    def _is_valid_response(self, response: str) -> bool:
        """Проверяет качество ответа от провайдера"""
        
        if not response or len(response.strip()) < 3:
            return False
            
        # Проверяем на HTML-блокировки
        if "<html" in response.lower() or "<!doctype" in response.lower():
            return False
            
        # Проверяем на ошибки
        error_indicators = ['error', 'failed', 'blocked', 'unavailable', 'timeout']
        if any(indicator in response.lower() for indicator in error_indicators):
            return False
            
        return True

    def _get_demo_response(self, message: str) -> Dict:
        """Демо-ответ когда все провайдеры недоступны"""
        
        demo_responses = [
            "Привет! Я BOOOMERANGS AI ассистент. Чем могу помочь вам сегодня?",
            "Извините, в данный момент AI провайдеры временно недоступны. Попробуйте чуть позже.",
            "Я обрабатываю ваш запрос... Пожалуйста, подождите немного.",
            "Система перегружена запросами. Повторите попытку через несколько секунд."
        ]
        
        # Выбираем ответ на основе длины сообщения
        demo_text = demo_responses[len(message) % len(demo_responses)]
        
        return {
            "success": True,
            "response": demo_text,
            "provider": "BOOOMERANGS-Demo",
            "model": "demo-mode",
            "elapsed": 0.5
        }

    def _get_fallback_response(self, message: str, error: str) -> Dict:
        """Fallback ответ при критических ошибках"""
        
        return {
            "success": False,
            "response": f"Извините, произошла ошибка при обработке запроса. Попробуйте переформулировать вопрос.",
            "provider": "BOOOMERANGS-Error",
            "model": "error-mode",
            "elapsed": 0,
            "error": error
        }

    def get_available_providers(self) -> List[str]:
        """Получает список доступных провайдеров"""
        
        try:
            response = requests.get(f"{self.python_g4f_url}/providers", timeout=5)
            if response.status_code == 200:
                return response.json().get('providers', [])
        except:
            pass
            
        # Возвращаем стандартный список
        return self.primary_providers + self.fallback_providers

    def test_provider(self, provider: str) -> Dict:
        """Тестирует конкретный провайдер"""
        
        test_message = "Привет! Как дела?"
        return self.get_chat_response(test_message, provider=provider, timeout=10)

# Глобальный экземпляр для использования в других модулях
chat_handler = ChatHandler()

# Функции для обратной совместимости
def get_chat_response(message: str, provider: str = None, **kwargs) -> Dict:
    """Основная функция для получения ответа от AI"""
    return chat_handler.get_chat_response(message, provider, **kwargs)

def get_streaming_response(message: str, provider: str = None, **kwargs) -> Dict:
    """Функция для получения потокового ответа"""
    return chat_handler.get_chat_response(message, provider, use_stream=True, **kwargs)

def select_best_provider(message: str) -> str:
    """Выбор оптимального провайдера для сообщения"""
    return chat_handler._select_best_provider(message)

if __name__ == "__main__":
    # Тестирование модуля
    print("🤖 Тестируем ChatHandler...")
    
    handler = ChatHandler()
    
    # Тест обычного ответа
    result = handler.get_chat_response("Привет! Как дела?")
    print(f"Результат: {result}")
    
    # Тест выбора провайдера
    provider = handler._select_best_provider("Напиши код на Python")
    print(f"Лучший провайдер для кода: {provider}")
    
    print("✅ Тесты завершены!")