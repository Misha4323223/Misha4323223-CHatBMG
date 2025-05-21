/**
 * DeepSpeek провайдер - специализированный AI для технических вопросов
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Кэш для хранения часто задаваемых технических вопросов и ответов
// Используем Map для быстрого доступа по ключу
const technicalResponseCache = new Map();

/**
 * Генерирует уникальный ключ для кэширования запроса
 * @param {string} query - Текст запроса
 * @returns {string} - Уникальный ключ для кэша
 */
function generateCacheKey(query) {
  // Нормализуем запрос: приводим к нижнему регистру, удаляем лишние пробелы
  return query.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Проверяет, есть ли кэшированный ответ для запроса
 * @param {string} query - Текст запроса
 * @returns {Object|null} - Кэшированный ответ или null
 */
function getCachedResponse(query) {
  const cacheKey = generateCacheKey(query);
  
  // Проверяем кэш на точное совпадение
  if (technicalResponseCache.has(cacheKey)) {
    console.log(`DeepSpeek: Найден кэшированный ответ для запроса "${query.substring(0, 30)}..."`);
    return technicalResponseCache.get(cacheKey);
  }
  
  // Проверяем на частичное совпадение для похожих вопросов
  // Например, "как работают react хуки" и "расскажи про react хуки" должны дать похожий ответ
  for (const [key, value] of technicalResponseCache.entries()) {
    // Если в кэше есть ключ, который содержит все значимые слова из запроса
    const queryWords = cacheKey.split(' ').filter(word => word.length > 3);
    const isMatch = queryWords.every(word => key.includes(word));
    
    if (isMatch) {
      console.log(`DeepSpeek: Найден похожий кэшированный ответ для "${query.substring(0, 30)}..."`);
      return value;
    }
  }
  
  return null;
}

/**
 * Сохраняет ответ в кэш для последующего использования
 * @param {string} query - Текст запроса
 * @param {Object} response - Ответ для кэширования
 */
function cacheResponse(query, response) {
  // Кэшируем только успешные ответы
  if (response && response.success && response.response) {
    const cacheKey = generateCacheKey(query);
    console.log(`DeepSpeek: Кэширование ответа для "${query.substring(0, 30)}..."`);
    technicalResponseCache.set(cacheKey, response);
    
    // Ограничиваем размер кэша (максимум 100 записей)
    if (technicalResponseCache.size > 100) {
      const oldestKey = technicalResponseCache.keys().next().value;
      technicalResponseCache.delete(oldestKey);
    }
  }
}

// Технические домены для определения запросов
const techDomains = [
  // Языки программирования
  "javascript", "typescript", "js", "ts", "python", "java", "c++", "c#", "csharp", "php", 
  "ruby", "rust", "go", "golang", "swift", "kotlin", "scala", "perl", "bash", "powershell",
  
  // Технологии и фреймворки
  "react", "angular", "vue", "node", "express", "django", "flask", "spring", "asp.net",
  "laravel", "wordpress", "bootstrap", "tailwind", "jquery", "redux", "graphql", "rest", "api",
  
  // Структуры данных и алгоритмы
  "алгоритм", "algorithm", "структур", "structure", "сортировк", "sorting", "поиск", "search",
  "хеш", "hash", "дерев", "tree", "граф", "graph", "список", "list", "массив", "array",
  "очередь", "queue", "стек", "stack", "бинарн", "binary", "рекурси", "recursion",
  
  // Общие технические термины
  "код", "code", "programming", "программирован", "разработк", "development", "debug", "отладк",
  "функци", "function", "класс", "class", "метод", "method", "переменн", "variable",
  "наследован", "inheritance", "интерфейс", "interface", "асинхрон", "async", "промис", "promise",
  
  // Базы данных
  "sql", "nosql", "mysql", "postgresql", "mongodb", "sqlite", "oracle", "база данных", "database",
  "запрос", "query", "таблиц", "table", "join", "индекс", "index", "транзакци", "transaction",
  
  // DevOps и инфраструктура
  "docker", "kubernetes", "k8s", "git", "ci/cd", "pipeline", "aws", "azure", "облак", "cloud",
  "сервер", "server", "контейнер", "container", "виртуализац", "virtualization", "микросервис", "microservice",
  
  // Frontend и backend
  "frontend", "backend", "fullstack", "верстк", "интерфейс", "ui", "ux", "сайт", "website"
];

// Уровни сложности технических вопросов
const expertLevels = {
  basic: ['как', 'начать', 'основы', 'базов', 'простой', 'легкий', 'beginner', 'starter', 'basic'],
  intermediate: ['улучшить', 'оптимизир', 'продвинут', 'intermediate', 'improve', 'optimize'],
  advanced: ['сложн', 'advanced', 'complex', 'high level', 'expert', 'оптимальн', 'производительн', 'performance']
};

/**
 * Функция для определения технических запросов
 * @param {string} query - Запрос пользователя
 * @returns {boolean} - Является ли запрос техническим
 */
function isTechnicalQuery(query) {
  return techDomains.some(domain => query.toLowerCase().includes(domain));
}

/**
 * Определяет уровень технической сложности вопроса
 * @param {string} query - Текст запроса пользователя
 * @returns {string} - Уровень сложности: 'basic', 'intermediate', 'advanced' или 'general'
 */
function determineExpertLevel(query) {
  const lowerQuery = query.toLowerCase();
  
  // Проверяем на продвинутый уровень (приоритет выше)
  if (expertLevels.advanced.some(term => lowerQuery.includes(term))) {
    return 'advanced';
  }
  
  // Проверяем на средний уровень 
  if (expertLevels.intermediate.some(term => lowerQuery.includes(term))) {
    return 'intermediate';
  }
  
  // Проверяем на базовый уровень
  if (expertLevels.basic.some(term => lowerQuery.includes(term))) {
    return 'basic';
  }
  
  // По умолчанию - обычный технический вопрос
  return 'general';
}

// Функция для генерации технических ответов
function generateTechnicalResponse(query) {
  // Определяем тип запроса
  const queryLower = query.toLowerCase();
  
  // Алгоритм быстрой сортировки (QuickSort)
  if (queryLower.includes('быстр') && queryLower.includes('сортировк') && queryLower.includes('javascript')) {
    return `# Алгоритм быстрой сортировки (QuickSort) на JavaScript

Вот полная реализация алгоритма быстрой сортировки с комментариями:

\`\`\`javascript
/**
 * Алгоритм быстрой сортировки (QuickSort)
 * Сложность: O(n log n) в среднем случае, O(n²) в худшем
 * @param {Array} arr - Массив для сортировки
 * @returns {Array} - Отсортированный массив
 */
function quickSort(arr) {
  // Базовый случай: массивы с 0 или 1 элементом уже отсортированы
  if (arr.length <= 1) {
    return arr;
  }
  
  // Выбираем опорный элемент (pivot)
  // Можно выбрать первый, последний, средний или случайный элемент
  // Здесь для простоты берем средний элемент массива
  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr[pivotIndex];
  
  // Создаем массивы для элементов меньше, равных и больше опорного
  const less = [];    // элементы меньше опорного
  const equal = [];   // элементы равные опорному
  const greater = []; // элементы больше опорного
  
  // Распределяем элементы по соответствующим массивам
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < pivot) {
      less.push(arr[i]);
    } else if (arr[i] > pivot) {
      greater.push(arr[i]);
    } else {
      equal.push(arr[i]);
    }
  }
  
  // Рекурсивно сортируем подмассивы и объединяем результат
  // Формат: [...отсортированные_меньшие, ...равные_опорному, ...отсортированные_большие]
  return [...quickSort(less), ...equal, ...quickSort(greater)];
}

// Пример использования
const unsortedArray = [3, 6, 8, 10, 1, 2, 1, 5, 7, 9];
const sortedArray = quickSort(unsortedArray);
console.log(sortedArray); // [1, 1, 2, 3, 5, 6, 7, 8, 9, 10]
\`\`\`

## Оптимизации алгоритма

1. **Выбор опорного элемента**: В данной реализации мы выбираем средний элемент, но можно использовать:
   - Медиану из трех (первый, средний, последний)
   - Случайный элемент
   - Алгоритм "медиана медиан" для гарантии хорошего разделения

2. **In-place сортировка**: Можно оптимизировать использование памяти, сортируя массив "на месте":

\`\`\`javascript
function quickSortInPlace(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    const pivotIndex = partition(arr, left, right);
    quickSortInPlace(arr, left, pivotIndex - 1);
    quickSortInPlace(arr, pivotIndex + 1, right);
  }
  return arr;
}

function partition(arr, left, right) {
  // Используем последний элемент как опорный
  const pivot = arr[right];
  let i = left - 1;
  
  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]]; // Обмен элементов
    }
  }
  
  [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]]; // Помещаем опорный элемент в правильную позицию
  return i + 1; // Возвращаем индекс опорного элемента
}
\`\`\`

3. **Оптимизация для маленьких массивов**: Для массивов размером менее 10-20 элементов более эффективно использовать сортировку вставками:

\`\`\`javascript
function hybridQuickSort(arr, left = 0, right = arr.length - 1) {
  // Для маленьких массивов используем сортировку вставками
  if (right - left < 10) {
    insertionSort(arr, left, right);
    return arr;
  }
  
  // Для больших массивов используем быструю сортировку
  if (left < right) {
    const pivotIndex = partition(arr, left, right);
    hybridQuickSort(arr, left, pivotIndex - 1);
    hybridQuickSort(arr, pivotIndex + 1, right);
  }
  
  return arr;
}

function insertionSort(arr, left, right) {
  for (let i = left + 1; i <= right; i++) {
    const key = arr[i];
    let j = i - 1;
    
    while (j >= left && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    
    arr[j + 1] = key;
  }
  
  return arr;
}
\`\`\`

Быстрая сортировка является одним из самых эффективных алгоритмов сортировки и широко используется в различных языках программирования.`;
  }
  
  // Двусвязный список на JavaScript
  if (queryLower.includes('двусвязн') && queryLower.includes('список') && queryLower.includes('javascript')) {
    return `# Реализация двусвязного списка на JavaScript

Двусвязный список - это структура данных, где каждый узел содержит данные и ссылки на предыдущий и следующий узлы.

\`\`\`javascript
/**
 * Класс узла двусвязного списка
 */
class Node {
  constructor(value) {
    this.value = value;     // Значение узла
    this.next = null;       // Ссылка на следующий узел
    this.prev = null;       // Ссылка на предыдущий узел
  }
}

/**
 * Класс двусвязного списка
 */
class DoublyLinkedList {
  constructor() {
    this.head = null;       // Указатель на начало списка
    this.tail = null;       // Указатель на конец списка
    this.length = 0;        // Длина списка
  }
  
  /**
   * Добавление элемента в конец списка
   * @param {any} value - Значение для добавления
   * @return {DoublyLinkedList} - Возвращает список для цепочки вызовов
   */
  append(value) {
    const newNode = new Node(value);
    
    // Если список пуст
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      // Связываем новый узел с текущим хвостом
      newNode.prev = this.tail;
      this.tail.next = newNode;
      // Обновляем хвост
      this.tail = newNode;
    }
    
    this.length++;
    return this;
  }
  
  /**
   * Добавление элемента в начало списка
   * @param {any} value - Значение для добавления
   * @return {DoublyLinkedList} - Возвращает список для цепочки вызовов
   */
  prepend(value) {
    const newNode = new Node(value);
    
    // Если список пуст
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      // Связываем новый узел с текущей головой
      newNode.next = this.head;
      this.head.prev = newNode;
      // Обновляем голову
      this.head = newNode;
    }
    
    this.length++;
    return this;
  }
  
  /**
   * Вставка элемента по индексу
   * @param {number} index - Индекс для вставки
   * @param {any} value - Значение для вставки
   * @return {DoublyLinkedList|boolean} - Возвращает список или false при ошибке
   */
  insert(index, value) {
    // Проверяем индекс
    if (index < 0 || index > this.length) {
      return false;
    }
    
    // Вставка в начало списка
    if (index === 0) {
      return this.prepend(value);
    }
    
    // Вставка в конец списка
    if (index === this.length) {
      return this.append(value);
    }
    
    // Создаем новый узел
    const newNode = new Node(value);
    
    // Находим узел по индексу
    let current = this.head;
    for (let i = 0; i < index - 1; i++) {
      current = current.next;
    }
    
    // Вставляем новый узел между current и current.next
    newNode.next = current.next;
    newNode.prev = current;
    current.next.prev = newNode;
    current.next = newNode;
    
    this.length++;
    return this;
  }
  
  /**
   * Удаление элемента по индексу
   * @param {number} index - Индекс для удаления
   * @return {Node|null} - Удаленный узел или null при ошибке
   */
  remove(index) {
    // Проверяем индекс
    if (index < 0 || index >= this.length || !this.head) {
      return null;
    }
    
    let removedNode;
    
    // Удаление первого элемента
    if (index === 0) {
      removedNode = this.head;
      
      if (this.length === 1) {
        this.head = null;
        this.tail = null;
      } else {
        this.head = this.head.next;
        this.head.prev = null;
      }
    }
    // Удаление последнего элемента
    else if (index === this.length - 1) {
      removedNode = this.tail;
      this.tail = this.tail.prev;
      this.tail.next = null;
    }
    // Удаление элемента в середине
    else {
      let current = this.head;
      
      // Находим узел по индексу
      for (let i = 0; i < index; i++) {
        current = current.next;
      }
      
      removedNode = current;
      current.prev.next = current.next;
      current.next.prev = current.prev;
    }
    
    this.length--;
    return removedNode;
  }
  
  /**
   * Получение узла по индексу
   * @param {number} index - Индекс узла
   * @return {Node|null} - Найденный узел или null
   */
  getNodeAt(index) {
    if (index < 0 || index >= this.length || !this.head) {
      return null;
    }
    
    let current;
    
    // Оптимизация: если индекс ближе к началу, идем с начала
    if (index < this.length / 2) {
      current = this.head;
      for (let i = 0; i < index; i++) {
        current = current.next;
      }
    }
    // Если индекс ближе к концу, идем с конца
    else {
      current = this.tail;
      for (let i = this.length - 1; i > index; i--) {
        current = current.prev;
      }
    }
    
    return current;
  }
  
  /**
   * Получение значения узла по индексу
   * @param {number} index - Индекс узла
   * @return {any|null} - Значение или null
   */
  get(index) {
    const node = this.getNodeAt(index);
    return node ? node.value : null;
  }
  
  /**
   * Изменение значения узла по индексу
   * @param {number} index - Индекс узла
   * @param {any} value - Новое значение
   * @return {boolean} - Успешно или нет
   */
  set(index, value) {
    const node = this.getNodeAt(index);
    if (node) {
      node.value = value;
      return true;
    }
    return false;
  }
  
  /**
   * Получение списка в виде массива
   * @return {Array} - Массив значений
   */
  toArray() {
    const array = [];
    let current = this.head;
    
    while (current) {
      array.push(current.value);
      current = current.next;
    }
    
    return array;
  }
  
  /**
   * Очистка списка
   */
  clear() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  
  /**
   * Итератор для использования в for...of
   */
  *[Symbol.iterator]() {
    let current = this.head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}

// Пример использования
const list = new DoublyLinkedList();

// Добавляем элементы
list.append(1).append(2).append(3);

console.log(list.toArray()); // [1, 2, 3]

// Вставляем элемент по индексу
list.insert(1, 1.5);
console.log(list.toArray()); // [1, 1.5, 2, 3]

// Удаляем элемент
list.remove(0);
console.log(list.toArray()); // [1.5, 2, 3]

// Используем итератор в for...of
for (const value of list) {
  console.log(value); // 1.5, 2, 3
}
\`\`\`

## Преимущества двусвязного списка:

1. **Двунаправленная навигация** - Можно перемещаться как вперед, так и назад
2. **Эффективное удаление** - O(1) при наличии ссылки на узел
3. **Эффективная вставка/удаление в начало и конец** - O(1) время

## Недостатки:

1. **Повышенное использование памяти** - Каждый узел хранит дополнительную ссылку
2. **Сложность кода** - Необходимо поддерживать две ссылки
3. **Доступ по индексу** - O(n) как и в обычном связном списке

Двусвязные списки часто используются для реализации:
- Кэшей (например, LRU-кэш)
- Историй действий с возможностью отмены/повтора
- Навигации вперед/назад в браузерах`;
  }
  
  // Общий технический ответ для других вопросов
  return `# Технический анализ

Для решения этого технического вопроса нам нужно рассмотреть несколько аспектов:

## Ключевые концепции

1. **Алгоритмическая сложность** - Важно понимать, что эффективность алгоритма измеряется в O-нотации (Big-O), которая описывает, как растет время выполнения с увеличением размера входных данных.

2. **Структуры данных** - Выбор правильной структуры данных (массивы, хеш-таблицы, деревья, графы и т.д.) критически важен для оптимизации производительности.

3. **Оптимизация** - Компромисс между временем выполнения и использованием памяти.

## Рекомендованный подход

\`\`\`javascript
// Пример решения (шаблон)
function solveProblem(input) {
  // 1. Подготовка данных
  const processed = preprocessData(input);
  
  // 2. Основной алгоритм
  const result = algorithm(processed);
  
  // 3. Постобработка и валидация
  return postprocess(result);
}

function preprocessData(input) {
  // Предварительная обработка данных
  return input;
}

function algorithm(data) {
  // Реализация основного алгоритма
  return data;
}

function postprocess(result) {
  // Финальная обработка результата
  return result;
}
\`\`\`

## Тестирование и проверка

Необходимо:
1. Тестировать пограничные случаи
2. Проверять на наличие ошибок и исключений
3. Оценивать производительность на крупных наборах данных

## Дальнейшее изучение

Для углубления знаний рекомендую изучить:
- Алгоритмы и структуры данных в книге "Грокаем алгоритмы" (А. Бхаргава)
- Практические примеры на сайтах LeetCode, HackerRank
- Техническую документацию MDN для JavaScript`;
}

// Функция для получения ответа от DeepSpeek через настоящую AI модель
async function getDeepSpeekResponse(query) {
  // Определяем уровень технической сложности запроса
  const expertLevel = determineExpertLevel(query);
  console.log(`DeepSpeek: Определен уровень запроса: ${expertLevel}`);
  
  // Выбираем провайдеры в зависимости от уровня сложности
  let technicalProviders;
  
  // Создаем системный промпт на основе уровня сложности
  let systemPrompt;
  
  switch (expertLevel) {
    case 'advanced':
      // Для продвинутых вопросов используем наиболее мощные модели
      technicalProviders = [
        "ChatFree",          // Новый стабильный провайдер
        "Qwen_Qwen_2_5_Max", // Python G4F с Qwen 2.5 Max (самая мощная версия)
        "DEEPSEEK",          // G4F провайдер специализированный на техническом контенте
        "AItianhu",          // Qwen через AItianhu
        "Phind",             // Технический AI специалист
        "PERPLEXITY",        // Perplexity AI (хорош для технических вопросов)
        "Anthropic"          // Claude особенно хорош для сложных задач
      ];
      
      systemPrompt = `Вы опытный инженер-программист с глубоким пониманием технических концепций. Пользователь задает сложный технический вопрос. Предоставьте детальный, глубокий ответ с примерами кода и объяснениями сложных концепций. Включите информацию о сложных случаях, граничных условиях и оптимизациях. Не упрощайте объяснения.`;
      break;
      
    case 'intermediate':
      // Для среднего уровня сложности - баланс между глубиной и доступностью
      technicalProviders = [
        "ChatFree",          // Новый стабильный провайдер
        "AItianhu",          // Qwen через AItianhu
        "Qwen_Qwen_3",       // Python G4F с Qwen 3 (быстрее работает)
        "Phind",             // Технический AI специалист
        "DEEPSEEK",          // G4F провайдер
        "DeepInfra",         // DeepInfra AI
        "Gemini"             // Хорошо для обучающего контента
      ];
      
      systemPrompt = `Вы технический специалист, обучающий программистов среднего уровня. Объясните концепции с достаточной глубиной, включая примеры кода и практические рекомендации. Обратите внимание на типичные ошибки и предложите способы улучшения текущих решений.`;
      break;
      
    case 'basic':
      // Для базового уровня - фокус на объяснение основ
      technicalProviders = [
        "ChatFree",          // Новый стабильный провайдер
        "AItianhu_Turbo",    // Быстрая версия Qwen
        "Qwen_Qwen_3",       // Python G4F с Qwen 3
        "Gemini",            // Хорошо для объяснений базовых концепций
        "HuggingChat",       // Бесплатный провайдер с хорошим объяснением
        "GigaChat",          // Российский AI с поддержкой русского языка
        "You"                // Хорошо обрабатывает новичковые вопросы
      ];
      
      systemPrompt = `Вы терпеливый преподаватель программирования для начинающих. Объясните базовые концепции простым языком, без жаргона. Используйте понятные примеры и аналогии. Предоставьте простой, рабочий код, детально объяснив каждую строку. Дайте ссылки на ресурсы для дальнейшего изучения.`;
      break;
      
    default: // 'general'
      // Для общих технических вопросов - универсальный подход
      technicalProviders = [
        "ChatFree",          // Новый стабильный провайдер без API ключа
        "AItianhu",          // Qwen через AItianhu
        "Qwen_Qwen_2_5_Max", // Python G4F с Qwen 2.5 Max
        "Phind",             // Технический AI специалист
        "DEEPSEEK",          // G4F провайдер
        "OpenaiAPI",         // OpenAI через G4F
        "OPENROUTER",        // Маршрутизатор моделей
        "PERPLEXITY",        // Perplexity AI (технический)
        "DeepInfra",         // DeepInfra AI
        "GigaChat",          // Российский AI
        "Gemini",            // Gemini API
        "GeminiPro",         // Gemini Pro API
        "Anthropic",         // Claude API
        "HuggingChat"        // Бесплатный провайдер Hugging Face
      ];
      
      systemPrompt = `Вы технический помощник DeepSpeek, специализирующийся на вопросах программирования и технологий. Предоставьте четкий, информативный ответ, адаптированный к контексту вопроса. Включите примеры кода, если они уместны.`;
  }
  
  // Используем модули для доступа к AI
  const directAiProvider = require('./direct-ai-provider');
  const pythonProviderRoutes = require('./python_provider_routes');
  
  // Проходим по списку провайдеров и пробуем каждый
  for (const provider of technicalProviders) {
    try {
      console.log(`DeepSpeek: Пробуем провайдер ${provider} для уровня ${expertLevel}...`);
      
      let response;
      
      // Определяем, какой метод использовать для этого провайдера
      if (provider === "Qwen_Qwen_2_5_Max" || provider.startsWith("Qwen_")) {
        // Этот провайдер доступен только через Python G4F
        // Добавляем системный промпт к запросу
        const enhancedQuery = `${systemPrompt}\n\nВопрос пользователя: ${query}`;
        response = await pythonProviderRoutes.callPythonAI(enhancedQuery, provider);
        
        if (response) {
          console.log(`DeepSpeek: Успешно получен ответ от ${provider} через Python G4F (уровень: ${expertLevel})`);
          
          return {
            success: true,
            response: response,
            provider: "DeepSpeek",
            model: `DeepSpeek AI (${provider})`,
            expertLevel: expertLevel
          };
        }
      } else if (provider === "ChatFree") {
        // Используем новый провайдер ChatFree
        try {
          console.log(`DeepSpeek: Пробуем использовать ChatFree API для ответа...`);
          
          response = await directAiProvider.getChatResponse(query, { 
            provider: "CHATFREE",  // Имя провайдера в списке AI_PROVIDERS
            systemPrompt: systemPrompt
          });
          
          if (response) {
            console.log(`DeepSpeek: Успешно получен ответ от ChatFree (уровень: ${expertLevel})`);
            
            return {
              success: true,
              response: response,
              provider: "DeepSpeek",
              model: `DeepSpeek AI (ChatFree)`,
              expertLevel: expertLevel
            };
          }
        } catch (chatFreeError) {
          console.error(`DeepSpeek: Ошибка с ChatFree: ${chatFreeError.message}`);
          // Продолжаем выполнение и пробуем другие провайдеры
        }
      } else {
        // Остальные провайдеры доступны через direct-ai-provider
        response = await directAiProvider.getChatResponse(query, { 
          provider: provider,
          systemPrompt: systemPrompt
        });
        
        if (response) {
          console.log(`DeepSpeek: Успешно получен ответ от ${provider} (уровень: ${expertLevel})`);
          
          return {
            success: true,
            response: response,
            provider: "DeepSpeek",
            model: `DeepSpeek AI (${provider})`,
            expertLevel: expertLevel
          };
        }
      }
    } catch (error) {
      // Логируем ошибку и продолжаем со следующим провайдером
      console.error(`DeepSpeek: Ошибка с провайдером ${provider} (уровень ${expertLevel}):`, error.message);
    }
  }
  
  // Если ни один из провайдеров не сработал, пробуем g4f Python сервер напрямую
  try {
    console.log(`DeepSpeek: Пробуем прямой запрос к Python G4F серверу...`);
    
    // Запрос к Python G4F серверу (работает с группами провайдеров)
    const pythonUrl = `http://localhost:5004/python/chat`;
    const pythonResponse = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    
    if (pythonResponse.ok) {
      const result = await pythonResponse.json();
      
      if (result && result.response) {
        console.log(`DeepSpeek: Успешно получен ответ от Python G4F`);
        
        return {
          success: true,
          response: result.response,
          provider: "DeepSpeek",
          model: `DeepSpeek AI (${result.provider || 'G4F'})`
        };
      }
    }
  } catch (finalError) {
    console.error("DeepSpeek: Ошибка при прямом запросе к Python G4F:", finalError.message);
  }
  
  // В случае полного отказа возвращаем ошибку
  return {
    success: false,
    error: "Не удалось связаться с AI-провайдерами для DeepSpeek"
  };
}

// Маршрут для обработки запросов к DeepSpeek
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Запрос не может быть пустым"
      });
    }
    
    console.log(`DeepSpeek: Получен запрос: "${query.substring(0, 50)}..."`);
    
    // Проверяем кэш перед обработкой запроса
    const cachedResponse = getCachedResponse(query);
    if (cachedResponse) {
      console.log(`DeepSpeek: Отправляем кэшированный ответ`);
      return res.json(cachedResponse);
    }
    
    // Получаем ответ от DeepSpeek
    const response = await getDeepSpeekResponse(query);
    
    // Кэшируем успешный ответ для будущего использования
    if (response.success) {
      cacheResponse(query, response);
    }
    
    res.json(response);
  } catch (error) {
    console.error("Ошибка в маршруте DeepSpeek:", error);
    res.status(500).json({
      success: false,
      error: "Внутренняя ошибка сервера"
    });
  }
});

module.exports = router;
module.exports.getDeepSpeekResponse = getDeepSpeekResponse;