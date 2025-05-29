#!/usr/bin/env python3
"""
LLaVA Vision Analyzer - анализ изображений без внешних API
Использует простые методы компьютерного зрения для анализа изображений
"""

import sys
import json
import base64
from io import BytesIO
import requests
from PIL import Image
import numpy as np

def analyze_image_colors(image_path_or_url):
    """Анализ доминирующих цветов изображения"""
    try:
        if image_path_or_url.startswith('http'):
            response = requests.get(image_path_or_url)
            image = Image.open(BytesIO(response.content))
        else:
            image = Image.open(image_path_or_url)
        
        # Уменьшаем изображение для быстрого анализа
        image = image.convert('RGB')
        image = image.resize((100, 100))
        
        # Получаем пиксели
        pixels = np.array(image)
        pixels = pixels.reshape(-1, 3)
        
        # Анализируем цвета
        unique_colors, counts = np.unique(pixels, axis=0, return_counts=True)
        
        # Сортируем по популярности
        sorted_indices = np.argsort(counts)[::-1]
        dominant_colors = unique_colors[sorted_indices[:5]]
        
        return [
            {
                'r': int(color[0]),
                'g': int(color[1]), 
                'b': int(color[2]),
                'hex': f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
            }
            for color in dominant_colors
        ]
        
    except Exception as e:
        return [{'error': str(e)}]

def analyze_image_structure(image_path_or_url):
    """Анализ структуры и композиции изображения"""
    try:
        if image_path_or_url.startswith('http'):
            response = requests.get(image_path_or_url)
            image = Image.open(BytesIO(response.content))
        else:
            image = Image.open(image_path_or_url)
        
        image = image.convert('RGB')
        width, height = image.size
        
        # Анализ яркости по зонам
        top_zone = image.crop((0, 0, width, height//3))
        middle_zone = image.crop((0, height//3, width, 2*height//3))
        bottom_zone = image.crop((0, 2*height//3, width, height))
        
        def get_zone_info(zone):
            pixels = np.array(zone)
            brightness = np.mean(pixels)
            return {
                'brightness': float(brightness),
                'is_bright': brightness > 128,
                'is_dark': brightness < 80
            }
        
        return {
            'width': width,
            'height': height,
            'aspect_ratio': width / height,
            'zones': {
                'top': get_zone_info(top_zone),
                'middle': get_zone_info(middle_zone),
                'bottom': get_zone_info(bottom_zone)
            }
        }
        
    except Exception as e:
        return {'error': str(e)}

def create_smart_description(image_path_or_url):
    """Создание умного описания изображения на основе анализа"""
    try:
        colors = analyze_image_colors(image_path_or_url)
        structure = analyze_image_structure(image_path_or_url)
        
        # Анализируем доминирующие цвета
        main_colors = []
        for color in colors[:3]:
            if 'error' not in color:
                r, g, b = color['r'], color['g'], color['b']
                
                if r > 150 and g < 100 and b < 100:
                    main_colors.append('красные тона')
                elif g > 150 and r < 100 and b < 100:
                    main_colors.append('зеленые тона')
                elif b > 150 and r < 100 and g < 100:
                    main_colors.append('синие тона')
                elif r > 150 and g > 150 and b < 100:
                    main_colors.append('желтые тона')
                elif r > 200 and g > 200 and b > 200:
                    main_colors.append('светлые тона')
                elif r < 80 and g < 80 and b < 80:
                    main_colors.append('темные тона')
                else:
                    main_colors.append('смешанные тона')
        
        # Определяем тип изображения по структуре
        image_type = "изображение"
        if structure.get('zones', {}).get('bottom', {}).get('is_dark', False):
            if structure.get('zones', {}).get('top', {}).get('is_bright', False):
                image_type = "портрет или персонаж"
        
        # Анализируем композицию
        lighting = "нейтральное освещение"
        if structure.get('zones', {}).get('top', {}).get('is_bright', False):
            lighting = "яркое освещение сверху"
        elif structure.get('zones', {}).get('middle', {}).get('is_bright', False):
            lighting = "центральное освещение"
        
        # Собираем описание
        description_parts = [image_type]
        
        if main_colors:
            description_parts.append(f"с {', '.join(main_colors[:2])}")
        
        description_parts.append(lighting)
        
        description = ', '.join(description_parts)
        
        return {
            'description': description,
            'main_colors': main_colors,
            'image_type': image_type,
            'lighting': lighting,
            'technical_info': {
                'colors': colors,
                'structure': structure
            }
        }
        
    except Exception as e:
        return {'error': str(e)}

def main():
    """Главная функция"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python llava-vision-analyzer.py <image_url_or_path>'}))
        return
    
    image_path = sys.argv[1]
    result = create_smart_description(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()