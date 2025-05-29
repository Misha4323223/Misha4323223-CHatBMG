#!/usr/bin/env python3
"""
Анализ провайдеров G4F: бесплатные vs платные
"""

import g4f
import inspect

def analyze_providers():
    """Анализирует все провайдеры G4F"""
    
    # Получаем все провайдеры
    provider_names = [name for name in dir(g4f.Provider) if not name.startswith('_') and name[0].isupper()]
    
    free_providers = []
    api_key_providers = []
    unknown_providers = []
    
    print(f"🔍 Анализируем {len(provider_names)} провайдеров G4F...\n")
    
    for name in provider_names:
        try:
            provider = getattr(g4f.Provider, name)
            
            # Проверяем наличие атрибутов, указывающих на необходимость API ключа
            needs_auth = False
            
            if hasattr(provider, 'needs_auth'):
                needs_auth = provider.needs_auth
            elif hasattr(provider, 'api_key'):
                needs_auth = True
            elif hasattr(provider, 'auth'):
                needs_auth = True
            elif hasattr(provider, 'headers') and provider.headers:
                # Проверяем заголовки на наличие Authorization
                headers_str = str(provider.headers).lower()
                if 'authorization' in headers_str or 'api-key' in headers_str:
                    needs_auth = True
            
            # Проверяем по названию провайдера
            name_lower = name.lower()
            if any(keyword in name_lower for keyword in ['api', 'account', 'pro']):
                needs_auth = True
            
            # Категоризируем провайдер
            if needs_auth:
                api_key_providers.append(name)
            else:
                # Дополнительная проверка на известные бесплатные провайдеры
                known_free = [
                    'freegpt', 'you', 'duckduckgo', 'ddg', 'huggingchat', 
                    'blackbox', 'liaobots', 'phind', 'gemini', 'geminipro'
                ]
                if any(free_name in name_lower for free_name in known_free):
                    free_providers.append(name)
                else:
                    unknown_providers.append(name)
                    
        except Exception as e:
            unknown_providers.append(f"{name} (ошибка: {str(e)[:50]})")
    
    # Выводим результаты
    print("🆓 БЕСПЛАТНЫЕ ПРОВАЙДЕРЫ:")
    for provider in sorted(free_providers):
        print(f"  ✅ {provider}")
    
    print(f"\n💰 ПЛАТНЫЕ/API ПРОВАЙДЕРЫ:")
    for provider in sorted(api_key_providers):
        print(f"  💳 {provider}")
    
    print(f"\n❓ НЕОПРЕДЕЛЕННЫЕ ПРОВАЙДЕРЫ:")
    for provider in sorted(unknown_providers):
        print(f"  🤔 {provider}")
    
    print(f"\n📊 СТАТИСТИКА:")
    print(f"  Всего провайдеров: {len(provider_names)}")
    print(f"  Бесплатных: {len(free_providers)}")
    print(f"  Платных: {len(api_key_providers)}")
    print(f"  Неопределенных: {len(unknown_providers)}")
    
    # Возвращаем список лучших бесплатных провайдеров
    best_free = [p for p in free_providers if any(
        keyword in p.lower() for keyword in ['freegpt', 'you', 'huggingchat', 'liaobots', 'blackbox']
    )]
    
    print(f"\n🎯 РЕКОМЕНДУЕМЫЕ БЕСПЛАТНЫЕ ПРОВАЙДЕРЫ:")
    for provider in best_free:
        print(f"  🔥 {provider}")
    
    return {
        'free': free_providers,
        'paid': api_key_providers,
        'unknown': unknown_providers,
        'best_free': best_free
    }

if __name__ == '__main__':
    results = analyze_providers()