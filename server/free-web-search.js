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
            searchTerms.includes('адрес')) {
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
        
        // Улучшенное извлечение города из запроса
        let city = 'Moscow';
        
        // Ищем паттерны: "в городе", "в районе", просто "в ..."
        const cityMatch1 = query.match(/в\s+([а-яё]+(?:\s+[а-яё]+)*)/i);
        const cityMatch2 = query.match(/для\s+([а-яё]+(?:\s+[а-яё]+)*)/i);
        const cityMatch3 = query.match(/погода\s+([а-яё]+(?:\s+[а-яё]+)*)/i);
        
        if (cityMatch1) city = cityMatch1[1].trim();
        else if (cityMatch2) city = cityMatch2[1].trim();
        else if (cityMatch3) city = cityMatch3[1].trim();
        
        console.log('🔍 [WEATHER] Определен город:', city);
        
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
                    const xmlText = await response.text();
                    console.log('🔍 [NEWS] Получили RSS данные, размер:', xmlText.length);
                    
                    // Парсим заголовки новостей
                    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
                    const altTitleRegex = /<title>(.*?)<\/title>/g;
                    
                    let matches = [];
                    let match;
                    
                    while ((match = titleRegex.exec(xmlText)) !== null) {
                        matches.push(match[1]);
                    }
                    
                    if (matches.length === 0) {
                        while ((match = altTitleRegex.exec(xmlText)) !== null) {
                            matches.push(match[1]);
                        }
                    }
                    
                    console.log('🔍 [NEWS] Найдено заголовков:', matches.length);
                    
                    if (matches.length > 1) {
                        const news = [];
                        for (let i = 1; i < Math.min(4, matches.length); i++) {
                            const title = matches[i].trim();
                            if (title && title.length > 10) {
                                news.push({
                                    title: title,
                                    snippet: `Актуальная новость от ${new Date().toLocaleDateString('ru-RU')}`,
                                    url: feedUrl,
                                    source: 'RSS News'
                                });
                            }
                        }
                        
                        if (news.length > 0) {
                            console.log('🔍 [NEWS] Возвращаем', news.length, 'новостей');
                            return news;
                        }
                    }
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
        
        // Пробуем DuckDuckGo Instant Answer API (бесплатный)
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            
            const response = await fetch(ddgUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'BOOOMERANGS-Search/1.0'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const results = [];
                
                // Добавляем абстракт если есть
                if (data.Abstract && data.Abstract.length > 20) {
                    results.push({
                        title: data.Heading || query,
                        snippet: data.Abstract,
                        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                        source: 'DuckDuckGo'
                    });
                }
                
                // Добавляем связанные темы
                if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                    for (let i = 0; i < Math.min(2, data.RelatedTopics.length); i++) {
                        const topic = data.RelatedTopics[i];
                        if (topic.Text && topic.Text.length > 20) {
                            results.push({
                                title: topic.Text.split(' - ')[0] || 'Связанная информация',
                                snippet: topic.Text,
                                url: topic.FirstURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                                source: 'DuckDuckGo Related'
                            });
                        }
                    }
                }
                
                if (results.length > 0) {
                    console.log('🔍 [GENERAL] Найдено через DuckDuckGo:', results.length, 'результатов');
                    return results;
                }
            }
        } catch (ddgError) {
            console.log('🔍 [GENERAL] DuckDuckGo недоступен:', ddgError.message);
        }
        
        // Fallback - возвращаем информативный результат
        return [{
            title: `Поиск: ${query}`,
            snippet: `Информация по запросу "${query}" может быть найдена через поисковые системы. Проверьте актуальные источники для получения свежих данных.`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            source: 'Search Suggestion'
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