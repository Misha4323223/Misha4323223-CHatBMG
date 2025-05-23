// BOOOMERANGS Smart Chat - Service Worker для кэширования

const CACHE_NAME = 'booomerangs-chat-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Ресурсы для кэширования
const STATIC_ASSETS = [
    '/',
    '/booomerangs-optimized-chat.html',
    '/client/src/components/chat-styles.css',
    '/client/src/components/chat-core.js',
    '/client/src/components/chat-ui.js'
];

// Установка Service Worker
self.addEventListener('install', event => {
    console.log('📦 Service Worker устанавливается...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('💾 Кэширование статических ресурсов');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker установлен');
                return self.skipWaiting();
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker активируется...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Удаление старого кэша:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker активирован');
                return self.clients.claim();
            })
    );
});

// Обработка запросов
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Стратегия кэширования для статических ресурсов
    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Стратегия для API запросов
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Стратегия по умолчанию
    event.respondWith(networkFirst(request));
});

// Стратегия "Cache First" для статических ресурсов
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Ошибка в cacheFirst:', error);
        return new Response('Ресурс недоступен', { status: 503 });
    }
}

// Стратегия "Network First" для динамических данных
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200 && request.method === 'GET') {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Сеть недоступна, проверяем кэш...');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response('Данные недоступны', { 
            status: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Нет соединения с сервером' })
        });
    }
}

// Очистка старых записей кэша
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});