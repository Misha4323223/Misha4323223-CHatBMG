#!/usr/bin/env python3
"""
Azure Computer Vision API для анализа изображений
"""

import sys
import json
import requests
import os

def analyze_image_with_azure(image_url):
    """Анализ изображения через Azure Computer Vision API"""
    try:
        api_key = os.getenv('AZURE_COMPUTER_VISION_KEY')
        endpoint = os.getenv('AZURE_COMPUTER_VISION_ENDPOINT')
        
        if not api_key:
            return {'error': 'AZURE_COMPUTER_VISION_KEY not found', 'success': False}
        
        if not endpoint:
            return {'error': 'AZURE_COMPUTER_VISION_ENDPOINT not found', 'success': False}
        
        # URL для анализа изображений
        analyze_url = f"{endpoint}/vision/v3.2/analyze"
        
        headers = {
            'Ocp-Apim-Subscription-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        # Параметры для получения максимальной информации
        params = {
            'visualFeatures': 'Categories,Description,Objects,Tags,Color',
            'details': 'Landmarks',
            'language': 'en'
        }
        
        # Данные запроса
        data = {
            'url': image_url
        }
        
        response = requests.post(analyze_url, headers=headers, params=params, json=data)
        
        if response.status_code == 200:
            result = response.json()
            
            # Извлекаем описание
            description = ""
            if 'description' in result and 'captions' in result['description']:
                captions = result['description']['captions']
                if captions:
                    description = captions[0]['text']
            
            # Извлекаем объекты
            objects = []
            if 'objects' in result:
                for obj in result['objects']:
                    objects.append(translate_object_name(obj['object']))
            
            # Извлекаем теги
            tags = []
            if 'tags' in result:
                for tag in result['tags']:
                    if tag['confidence'] > 0.5:  # Только уверенные теги
                        tags.append(translate_object_name(tag['name']))
            
            # Определяем цвета
            colors = []
            if 'color' in result:
                color_info = result['color']
                if 'dominantColors' in color_info:
                    for color in color_info['dominantColors']:
                        colors.append(translate_color_name(color))
            
            # Определяем тип изображения
            image_type = determine_image_type_from_description(description)
            
            return {
                'description': description,
                'objects': objects,
                'tags': tags,
                'colors': colors,
                'image_type': image_type,
                'style': determine_style_from_tags(tags),
                'success': True,
                'raw_result': result
            }
        else:
            return {
                'error': f'Azure API error: {response.status_code} - {response.text}',
                'success': False
            }
            
    except Exception as e:
        return {'error': str(e), 'success': False}

def translate_object_name(english_name):
    """Перевод названий объектов на русский"""
    translations = {
        'cat': 'кот',
        'dog': 'собака',
        'person': 'человек',
        'man': 'мужчина',
        'woman': 'женщина',
        'boot': 'сапог',
        'boots': 'сапоги',
        'shoe': 'обувь',
        'shoes': 'обувь',
        'hat': 'шляпа',
        'cap': 'кепка',
        'glasses': 'очки',
        'tree': 'дерево',
        'house': 'дом',
        'car': 'машина',
        'animal': 'животное',
        'clothing': 'одежда',
        'footwear': 'обувь'
    }
    
    return translations.get(english_name.lower(), english_name)

def translate_color_name(english_color):
    """Перевод названий цветов на русский"""
    translations = {
        'red': 'красный',
        'green': 'зеленый', 
        'blue': 'синий',
        'yellow': 'желтый',
        'orange': 'оранжевый',
        'purple': 'фиолетовый',
        'black': 'черный',
        'white': 'белый',
        'brown': 'коричневый',
        'gray': 'серый',
        'grey': 'серый'
    }
    
    return translations.get(english_color.lower(), english_color)

def determine_image_type_from_description(description):
    """Определение типа изображения по описанию"""
    desc_lower = description.lower()
    
    if any(word in desc_lower for word in ['person', 'man', 'woman', 'people']):
        return 'портрет'
    elif any(word in desc_lower for word in ['cat', 'dog', 'animal']):
        return 'животное'
    elif any(word in desc_lower for word in ['landscape', 'outdoor', 'nature', 'tree']):
        return 'пейзаж'
    else:
        return 'изображение'

def determine_style_from_tags(tags):
    """Определение стиля по тегам"""
    if any('мультяш' in tag or 'cartoon' in tag.lower() for tag in tags):
        return 'мультяшный стиль'
    elif any('фото' in tag or 'photo' in tag.lower() for tag in tags):
        return 'фотореалистичный'
    else:
        return 'профессиональный стиль'

def main():
    """Главная функция"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python azure-vision.py <image_url>'}))
        return
    
    image_url = sys.argv[1]
    result = analyze_image_with_azure(image_url)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()