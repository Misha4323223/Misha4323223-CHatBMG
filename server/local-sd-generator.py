#!/usr/bin/env python3
"""
Упрощенный локальный генератор изображений
Использует установленные зависимости PyTorch и Gradio
"""

import sys
import os
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import json
from flask import Flask, request, jsonify
import io
import base64

app = Flask(__name__)

def create_simple_image(prompt, width=512, height=512):
    """
    Создает простое изображение с текстом промпта
    Заглушка для полноценной генерации
    """
    # Создаем изображение с градиентом
    img = Image.new('RGB', (width, height), color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Добавляем градиент
    for y in range(height):
        color_value = int(135 + (120 * y / height))  # От светло-голубого к темно-синему
        draw.line([(0, y), (width, y)], fill=(color_value, color_value, 255))
    
    # Добавляем текст
    try:
        # Пытаемся загрузить системный шрифт
        font = ImageFont.load_default()
    except:
        font = None
    
    # Разбиваем текст на строки
    words = prompt.split()
    lines = []
    current_line = ""
    
    for word in words:
        if len(current_line + " " + word) < 30:  # Максимум 30 символов в строке
            current_line += " " + word if current_line else word
        else:
            lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    # Рисуем текст по центру
    y_offset = height // 2 - (len(lines) * 20) // 2
    
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (width - text_width) // 2
        y = y_offset + i * 25
        
        # Тень
        draw.text((x+1, y+1), line, font=font, fill=(0, 0, 0))
        # Основной текст
        draw.text((x, y), line, font=font, fill=(255, 255, 255))
    
    return img

@app.route('/generate', methods=['POST'])
def generate_image():
    """
    Эндпоинт для генерации изображений
    """
    try:
        data = request.json
        prompt = data.get('prompt', 'Test image')
        width = data.get('width', 512)
        height = data.get('height', 512)
        
        print(f"Генерируем изображение: {prompt}")
        
        # Создаем изображение
        img = create_simple_image(prompt, width, height)
        
        # Конвертируем в base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image_base64': img_str,
            'format': 'png',
            'width': width,
            'height': height
        })
        
    except Exception as e:
        print(f"Ошибка генерации: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    """
    Проверка статуса генератора
    """
    return jsonify({
        'status': 'ready',
        'pytorch_version': torch.__version__,
        'device': 'cpu',
        'message': 'Локальный генератор готов'
    })

if __name__ == '__main__':
    print("🚀 Запуск локального генератора изображений...")
    print(f"PyTorch версия: {torch.__version__}")
    print("🌐 Сервер будет доступен на http://localhost:7861")
    
    app.run(host='0.0.0.0', port=7861, debug=False)