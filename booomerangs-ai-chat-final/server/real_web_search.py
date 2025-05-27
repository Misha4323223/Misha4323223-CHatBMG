#!/usr/bin/env python3
"""
Мощный поисковик в интернете с реальными данными
Находит актуальную информацию из разных источников
"""

from duckduckgo_search import DDGS
import json
import sys
import requests
from urllib.parse import quote

def search_duckduckgo(query, max_results=5):
    """Поиск через DuckDuckGo с реальными результатами"""
    try:
        print(f"🔍 [DDG] Ищем: {query}", file=sys.stderr)
        
        results = []
        with DDGS() as ddgs:
            # Поиск текстовых результатов
            search_results = list(ddgs.text(query, max_results=max_results))
            
            for result in search_results:
                results.append({
                    'title': result.get('title', 'Без названия'),
                    'description': result.get('body', 'Описание недоступно'),
                    'url': result.get('href', ''),
                    'source': 'DuckDuckGo'
                })
                
        print(f"🔍 [DDG] Найдено результатов: {len(results)}", file=sys.stderr)
        return results
        
    except Exception as e:
        print(f"🚨 [DDG] Ошибка: {e}", file=sys.stderr)
        return []

def search_weather(city):
    """Поиск погоды через wttr.in"""
    try:
        print(f"🌤️ [WEATHER] Ищем погоду для: {city}", file=sys.stderr)
        
        url = f"https://wttr.in/{quote(city)}?format=j1"
        response = requests.get(url, timeout=10)
        
        if response.ok:
            data = response.json()
            current = data['current_condition'][0]
            today = data['weather'][0]
            
            weather_info = {
                'title': f'🌤️ Погода в {city}',
                'description': f"Сейчас: {current['temp_C']}°C, {current['weatherDesc'][0]['value']}. Макс: {today['maxtempC']}°C, мин: {today['mintempC']}°C. Влажность: {current['humidity']}%, ветер: {current['windspeedKmph']} км/ч",
                'temperature': f"{current['temp_C']}°C",
                'weather_condition': current['weatherDesc'][0]['value'],
                'humidity': f"{current['humidity']}%",
                'wind': f"{current['windspeedKmph']} км/ч",
                'max_temp': f"{today['maxtempC']}°C",
                'min_temp': f"{today['mintempC']}°C",
                'source': 'wttr.in'
            }
            
            print(f"🌤️ [WEATHER] Успешно получена погода для {city}", file=sys.stderr)
            return [weather_info]
            
    except Exception as e:
        print(f"🚨 [WEATHER] Ошибка: {e}", file=sys.stderr)
        
    return []

def search_internet(query):
    """Главная функция поиска в интернете"""
    print(f"🔍 [SEARCH] Начинаем поиск: {query}", file=sys.stderr)
    
    all_results = []
    
    # Проверяем, нужна ли погода
    query_lower = query.lower()
    if any(word in query_lower for word in ['погода', 'температура', 'weather']):
        # Извлекаем город из запроса
        import re
        city_match = re.search(r'в\s+([а-яё\w]+)', query_lower)
        city = city_match.group(1) if city_match else 'Москва'
        
        weather_results = search_weather(city)
        all_results.extend(weather_results)
    
    # Основной поиск через DuckDuckGo
    ddg_results = search_duckduckgo(query)
    all_results.extend(ddg_results)
    
    print(f"🔍 [SEARCH] Всего найдено: {len(all_results)} результатов", file=sys.stderr)
    
    return {
        'success': len(all_results) > 0,
        'results': all_results,
        'query': query,
        'total': len(all_results)
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Нужен поисковый запрос'}))
        sys.exit(1)
    
    query = ' '.join(sys.argv[1:])
    result = search_internet(query)
    print(json.dumps(result, ensure_ascii=False, indent=2))