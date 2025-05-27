import time
import json
import traceback
import logging

from flask import Flask, request, jsonify, Response
import g4f  # Предполагается, что g4f импортирован корректно

app = Flask(__name__)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)

def get_chat_response(message, specific_provider=None, use_stream=False, timeout=20):
    """
    Заглушка функции получения ответа от провайдера.
    Предполагается, что эта функция есть в твоём коде.
    """
    # Здесь должен быть твой реальный код, взаимодействующий с g4f.Provider
    # Ниже примерный шаблон возврата
    if specific_provider is None:
        specific_provider = "Qwen_Max"
    if use_stream:
        return {
            "streaming": True,
            "provider": specific_provider,
            "model": "demo-model",
            "response_stream": [f"Chunk {i}" for i in range(5)]
        }
    else:
        return {
            "success": True,
            "response": f"Ответ от {specific_provider}: {message}",
            "provider": specific_provider,
            "model": "demo-model",
            "elapsed": 1.23
        }

def get_demo_response(message):
    """
    Заглушка для fallback-ответа.
    """
    return "Это демо-ответ, поскольку основной провайдер не сработал."

def stream_response_generator(message, provider, timeout):
    """
    Генератор для потокового ответа в /python/chat/stream
    """
    start_time = time.time()
    try:
        result = get_chat_response(message, specific_provider=provider, use_stream=True, timeout=timeout)
        yield f"data: {json.dumps({'status': 'start', 'provider': result.get('provider')})}\n\n"

        if result.get('streaming') and 'response_stream' in result:
            full_response = ''
            for chunk in result['response_stream']:
                if "<html" in chunk.lower():
                    error_msg = 'Провайдер вернул HTML вместо текста — возможно, заблокирован'
                    logging.error(error_msg)
                    yield f"data: {json.dumps({'error': error_msg})}\n\n"
                    break
                yield f"data: {json.dumps({'chunk': chunk, 'provider': result.get('provider')})}\n\n"
                full_response += chunk

            elapsed = time.time() - start_time
            yield f"data: {json.dumps({'status': 'done', 'full_text': full_response, 'provider': result.get('provider'), 'model': result.get('model'), 'elapsed': elapsed})}\n\n"
        else:
            # Стриминг не поддерживается или ошибка
            if "error" in result:
                demo_response = get_demo_response(message)
                error_data = {
                    'error': result.get('error'),
                    'text': demo_response,
                    'provider': 'BOOOMERANGS-Demo'
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                yield f"data: {json.dumps({'status': 'done', 'full_text': demo_response, 'provider': 'BOOOMERANGS-Demo', 'model': 'fallback-mode', 'elapsed': time.time() - start_time})}\n\n"
            else:
                text_data = {
                    'text': result.get('response'),
                    'provider': result.get('provider')
                }
                yield f"data: {json.dumps(text_data)}\n\n"
                yield f"data: {json.dumps({'status': 'done', 'full_text': result.get('response'), 'provider': result.get('provider'), 'model': result.get('model'), 'elapsed': result.get('elapsed', time.time() - start_time)})}\n\n"

    except Exception as e:
        logging.error(f"Ошибка стриминга: {str(e)}", exc_info=True)
        error_data = {'error': str(e)}
        yield f"data: {json.dumps(error_data)}\n\n"
        demo_response = get_demo_response(message)
        text_data = {'text': demo_response, 'provider': 'BOOOMERANGS-Error'}
        yield f"data: {json.dumps(text_data)}\n\n"
        yield f"data: {json.dumps({'status': 'done', 'full_text': demo_response, 'provider': 'BOOOMERANGS-Error', 'model': 'error-mode', 'elapsed': time.time() - start_time})}\n\n"

@app.route('/python/chat/direct', methods=['POST'])
def chat_direct():
    """
    Эндпоинт для прямого запроса к конкретному провайдеру.
    Ожидает JSON с полями: message, provider, model, timeout.
    """
    try:
        data = request.json or {}
        message = data.get('message', '')
        provider_name = data.get('provider')
        model = data.get('model')
        timeout = data.get('timeout', 20)

        if not message:
            return jsonify({"error": "Отсутствует сообщение"}), 400

        if provider_name and hasattr(g4f.Provider, provider_name):
            provider = getattr(g4f.Provider, provider_name)
            start_time = time.time()
            response = provider(
                prompt=message,
                model=model,
                timeout=timeout
            )
            elapsed = time.time() - start_time

            if isinstance(response, str) and "<html" in response.lower():
                raise Exception(f"Провайдер {provider_name} вернул HTML вместо текста")

            logging.info(f"✅ Провайдер {provider_name} успешно ответил за {elapsed:.2f} сек")

            return jsonify({
                "success": True,
                "response": response,
                "provider": provider_name,
                "model": model,
                "elapsed": elapsed
            })
        else:
            error_msg = f"Провайдер {provider_name} не найден"
            logging.error(error_msg)
            return jsonify({
                "error": error_msg,
                "response": f"Провайдер {provider_name} не найден в системе",
                "provider": "unknown"
            }), 404
    except Exception as e:
        logging.error(f"Общая ошибка при прямом вызове провайдера: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "response": f"Ошибка при вызове провайдера: {str(e)}",
            "provider": "error"
        }), 500

@app.route('/python/test', methods=['POST'])
def test():
    """
    Тестовый эндпоинт для проверки работы с самым надёжным провайдером.
    """
    try:
        data = request.json or {}
        message = data.get('message', 'test')

        result = get_chat_response(message, specific_provider="Qwen_Max")
        return jsonify(result)
    except Exception as e:
        logging.error(f"Ошибка при тестировании: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "response": "Тест провалился: " + str(e),
            "provider": "BOOOMERANGS-Test",
            "model": "test-mode"
        }), 500

@app.route('/python/chat/stream', methods=['POST'])
def chat_stream():
    """
    Эндпоинт для потоковой генерации ответов.
    Ожидает JSON с полями: message (обязательно), provider (необязательно), timeout (мс).
    """
    if request.method != 'POST':
        return Response('Метод не поддерживается', status=405)

    data = request.json or {}
    message = data.get('message', '')
    provider = data.get('provider')
    try:
        timeout = float(data.get('timeout', 20000)) / 1000
        if timeout <= 0 or timeout > 60:
            timeout = 20  # Ограничение тайм-аута максимум 60 секунд
    except (ValueError, TypeError):
        timeout = 20

    if not message:
        return jsonify({"error": "Отсутствует сообщение"}), 400

    return Response(
        stream_response_generator(message, provider, timeout),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

@app.route('/')
def index():
    """
    Простой тестовый эндпоинт.
    """
    return "BOOOMERANGS Python G4F API работает!"

if __name__ == '__main__':
    available_providers = [name for name in dir(g4f.Provider) if not name.startswith('_') and name[0].isupper()]
    logging.info(f"🤖 Загружено {len(available_providers)} провайдеров: {', '.join(available_providers)}")

    # Запуск приложения
    app.run(host='0.0.0.0', port=5004, debug=False)