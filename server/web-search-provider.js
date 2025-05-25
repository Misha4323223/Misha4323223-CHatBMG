/**
 * Web Search Provider - поиск в интернете в реальном времени
 * Использует несколько бесплатных поисковых API и сервисов
 */

// Импорт fetch для Node.js среды  
import fetch from 'node-fetch';

/**
 * Определяет требуется ли веб-поиск для запроса
 * @param {string} query - Запрос пользователя
 * @returns {boolean} Нужен ли веб-поиск
 */
function needsWebSearch(query) {
    const searchKeywords = [
        // Актуальная информация
        'сейчас', 'сегодня', 'вчера', 'завтра', 'текущий', 'актуальный', 'последний',
        'свежий', 'новый', 'недавний', 'современный',
        
        // Новости и события
        'новости', 'события', 'происходит', 'случилось', 'произошло',
        
        // Погода
        'погода', 'температура', 'дождь', 'снег', 'ветер', 'прогноз',
        
        // Финансы
        'курс', 'цена', 'стоимость', 'котировки', 'акции', 'доллар', 'евро', 'рубль',
        
        // Поиск мест и объектов
        'где найти', 'где купить', 'адрес', 'как добраться', 'расписание',
        'работает ли', 'открыт ли', 'закрыт ли', 'время работы',
        
        // Онлайн активность
        'статус', 'доступен ли', 'работает сайт', 'не работает'
    ];
    
    const lowerQuery = query.toLowerCase();
    return searchKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Поиск через DuckDuckGo Instant Answer API (бесплатный)
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска
 */
async function searchDuckDuckGo(query) {
    try {
        console.log('🔍 [SEARCH] === НАЧИНАЕМ DUCKDUCKGO ПОИСК ===');
        console.log('🔍 [SEARCH] Тип fetch:', typeof fetch);
        console.log('🔍 [SEARCH] Fetch объект:', fetch);
        
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
        console.log('🔍 [SEARCH] URL для запроса:', url);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            }
        });
        
        console.log('🔍 [SEARCH] Ответ получен, статус:', response.status);
        
        if (!response.ok) {
            throw new Error(`DuckDuckGo API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        let results = [];
        
        // Основной ответ
        if (data.Abstract) {
            results.push({
                title: data.Heading || 'Информация',
                snippet: data.Abstract,
                url: data.AbstractURL,
                source: 'DuckDuckGo'
            });
        }
        
        // Связанные темы
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, 3).forEach(topic => {
                if (topic.Text) {
                    results.push({
                        title: topic.FirstURL ? 'Связанная тема' : 'Информация',
                        snippet: topic.Text,
                        url: topic.FirstURL,
                        source: 'DuckDuckGo'
                    });
                }
            });
        }
        
        return {
            success: true,
            results: results,
            provider: 'DuckDuckGo'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка DuckDuckGo:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'DuckDuckGo'
        };
    }
}

/**
 * Поиск через публичный API Wikipedia
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска
 */
async function searchWikipedia(query) {
    try {
        // Поиск статей
        const searchUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            },
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`Wikipedia API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.extract) {
            return {
                success: true,
                results: [{
                    title: data.title,
                    snippet: data.extract,
                    url: data.content_urls?.desktop?.page,
                    source: 'Wikipedia'
                }],
                provider: 'Wikipedia'
            };
        }
        
        return {
            success: false,
            error: 'No results found',
            provider: 'Wikipedia'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка Wikipedia:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'Wikipedia'
        };
    }
}

/**
 * Поиск новостей через бесплатный новостной API
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска новостей
 */
async function searchNews(query) {
    try {
        // Используем бесплатный RSS конвертер для получения новостей
        const rssFeeds = [
            'https://lenta.ru/rss',
            'https://www.rbc.ru/rss/news'
        ];
        
        // Простая проверка RSS (базовая версия)
        for (const feedUrl of rssFeeds) {
            try {
                const response = await fetch(feedUrl, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'BOOOMERANGS-Search/1.0'
                    }
                });
                
                if (response.ok) {
                    return {
                        success: true,
                        results: [{
                            title: 'Актуальные новости',
                            snippet: 'Для получения актуальных новостей рекомендуем посетить новостные сайты напрямую.',
                            url: feedUrl,
                            source: 'News RSS'
                        }],
                        provider: 'News'
                    };
                }
            } catch (err) {
                continue;
            }
        }
        
        return {
            success: false,
            error: 'No news sources available',
            provider: 'News'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Ошибка News:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'News'
        };
    }
}

/**
 * Основная функция веб-поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<Object>} Результаты поиска
 */
async function performWebSearch(query, options = {}) {
    console.log(`🔍 [SEARCH] Выполняем веб-поиск для: "${query}"`);
    
    const searchProviders = [];
    
    // Определяем какие провайдеры использовать
    if (query.toLowerCase().includes('новости') || query.toLowerCase().includes('событи')) {
        searchProviders.push(() => searchNews(query));
    }
    
    // Всегда добавляем основные поисковики
    searchProviders.push(
        () => searchDuckDuckGo(query),
        () => searchWikipedia(query)
    );
    
    const allResults = [];
    
    // Выполняем поиск параллельно
    const searchPromises = searchProviders.map(async (searchFunc) => {
        try {
            const result = await searchFunc();
            if (result.success && result.results.length > 0) {
                allResults.push(...result.results);
            }
            return result;
        } catch (error) {
            console.error('🔍 [SEARCH] Ошибка поисковика:', error);
            return { success: false, error: error.message };
        }
    });
    
    await Promise.allSettled(searchPromises);
    
    if (allResults.length === 0) {
        return {
            success: false,
            message: 'Не удалось найти информацию в интернете',
            results: []
        };
    }
    
    console.log(`🔍 [SEARCH] Найдено ${allResults.length} результатов`);
    
    return {
        success: true,
        results: allResults.slice(0, 5), // Ограничиваем до 5 результатов
        searchQuery: query
    };
}

/**
 * Форматирует результаты поиска для AI
 * @param {Object} searchResults - Результаты поиска
 * @returns {string} Отформатированный текст для AI
 */
function formatSearchResultsForAI(searchResults) {
    if (!searchResults.success || searchResults.results.length === 0) {
        return '';
    }
    
    let formatted = '\n📡 ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА:\n';
    
    searchResults.results.forEach((result, index) => {
        formatted += `\n${index + 1}. **${result.title}** (${result.source})\n`;
        formatted += `   ${result.snippet}\n`;
        if (result.url) {
            formatted += `   🔗 ${result.url}\n`;
        }
    });
    
    formatted += '\nИспользуйте эту актуальную информацию для ответа пользователю.\n';
    
    return formatted;
}

module.exports = {
    needsWebSearch,
    performWebSearch,
    formatSearchResultsForAI,
    searchDuckDuckGo,
    searchWikipedia,
    searchNews
};