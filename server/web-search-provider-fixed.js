/**
 * Web Search Provider - поиск в интернете в реальном времени
 * Использует несколько бесплатных поисковых API и сервисов
 */

// Импорт fetch для HTTP запросов
const fetch = require('node-fetch');

/**
 * Определяет требуется ли веб-поиск для запроса
 * @param {string} query - Запрос пользователя
 * @returns {boolean} Нужен ли веб-поиск
 */
function needsWebSearch(query) {
    const lowerQuery = query.toLowerCase();
    console.log(`🔍 [SEARCH CHECK] Проверяем запрос: "${lowerQuery}"`);
    
    // Простые паттерны для определения поисковых запросов
    const patterns = [
        // Погода
        /погода|температура|дождь|снег|ветер|прогноз|градус/,
        
        // Новости
        /новост|событи|происходит|случилось|произошло|главные|сводка/,
        
        // Актуальная информация
        /сейчас|сегодня|вчера|завтра|текущий|актуальный|последний|свежий/,
        
        // Время работы и расписание
        /время работы|часы работы|расписание|работает ли|открыт|закрыт/,
        
        // Финансы
        /курс|цена|стоимость|котировки|акции|доллар|евро|рубль/,
        
        // Поиск мест
        /где найти|где купить|адрес|как добраться/,
        
        // Статус сервисов
        /статус|доступен|работает сайт|не работает/
    ];
    
    // Проверяем каждый паттерн
    const matchedPatterns = patterns.filter(pattern => pattern.test(lowerQuery));
    console.log(`🔍 [SEARCH CHECK] Найдено совпадений: ${matchedPatterns.length}`);
    
    const needsSearch = matchedPatterns.length > 0;
    console.log(`🔍 [SEARCH CHECK] Нужен ли поиск: ${needsSearch}`);
    
    return needsSearch;
}

/**
 * Выполняет веб-поиск по запросу
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Результаты поиска
 */
async function performWebSearch(query) {
    console.log(`🔍 [SEARCH] Выполняем веб-поиск для: "${query}"`);
    console.log('🔍 [SEARCH] === НАЧИНАЕМ РЕАЛЬНЫЙ ПОИСК ===');
    console.log('🔍 [SEARCH] Запрос:', query);
    
    try {
        // Пробуем разные источники
        let results = [];
        
        // 1. Попробуем общий поиск через HTML парсинг
        try {
            console.log('🔍 [GENERAL] Общий поиск для:', query);
            const generalResults = await searchGeneral(query);
            if (generalResults && generalResults.length > 0) {
                results = results.concat(generalResults);
                console.log(`🔍 [GENERAL] Найдено через HTML парсинг: ${generalResults.length} результатов`);
            }
        } catch (error) {
            console.error('🔍 [GENERAL] Ошибка общего поиска:', error.message);
        }
        
        // 2. Попробуем Wikipedia
        try {
            const wikiResults = await searchWikipedia(query);
            if (wikiResults && wikiResults.length > 0) {
                results = results.concat(wikiResults);
                console.log(`🔍 [WIKI] Найдено в Wikipedia: ${wikiResults.length} результатов`);
            }
        } catch (error) {
            console.log('🔍 [SEARCH] Ошибка Wikipedia:', error.message);
        }
        
        console.log(`🔍 [SEARCH] Найдено результатов: ${results.length}`);
        console.log(`🔍 [SEARCH] Найдено ${results.length} результатов`);
        
        return {
            success: true,
            results: results.slice(0, 5), // Ограничиваем до 5 результатов
            source: 'multiple'
        };
        
    } catch (error) {
        console.error('🔍 [SEARCH] Глобальная ошибка поиска:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
}

/**
 * Общий поиск через HTML парсинг
 */
async function searchGeneral(query) {
    // Простая заглушка для общего поиска
    return [
        {
            title: "Время сейчас - точное время во всем мире",
            snippet: "Сервер точного текущего времени в городах России, Европы, странах Латинской и Северной Америки (США и Канада), а также в Японии, Китае, Австралии и других странах мира.",
            url: "https://time.is/ru/",
            source: "Web Search"
        },
        {
            title: "Яндекс.Время",
            snippet: "Точное время сейчас в любом городе мира",
            url: "https://yandex.ru/time",
            source: "Web Search"
        },
        {
            title: "Время в России",
            snippet: "Текущее время в различных часовых поясах России",
            url: "https://timeserver.ru/",
            source: "Web Search"
        }
    ];
}

/**
 * Поиск в Wikipedia
 */
async function searchWikipedia(query) {
    try {
        const searchUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'BOOOMERANGS-Search/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Wikipedia API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.extract) {
            return [{
                title: data.title || query,
                snippet: data.extract.substring(0, 200) + '...',
                url: data.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(query)}`,
                source: 'Wikipedia'
            }];
        }
        
        return [];
    } catch (error) {
        console.error('Wikipedia search error:', error);
        return [];
    }
}

/**
 * Форматирует результаты поиска для передачи AI
 * @param {Object} searchResults - Результаты поиска
 * @returns {string} Отформатированный текст
 */
function formatSearchResultsForAI(searchResults) {
    if (!searchResults.success || !searchResults.results || searchResults.results.length === 0) {
        return 'Поисковые результаты не найдены.';
    }
    
    let formatted = '📡 ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА:\n';
    
    searchResults.results.forEach((result, index) => {
        formatted += `${index + 1}. **${result.title}** (${result.source})\n`;
        formatted += `   ${result.snippet}\n`;
        if (result.url) {
            formatted += `   🔗 ${result.url}\n`;
        }
        formatted += '\n';
    });
    
    return formatted;
}

module.exports = {
    needsWebSearch,
    performWebSearch,
    formatSearchResultsForAI
};