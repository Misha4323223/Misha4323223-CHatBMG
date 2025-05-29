#!/usr/bin/env python3
"""
Hugging Face Vision Analyzer - анализ изображений через LLaVA/BLIP
"""

import sys
import json
import base64
import requests
import os
from io import BytesIO
from PIL import Image

def analyze_image_with_llava(image_url):
    """Анализ изображения через Hugging Face LLaVA API"""
    try:
        api_key = os.getenv('HUGGINGFACE_API_KEY')
        if not api_key:
            return {'error': 'HUGGINGFACE_API_KEY not found'}
        
        # Загружаем изображение
        if image_url.startswith('http'):
            response = requests.get(image_url)
            image = Image.open(BytesIO(response.content))
        else:
            image = Image.open(image_url)
        
        # Конвертируем в base64
        buffered = BytesIO()
        image.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Используем LLaVA через Hugging Face
        api_url = "https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Запрос на анализ изображения
        payload = {
            "inputs": {
                "image": img_base64,
                "text": "Describe this image in detail. What objects, people, animals, colors, and scene elements do you see?"
            },
            "parameters": {
                "max_new_tokens": 200
            }
        }
        
        response = requests.post(api_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                description = result[0].get('generated_text', 'No description available')
            else:
                description = str(result)
            
            # Парсим описание для извлечения объектов
            objects = extract_objects_from_description(description)
            
            return {
                'description': description,
                'objects': objects,
                'image_type': determine_image_type(description),
                'colors': extract_colors_from_description(description),
                'style': extract_style_from_description(description),
                'success': True
            }
        else:
            # Fallback на BLIP если LLaVA недоступна
            return analyze_with_blip(img_base64, api_key)
            
    except Exception as e:
        return {'error': str(e), 'success': False}

def analyze_with_blip(img_base64, api_key):
    """Fallback анализ через BLIP-2"""
    try:
        api_url = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
        }
        
        # Отправляем изображение как binary data
        img_data = base64.b64decode(img_base64)
        
        response = requests.post(api_url, headers=headers, data=img_data)
        
        if response.status_code == 200:
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                description = result[0].get('generated_text', 'No description available')
            else:
                description = "Unable to analyze image"
            
            objects = extract_objects_from_description(description)
            
            return {
                'description': description,
                'objects': objects,
                'image_type': determine_image_type(description),
                'colors': extract_colors_from_description(description),
                'style': 'photorealistic',
                'success': True,
                'model': 'BLIP-2'
            }
        else:
            return {'error': f'BLIP API error: {response.status_code}', 'success': False}
            
    except Exception as e:
        return {'error': f'BLIP error: {str(e)}', 'success': False}

def extract_objects_from_description(description):
    """Извлечение объектов из описания"""
    objects = []
    desc_lower = description.lower()
    
    # Ищем общие объекты
    object_keywords = {
        'cat': 'кот',
        'dog': 'собака', 
        'person': 'человек',
        'man': 'мужчина',
        'woman': 'женщина',
        'boots': 'сапоги',
        'shoes': 'обувь',
        'hat': 'шляпа',
        'glasses': 'очки',
        'tree': 'дерево',
        'house': 'дом',
        'car': 'машина',
        'background': 'фон'
    }
    
    for eng, rus in object_keywords.items():
        if eng in desc_lower:
            objects.append(rus)
    
    return objects

def determine_image_type(description):
    """Определение типа изображения"""
    desc_lower = description.lower()
    
    if any(word in desc_lower for word in ['person', 'man', 'woman', 'face']):
        return 'портрет'
    elif any(word in desc_lower for word in ['cat', 'dog', 'animal']):
        return 'животное'
    elif any(word in desc_lower for word in ['landscape', 'outdoor', 'nature']):
        return 'пейзаж'
    else:
        return 'изображение'

def extract_colors_from_description(description):
    """Извлечение цветов из описания"""
    colors = []
    desc_lower = description.lower()
    
    color_keywords = {
        'red': 'красный',
        'green': 'зеленый',
        'blue': 'синий',
        'yellow': 'желтый',
        'orange': 'оранжевый',
        'purple': 'фиолетовый',
        'black': 'черный',
        'white': 'белый',
        'brown': 'коричневый',
        'gray': 'серый'
    }
    
    for eng, rus in color_keywords.items():
        if eng in desc_lower:
            colors.append(rus)
    
    return colors

def extract_style_from_description(description):
    """Извлечение стиля из описания"""
    desc_lower = description.lower()
    
    if any(word in desc_lower for word in ['cartoon', 'animated', 'drawing']):
        return 'мультяшный стиль'
    elif any(word in desc_lower for word in ['photo', 'realistic', 'real']):
        return 'фотореалистичный'
    elif any(word in desc_lower for word in ['painting', 'art', 'artistic']):
        return 'художественный стиль'
    else:
        return 'профессиональный стиль'

def main():
    """Главная функция"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python huggingface-vision.py <image_url>'}))
        return
    
    image_url = sys.argv[1]
    result = analyze_image_with_llava(image_url)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()