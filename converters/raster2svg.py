#!/usr/bin/env python3
# Скрипт для конвертации изображения в SVG

import sys
import requests
from PIL import Image
import io
import numpy as np
import base64

# Попытка импортировать potrace
try:
    import potrace
except ImportError:
    print('Пожалуйста, установите библиотеку potrace: pip install pypotrace')
    sys.exit(1)

def download_image(url):
    """Загрузка изображения по URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert('L')
    except Exception as e:
        print(f'Ошибка при загрузке изображения: {str(e)}', file=sys.stderr)
        sys.exit(1)

def convert_to_svg(image):
    """Конвертация изображения в SVG с помощью potrace"""
    # Конвертируем изображение в бинарное представление
    threshold = 128
    bitmap = np.array(image) < threshold
    
    # Трассировка с помощью potrace
    bmp = potrace.Bitmap(bitmap)
    path = bmp.trace()
    
    # Получаем размеры изображения
    width, height = image.size
    
    # Начинаем генерировать SVG
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<g fill-rule="evenodd" fill="#000000">'
    ]
    
    # Добавляем все пути
    for curve in path:
        svg_lines.append(f'  <path d="{curve.path_string()}"/>')
    
    # Добавляем водяной знак BOOOMERANGS
    svg_lines.append(f'''  <text x="{width/2}" y="{height-20}" font-family="Arial" font-size="16" 
                        text-anchor="middle" fill="#FF4B2B" font-weight="bold">BOOOMERANGS</text>''')
    
    # Закрываем SVG
    svg_lines.append('</g>')
    svg_lines.append('</svg>')
    
    return '\n'.join(svg_lines)

def main():
    """Основная функция"""
    if len(sys.argv) != 2:
        print('Использование: python raster2svg.py <url_изображения>', file=sys.stderr)
        sys.exit(1)
    
    # Получаем URL изображения из параметров
    image_url = sys.argv[1]
    
    try:
        # Загружаем изображение
        image = download_image(image_url)
        
        # Конвертируем в SVG
        svg = convert_to_svg(image)
        
        # Выводим результат
        print(svg)
    except Exception as e:
        print(f'Ошибка при конвертации: {str(e)}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()