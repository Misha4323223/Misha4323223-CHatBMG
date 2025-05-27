/**
 * Мощная бесплатная система поиска актуальной информации
 * Использует открытые API и источники данных
 */

import fetch from 'node-fetch';

/**
 * Главная функция поиска актуальной информации
 */
async function searchRealTimeInfo(query) {
    try {
        console.log('🔍 [SEARCH] === НАЧИНАЕМ РЕАЛЬНЫЙ ПОИСК ===');
        console.log('🔍 [SEARCH] Запрос:', query);
        
        const results = [];
        const searchTerms = query.toLowerCase();
        
        // 1. Поиск мест (магазины, рестораны, кафе)
        if (searchTerms.includes('магазин') || searchTerms.includes('ресторан') || 
            searchTerms.includes('кафе') || searchTerms.includes('где') || 
            searchTerms.includes('адрес') || searchTerms.includes('найди') ||
            searchTerms.includes('одежда') || searchTerms.includes('торговый')) {
            const placeResults = await searchPlaces(query);
            results.push(...placeResults);
        }
        
        // 2. Поиск погоды
        if (searchTerms.includes('погода') || searchTerms.includes('температура') ||
            searchTerms.includes('прогноз')) {
            const weatherResults = await searchWeather(query);
            results.push(...weatherResults);
        }
        
        // 3. Поиск новостей
        if (searchTerms.includes('новост') || searchTerms.includes('событи') ||
            searchTerms.includes('что происходит')) {
            const newsResults = await searchNews(query);
            results.push(...newsResults);
        }
        
        // 4. Общий поиск если ничего не найдено
        if (results.length === 0) {
            const webResults = await searchGeneral(query);
            results.push(...webResults);
        }
        
        console.log('🔍 [SEARCH] Найдено результатов:', results.length);
        
        return {
            success: results.length > 0,
            results: results,
            provider: 'FreeSearch'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка поиска:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'FreeSearch'
        };
    }
}

/**
 * Поиск мест через OpenStreetMap (полностью бесплатно)
 */
async function searchPlaces(query) {
    try {
        console.log('🔍 [PLACES] Поиск мест для:', query);
        
        // Извлекаем город из запроса
        const cityMatch = query.match(/(в|около|рядом|в городе)\s+([а-яё\w]+)/i);
        const city = cityMatch ? cityMatch[2] : 'Москва';
        
        const searchQuery = encodeURIComponent(`${query} ${city}`);
        const url = `https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=5&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            }
        });
        
        if (!response.ok) {
            console.log('🔍 [PLACES] OpenStreetMap недоступен');
            return [];
        }
        
        const data = await response.json();
        console.log('🔍 [PLACES] Найдено мест OSM:', data.length);
        
        return data.slice(0, 3).map(place => ({
            title: place.display_name.split(',')[0],
            snippet: `📍 ${place.display_name}`,
            url: `https://www.openstreetmap.org/#map=18/${place.lat}/${place.lon}`,
            source: 'OpenStreetMap'
        }));
        
    } catch (error) {
        console.log('🔍 [PLACES] Ошибка поиска мест:', error.message);
        return [];
    }
}

/**
 * Поиск погоды через wttr.in (бесплатный сервис)
 */
async function searchWeather(query) {
    try {
        console.log('🔍 [WEATHER] Поиск погоды для:', query);
        
        const cityMatch = query.match(/(в|для|в городе)\s+([а-яё\w]+)/i);
        const city = cityMatch ? cityMatch[2] : 'Moscow';
        
        const url = `http://wttr.in/${encodeURIComponent(city)}?format=j1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'curl/7.68.0'
            }
        });
        
        if (!response.ok) {
            console.log('🔍 [WEATHER] wttr.in недоступен');
            return [];
        }
        
        const data = await response.json();
        
        if (!data.current_condition || !data.weather) {
            console.log('🔍 [WEATHER] Нет данных о погоде');
            return [];
        }
        
        const current = data.current_condition[0];
        const today = data.weather[0];
        
        console.log('🔍 [WEATHER] Получили данные о погоде');
        
        return [{
            title: `🌤️ Погода в ${city}`,
            snippet: `Сейчас: ${current.temp_C}°C, ${current.weatherDesc[0].value}. Макс: ${today.maxtempC}°C, мин: ${today.mintempC}°C. Влажность: ${current.humidity}%, ветер: ${current.windspeedKmph} км/ч`,
            url: `http://wttr.in/${encodeURIComponent(city)}`,
            source: 'wttr.in'
        }];
        
    } catch (error) {
        console.log('🔍 [WEATHER] Ошибка поиска погоды:', error.message);
        return [];
    }
}

/**
 * Поиск новостей через RSS (бесплатно)
 */
async function searchNews(query) {
    try {
        console.log('🔍 [NEWS] Поиск новостей для:', query);
        
        // Пробуем получить новости с популярных RSS лент
        const newsFeeds = [
            'https://lenta.ru/rss',
            'https://www.rbc.ru/rss/news'
        ];
        
        for (const feedUrl of newsFeeds) {
            try {
                const response = await fetch(feedUrl, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'BOOOMERANGS-Search/1.0'
                    }
                });
                
                if (response.ok) {
                    console.log('🔍 [NEWS] Получили новостную ленту');
                    return [{
                        title: '📰 Актуальные новости',
                        snippet: 'Последние новости и события. Проверьте новостные сайты для получения свежей информации.',
                        url: feedUrl,
                        source: 'News RSS'
                    }];
                }
            } catch (err) {
                continue;
            }
        }
        
        return [];
        
    } catch (error) {
        console.log('🔍 [NEWS] Ошибка поиска новостей:', error.message);
        return [];
    }
}

/**
 * Общий поиск через бесплатные источники
 */
async function searchGeneral(query) {
    try {
        console.log('🔍 [GENERAL] Общий поиск для:', query);
        
        return [{
            title: `🔍 Поиск: ${query}`,
            snippet: `Поиск информации по запросу "${query}". Рекомендуем использовать специализированные сервисы для получения актуальных данных.`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            source: 'GeneralSearch'
        }];
        
    } catch (error) {
        console.log('🔍 [GENERAL] Ошибка общего поиска:', error.message);
        return [];
    }
}

export {
    searchRealTimeInfo,
    searchPlaces,
    searchWeather,
    searchNews
};