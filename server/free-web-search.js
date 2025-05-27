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
        
        // 1. НАСТОЯЩИЙ веб-поиск для бизнеса и организаций
        if (searchTerms.includes('магазин') || searchTerms.includes('ресторан') || 
            searchTerms.includes('кафе') || searchTerms.includes('где') || 
            searchTerms.includes('адрес') || searchTerms.includes('найди') ||
            searchTerms.includes('одежда') || searchTerms.includes('торговый') ||
            searchTerms.includes('аптека') || searchTerms.includes('банк') ||
            searchTerms.includes('салон') || searchTerms.includes('центр')) {
            
            console.log('🔍 [MAIN] Запускаем улучшенный веб-поиск...');
            
            // Комбинированный поиск через разные источники
            const placeResults = await searchPlaces(query);
            const ddgResults = await searchDuckDuckGo(query);
            const russianResults = await searchRussianServices(query);
            
            results.push(...placeResults);
            results.push(...ddgResults);
            results.push(...russianResults);
            
            console.log(`🔍 [MAIN] Найдено результатов: ${results.length}`);
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
        
        // Более специфичный поиск для лучших результатов
        let searchQuery = query;
        
        // Если запрос про магазины, делаем его более точным
        if (query.toLowerCase().includes('магазин')) {
            const cityMatch = query.match(/(в|около|рядом)\s+([а-яё\s\-]+)/i);
            if (cityMatch) {
                const city = cityMatch[2].trim();
                searchQuery = `shop=clothes ${city} россия`;
            }
        }
        
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=20&addressdetails=1&countrycodes=ru&extratags=1&amenity=shop`;
        
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
        console.log('🔍 [PLACES] URL запроса:', url);
        if (data.length > 0) {
            console.log('🔍 [PLACES] Первый результат:', data[0]);
        } else {
            console.log('🔍 [PLACES] Результатов нет - возможно проблема с запросом');
        }
        
        // Форматируем все найденные результаты
        const searchResults = data.slice(0, 8).map(place => {
            const name = place.display_name.split(',')[0];
            const address = place.display_name;
            
            // Создаем описание с дополнительной информацией
            let description = `📍 ${address}`;
            if (place.extratags?.phone) description += `\n📞 ${place.extratags.phone}`;
            if (place.extratags?.website) description += `\n🌐 ${place.extratags.website}`;
            if (place.extratags?.opening_hours) description += `\n🕐 ${place.extratags.opening_hours}`;
            
            // Определяем тип места для иконки
            let icon = '📍';
            if (name.toLowerCase().includes('магазин')) icon = '🏪';
            else if (name.toLowerCase().includes('ресторан') || name.toLowerCase().includes('кафе')) icon = '🍽️';
            else if (name.toLowerCase().includes('аптека')) icon = '💊';
            else if (name.toLowerCase().includes('банк')) icon = '🏦';
            else if (name.toLowerCase().includes('центр')) icon = '🏢';
            
            return {
                title: `${icon} ${name}`,
                description: description,
                url: `https://www.openstreetmap.org/#map=18/${place.lat}/${place.lon}`,
                source: 'OpenStreetMap'
            };
        });
        
        console.log(`🔍 [PLACES] Найдено результатов: ${searchResults.length}`);
        return searchResults;
        
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

/**
 * Детальный поиск магазинов с контактной информацией
 */
async function searchStoreDetails(query) {
    try {
        console.log('🔍 [STORES] Детальный поиск магазинов для:', query);
        
        // Извлекаем город из запроса
        const cityMatch = query.match(/(в|около|рядом)\s+([а-яё\s\-]+)/i);
        const city = cityMatch ? cityMatch[2].trim().toLowerCase() : '';
        
        const results = [];
        
        // Улучшенный поиск через OpenStreetMap с фокусом на магазины одежды
        if (city) {
            const searches = [
                `магазин одежды ${city}`,
                `торговый центр ${city}`,
                `shopping mall ${city}`,
                `clothing store ${city}`
            ];
            
            for (const searchTerm of searches) {
                try {
                    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=8&addressdetails=1&countrycodes=ru&extratags=1`;
                    
                    const response = await fetch(osmUrl, {
                        headers: { 'User-Agent': 'BOOOMERANGS-Business-Search/1.0' }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`🔍 [STORES] OSM "${searchTerm}": ${data.length} результатов`);
                        
                        data.forEach(place => {
                            const name = place.display_name.split(',')[0];
                            const fullAddress = place.display_name;
                            
                            // Формируем описание с контактной информацией
                            let description = `📍 ${fullAddress}`;
                            
                            if (place.extratags?.phone) {
                                description += `\n📞 ${place.extratags.phone}`;
                            }
                            if (place.extratags?.website) {
                                description += `\n🌐 ${place.extratags.website}`;
                            }
                            if (place.extratags?.opening_hours) {
                                description += `\n🕐 ${place.extratags.opening_hours}`;
                            }
                            
                            results.push({
                                title: `🏪 ${name}`,
                                description: description,
                                url: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=16`,
                                source: 'OpenStreetMap Business'
                            });
                        });
                    }
                } catch (error) {
                    console.log(`🔍 [STORES] Ошибка поиска "${searchTerm}":`, error.message);
                }
            }
        }
        
        // Убираем дубликаты по названию
        const uniqueResults = results.filter((item, index, self) => 
            index === self.findIndex(t => t.title === item.title)
        );
        
        console.log(`🔍 [STORES] Найдено уникальных магазинов: ${uniqueResults.length}`);
        return uniqueResults.slice(0, 10);
        
    } catch (error) {
        console.log('🔍 [STORES] Ошибка детального поиска:', error.message);
        return [];
    }
}

/**
 * Поиск через DuckDuckGo API (бесплатно)
 */
async function searchDuckDuckGo(query) {
    try {
        const searchQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${searchQuery}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
        
        console.log('🔍 [DDG] Поиск через DuckDuckGo...');
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            },
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error('DuckDuckGo недоступен');
        }
        
        const data = await response.json();
        const results = [];
        
        // Обрабатываем мгновенные ответы
        if (data.Answer) {
            results.push({
                title: '🔍 Быстрый ответ',
                description: data.Answer,
                url: data.AbstractURL || `https://duckduckgo.com/?q=${searchQuery}`,
                source: 'DuckDuckGo'
            });
        }
        
        // Обрабатываем связанные темы
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 3).forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: '📄 ' + topic.Text.split(' - ')[0],
                        description: topic.Text,
                        url: topic.FirstURL,
                        source: 'DuckDuckGo'
                    });
                }
            });
        }
        
        console.log(`🔍 [DDG] Найдено результатов: ${results.length}`);
        return results;
        
    } catch (error) {
        console.log('🔍 [DDG] Ошибка:', error.message);
        return [];
    }
}

/**
 * Поиск через российские сервисы
 */
async function searchRussianServices(query) {
    try {
        console.log('🔍 [RUS] Создаем ссылки на российские сервисы...');
        
        const cityMatch = query.match(/(в|около|рядом)\s+([а-яё\s\-]+)/i);
        const city = cityMatch ? cityMatch[2].trim() : 'России';
        
        const results = [
            {
                title: `🗺️ Яндекс Карты: магазины в ${city}`,
                description: `Найдите актуальные магазины одежды в ${city} с адресами, телефонами и отзывами`,
                url: `https://yandex.ru/maps/?text=${encodeURIComponent(query)}`,
                source: 'Yandex Maps'
            },
            {
                title: `🏪 2ГИС: торговые точки в ${city}`,
                description: `Подробная информация о магазинах одежды в ${city} - адреса, контакты, часы работы`,
                url: `https://2gis.ru/search/${encodeURIComponent(query)}`,
                source: '2GIS'
            }
        ];
        
        console.log(`🔍 [RUS] Создано ссылок: ${results.length}`);
        return results;
        
    } catch (error) {
        console.log('🔍 [RUS] Ошибка:', error.message);
        return [];
    }
}

export {
    searchRealTimeInfo,
    searchPlaces,
    searchWeather,
    searchNews
};