#!/usr/bin/env python3
"""
Клиент для работы с Gradio Inpaint Spaces на Hugging Face
Обеспечивает AI-редактирование изображений через готовые решения
"""

from gradio_client import Client
import base64
import io
from PIL import Image
import requests
import os
import tempfile
from huggingface_hub import login

# Аутентификация с Hugging Face
hf_token = os.getenv('HUGGINGFACE_API_KEY')
if hf_token:
    try:
        login(token=hf_token)
        print("✅ Успешная аутентификация с Hugging Face")
    except Exception as e:
        print(f"⚠️ Ошибка аутентификации: {e}")

class GradioInpaintClient:
    def __init__(self):
        self.spaces = {
            'stable_diffusion_inpaint': 'runwayml/stable-diffusion-inpainting',
            'controlnet_inpaint': 'diffusers/controlnet-inpainting',
            'segment_anything': 'facebook/segment-anything-2',
            'remove_background': 'briaai/RMBG-1.4'
        }
        
    def get_available_spaces(self):
        """Получить список доступных Gradio Spaces для редактирования"""
        return {
            'inpaint': 'Удаление и добавление объектов',
            'remove_bg': 'Удаление фона',
            'segment': 'Выделение объектов',
            'enhance': 'Улучшение качества'
        }
    
    async def inpaint_image(self, image_url, mask_description, new_content):
        """
        Инпейнтинг изображения через Gradio Space
        """
        try:
            # Используем популярный Gradio Space для инпейнтинга
            client = Client("multimodalart/stable-diffusion-inpainting")
            
            # Загружаем исходное изображение
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))
            
            # Создаем временный файл для изображения
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_image:
                image.save(temp_image.name)
                image_path = temp_image.name
            
            # Создаем простую маску (белая область для редактирования)
            mask = Image.new('RGB', image.size, 'black')
            # В реальной реализации здесь будет более сложная логика создания маски
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_mask:
                mask.save(temp_mask.name)
                mask_path = temp_mask.name
            
            # Выполняем инпейнтинг
            result = client.predict(
                image_path,  # Исходное изображение
                mask_path,   # Маска
                new_content, # Текст для нового содержимого
                api_name="/predict"
            )
            
            # Очищаем временные файлы
            os.unlink(image_path)
            os.unlink(mask_path)
            
            return {
                'success': True,
                'result_url': result,
                'operation': 'inpaint',
                'provider': 'Gradio_Space'
            }
            
        except Exception as e:
            print(f"Ошибка инпейнтинга: {e}")
            return {
                'success': False,
                'error': str(e),
                'operation': 'inpaint'
            }
    
    async def remove_background(self, image_url):
        """
        Удаление фона через Gradio Space
        """
        try:
            client = Client("briaai/RMBG-1.4")
            
            # Загружаем изображение
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                image.save(temp_file.name)
                image_path = temp_file.name
            
            # Удаляем фон
            result = client.predict(
                image_path,
                api_name="/predict"
            )
            
            os.unlink(image_path)
            
            return {
                'success': True,
                'result_url': result,
                'operation': 'remove_background',
                'provider': 'Gradio_Space'
            }
            
        except Exception as e:
            print(f"Ошибка удаления фона: {e}")
            return {
                'success': False,
                'error': str(e),
                'operation': 'remove_background'
            }
    
    async def enhance_image(self, image_url):
        """
        Улучшение качества изображения
        """
        try:
            client = Client("tencentarc/gfpgan")
            
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                image.save(temp_file.name)
                image_path = temp_file.name
            
            result = client.predict(
                image_path,
                2,  # Upscale factor
                api_name="/predict"
            )
            
            os.unlink(image_path)
            
            return {
                'success': True,
                'result_url': result,
                'operation': 'enhance',
                'provider': 'Gradio_Space'
            }
            
        except Exception as e:
            print(f"Ошибка улучшения: {e}")
            return {
                'success': False,
                'error': str(e),
                'operation': 'enhance'
            }

# Глобальный экземпляр клиента
gradio_client = GradioInpaintClient()

def get_gradio_client():
    return gradio_client