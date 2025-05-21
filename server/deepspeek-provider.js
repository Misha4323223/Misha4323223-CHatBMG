/**
 * DeepSpeek AI Provider - специализированный провайдер для технических вопросов
 * Используется локальная генерация ответов для технических запросов, особенно
 * связанных с программированием, алгоритмами и разработкой.
 */

/**
 * Функция для генерации ответов на технические вопросы
 * @param {string} query - вопрос пользователя
 * @returns {Promise<{success: boolean, response: string, provider: string, model: string}>}
 */
async function getDeepSpeekResponse(query) {
  try {
    // Проверяем, является ли запрос техническим
    const isTechnicalQuery = /\b(программирование|код|алгоритм|javascript|python|react|api|web|sql|database|function|class|объект|массив|frontend|backend)\b/i.test(query);
    
    if (!isTechnicalQuery) {
      return {
        success: false,
        response: "Я DeepSpeek AI, специализированный ассистент для технических вопросов. Лучше всего я отвечаю на вопросы о программировании, разработке, алгоритмах и технологиях. Пожалуйста, задайте мне технический вопрос.",
        provider: "DeepSpeek",
        model: "deepseek-chat-local"
      };
    }
    
    // Создаем специализированный ответ в зависимости от темы вопроса
    let response = '';
    
    if (query.includes('javascript') || query.includes('js')) {
      response = generateJavaScriptResponse(query);
    } else if (query.includes('python')) {
      response = generatePythonResponse(query);
    } else if (query.includes('алгоритм') || query.includes('сортировка')) {
      response = generateAlgorithmResponse(query);
    } else if (query.includes('react') || query.includes('фреймворк')) {
      response = generateFrameworkResponse(query);
    } else if (query.includes('api') || query.includes('rest')) {
      response = generateAPIResponse(query);
    } else {
      // Общий технический ответ
      response = generateGeneralTechResponse(query);
    }
    
    return {
      success: true,
      response,
      provider: "DeepSpeek",
      model: "deepseek-chat-local"
    };
  } catch (error) {
    console.error("Ошибка DeepSpeek провайдера:", error);
    return {
      success: false,
      response: "Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.",
      provider: "DeepSpeek",
      model: "deepseek-chat-local"
    };
  }
}

/**
 * Генерирует ответ для JavaScript-запросов
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generateJavaScriptResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('сортировка') || lowerQuery.includes('sort')) {
    return `# Сортировка массива в JavaScript

В JavaScript у вас есть несколько способов сортировки массивов:

## 1. Метод \`sort()\` с функцией сравнения

\`\`\`javascript
// Сортировка чисел по возрастанию
const numbers = [5, 1, 3, 8, 2];
numbers.sort((a, b) => a - b);
console.log(numbers); // [1, 2, 3, 5, 8]

// Сортировка чисел по убыванию
const numbers2 = [5, 1, 3, 8, 2];
numbers2.sort((a, b) => b - a);
console.log(numbers2); // [8, 5, 3, 2, 1]

// Сортировка строк (лексикографическая)
const fruits = ['apple', 'banana', 'Cherry', 'date'];
fruits.sort((a, b) => a.localeCompare(b));
console.log(fruits); // ['apple', 'banana', 'Cherry', 'date']
\`\`\`

## 2. Пользовательская реализация быстрой сортировки

\`\`\`javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

const sortedArray = quickSort([5, 1, 3, 8, 2]);
console.log(sortedArray); // [1, 2, 3, 5, 8]
\`\`\`

## 3. Сортировка объектов по свойству

\`\`\`javascript
const users = [
  { name: 'John', age: 25 },
  { name: 'Jane', age: 30 },
  { name: 'Mike', age: 20 }
];

// Сортировка по возрасту
users.sort((a, b) => a.age - b.age);
console.log(users);
// Результат: [{ name: 'Mike', age: 20 }, { name: 'John', age: 25 }, { name: 'Jane', age: 30 }]
\`\`\`

## Производительность

- Встроенный метод \`sort()\` в JavaScript имеет сложность O(n log n)
- Быстрая сортировка также имеет сложность O(n log n) в среднем случае, но O(n²) в худшем
- Для очень больших массивов стоит использовать встроенный \`sort()\`, так как он оптимизирован в движках JS`;
  }
  
  if (lowerQuery.includes('map') || lowerQuery.includes('filter') || lowerQuery.includes('reduce')) {
    return `# Основные методы массивов в JavaScript

JavaScript предоставляет мощные методы для работы с массивами:

## map() - трансформирование элементов

\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]
\`\`\`

## filter() - фильтрация элементов

\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];
const evenNumbers = numbers.filter(num => num % 2 === 0);
console.log(evenNumbers); // [2, 4]
\`\`\`

## reduce() - сведение массива к одному значению

\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, current) => acc + current, 0);
console.log(sum); // 15

// Более сложный пример: группировка по свойству
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 25 }
];

const groupedByAge = people.reduce((acc, person) => {
  if (!acc[person.age]) {
    acc[person.age] = [];
  }
  acc[person.age].push(person);
  return acc;
}, {});

console.log(groupedByAge);
// {
//   25: [{ name: 'Alice', age: 25 }, { name: 'Charlie', age: 25 }],
//   30: [{ name: 'Bob', age: 30 }]
// }
\`\`\`

## Цепочки методов

Методы можно цепочкой комбинировать для сложных операций:

\`\`\`javascript
const products = [
  { name: 'Phone', price: 500, inStock: true },
  { name: 'Laptop', price: 1200, inStock: true },
  { name: 'Tablet', price: 300, inStock: false },
  { name: 'Watch', price: 150, inStock: true }
];

const totalInStockValue = products
  .filter(product => product.inStock)
  .map(product => product.price)
  .reduce((total, price) => total + price, 0);

console.log(totalInStockValue); // 1850
\`\`\`

## Важные замечания

1. Все эти методы создают новые массивы и не изменяют исходный (иммутабельность)
2. Эти методы принимают функции обратного вызова, что делает их очень гибкими
3. Для максимальной производительности с большими наборами данных рассмотрите использование обычных циклов`;
  }
  
  // Общий ответ по JavaScript
  return `# JavaScript - Основы и лучшие практики

JavaScript - это мультипарадигменный язык программирования, поддерживающий функциональное, объектно-ориентированное и императивное программирование.

## Основные концепции

### 1. Типы данных
JavaScript имеет следующие примитивные типы:
- String: \`"Hello"\`
- Number: \`42\` или \`3.14\`
- Boolean: \`true\` или \`false\`
- Undefined: \`undefined\`
- Null: \`null\`
- Symbol: \`Symbol('description')\`
- BigInt: \`123n\`

И сложные типы:
- Object: \`{}\`, \`[]\`, \`new Map()\`, \`new Set()\`, \`new Date()\` и т.д.

### 2. Переменные
```javascript
// Современные способы объявления переменных
const name = 'John'; // невозможно переопределить
let age = 30; // можно изменить значение
// var устарел, не рекомендуется использовать
```

### 3. Функции
```javascript
// Обычная функция
function add(a, b) {
  return a + b;
}

// Стрелочная функция
const multiply = (a, b) => a * b;

// Функция как метод объекта
const calculator = {
  sum(a, b) {
    return a + b;
  }
};
```

### 4. Асинхронное программирование
```javascript
// Промисы
fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));

// Async/await
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
```

## Лучшие практики

1. **Используйте строгий режим** (\`'use strict';\`), чтобы избежать распространенных ошибок

2. **Избегайте глобальных переменных** - используйте модули или замыкания

3. **Предпочитайте const перед let** - используйте const там, где переменная не будет переопределяться

4. **Используйте деструктуризацию** для более чистого кода
   ```javascript
   const { name, age } = person;
   const [first, second] = array;
   ```

5. **Применяйте функциональное программирование** с методами массивов (map, filter, reduce)

6. **Обрабатывайте ошибки** с помощью try/catch или catch для промисов

7. **Используйте шаблонные строки** для удобной интерполяции
   ```javascript
   const greeting = \`Hello, ${name}!\`;
   ```

8. **Избегайте callback hell** - используйте промисы или async/await`;
}

/**
 * Генерирует ответ для Python-запросов
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generatePythonResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('сортировка') || lowerQuery.includes('sort')) {
    return `# Сортировка в Python

Python предлагает несколько способов сортировки данных:

## 1. Метод \`sort()\` для списков

\`\`\`python
# Сортировка чисел по возрастанию
numbers = [5, 1, 3, 8, 2]
numbers.sort()
print(numbers)  # [1, 2, 3, 5, 8]

# Сортировка чисел по убыванию
numbers = [5, 1, 3, 8, 2]
numbers.sort(reverse=True)
print(numbers)  # [8, 5, 3, 2, 1]

# Сортировка строк
fruits = ['apple', 'banana', 'cherry', 'date']
fruits.sort()
print(fruits)  # ['apple', 'banana', 'cherry', 'date']
\`\`\`

## 2. Функция \`sorted()\` для любых итерируемых объектов

\`\`\`python
# Сортировка с созданием нового списка (не изменяет оригинал)
numbers = [5, 1, 3, 8, 2]
sorted_numbers = sorted(numbers)
print(sorted_numbers)  # [1, 2, 3, 5, 8]
print(numbers)  # [5, 1, 3, 8, 2] - оригинал не изменен

# Сортировка кортежа
tuple_example = (5, 1, 3, 8, 2)
sorted_tuple = sorted(tuple_example)
print(sorted_tuple)  # [1, 2, 3, 5, 8] - результат всегда список
\`\`\`

## 3. Сортировка с помощью ключевой функции

\`\`\`python
# Сортировка строк по длине
words = ['apple', 'banana', 'cherry', 'date', 'elderberry']
words.sort(key=len)
print(words)  # ['date', 'apple', 'cherry', 'banana', 'elderberry']

# Сортировка словарей по значению
students = [
    {'name': 'Alice', 'grade': 85},
    {'name': 'Bob', 'grade': 92},
    {'name': 'Charlie', 'grade': 78}
]
sorted_students = sorted(students, key=lambda x: x['grade'], reverse=True)
print(sorted_students)
# [{'name': 'Bob', 'grade': 92}, {'name': 'Alice', 'grade': 85}, {'name': 'Charlie', 'grade': 78}]
\`\`\`

## 4. Реализация быстрой сортировки

\`\`\`python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)

sorted_array = quick_sort([5, 1, 3, 8, 2])
print(sorted_array)  # [1, 2, 3, 5, 8]
\`\`\`

## Практические советы

1. Используйте \`sorted()\` когда не хотите изменять исходный объект
2. Используйте \`list.sort()\` когда нужно изменить оригинальный список 
3. Для сложных объектов всегда определяйте ключевую функцию с \`key=...`
4. Для обратной сортировки используйте параметр \`reverse=True\`
5. Временная сложность стандартной сортировки в Python - O(n log n)`;
  }
  
  if (lowerQuery.includes('list') || lowerQuery.includes('dict') || lowerQuery.includes('set')) {
    return `# Коллекции в Python

Python предлагает несколько встроенных типов коллекций:

## 1. Списки (list)

Упорядоченные изменяемые коллекции.

\`\`\`python
# Создание списка
fruits = ['apple', 'banana', 'cherry']

# Доступ к элементам
print(fruits[0])  # apple
print(fruits[-1])  # cherry

# Изменение элементов
fruits[0] = 'apricot'
print(fruits)  # ['apricot', 'banana', 'cherry']

# Добавление элементов
fruits.append('date')
fruits.insert(1, 'blueberry')
print(fruits)  # ['apricot', 'blueberry', 'banana', 'cherry', 'date']

# Удаление элементов
fruits.remove('banana')  # по значению
del fruits[0]  # по индексу
popped = fruits.pop()  # удаление и возврат последнего элемента
print(fruits)  # ['blueberry', 'cherry']

# Срезы
numbers = [0, 1, 2, 3, 4, 5]
print(numbers[1:4])  # [1, 2, 3]
print(numbers[::2])  # [0, 2, 4]
\`\`\`

## 2. Словари (dict)

Коллекции пар ключ-значение.

\`\`\`python
# Создание словаря
person = {'name': 'John', 'age': 30, 'city': 'New York'}

# Доступ к значениям
print(person['name'])  # John
print(person.get('email', 'Not specified'))  # Not specified (значение по умолчанию)

# Изменение/добавление элементов
person['age'] = 31
person['email'] = 'john@example.com'
print(person)  # {'name': 'John', 'age': 31, 'city': 'New York', 'email': 'john@example.com'}

# Удаление элементов
del person['city']
email = person.pop('email')
print(person)  # {'name': 'John', 'age': 31}

# Обход словаря
for key in person:
    print(f"{key}: {person[key]}")

for key, value in person.items():
    print(f"{key}: {value}")
\`\`\`

## 3. Множества (set)

Неупорядоченные коллекции уникальных элементов.

\`\`\`python
# Создание множества
fruits = {'apple', 'banana', 'cherry', 'apple'}  # дубликаты игнорируются
print(fruits)  # {'cherry', 'banana', 'apple'} (порядок может отличаться)

# Добавление элементов
fruits.add('date')
fruits.update(['elderberry', 'fig'])
print(fruits)  # {'cherry', 'fig', 'banana', 'apple', 'date', 'elderberry'}

# Удаление элементов
fruits.remove('banana')  # генерирует ошибку, если элемента нет
fruits.discard('grape')  # не генерирует ошибку, если элемента нет
print(fruits)  # {'cherry', 'fig', 'apple', 'date', 'elderberry'}

# Операции с множествами
set1 = {1, 2, 3, 4, 5}
set2 = {4, 5, 6, 7, 8}
print(set1 | set2)  # объединение {1, 2, 3, 4, 5, 6, 7, 8}
print(set1 & set2)  # пересечение {4, 5}
print(set1 - set2)  # разность {1, 2, 3}
print(set1 ^ set2)  # симметрическая разность {1, 2, 3, 6, 7, 8}
\`\`\`

## 4. Кортежи (tuple)

Неизменяемые упорядоченные коллекции.

\`\`\`python
# Создание кортежа
coordinates = (10, 20)
person = ('John', 30, 'New York')

# Доступ к элементам
print(coordinates[0])  # 10
print(person[2])  # New York

# Распаковка кортежа
name, age, city = person
print(name)  # John

# Кортеж из одного элемента
single = (42,)  # запятая необходима!
\`\`\`

## Выбор подходящей структуры данных

- **Список** - когда порядок важен и нужно изменять коллекцию
- **Словарь** - когда нужен быстрый доступ по ключу
- **Множество** - когда нужны только уникальные элементы и быстрая проверка вхождения
- **Кортеж** - когда данные не должны меняться`;
  }
  
  // Общий ответ по Python
  return `# Python - Основы и лучшие практики

Python - это высокоуровневый интерпретируемый язык программирования с простым и понятным синтаксисом.

## Основные концепции

### 1. Типы данных
Python имеет следующие встроенные типы:
- Числа: \`42\` (int), \`3.14\` (float), \`2+3j\` (complex)
- Строки: \`"Hello"\` или \`'World'\`
- Логические значения: \`True\` или \`False\`
- None: \`None\` (эквивалент null)
- Коллекции: \`[]\` (list), \`()\` (tuple), \`{}\` (dict), \`set()\`

### 2. Переменные
```python
# Динамическая типизация - тип определяется значением
name = "John"  # строка
age = 30  # целое число
height = 1.85  # число с плавающей точкой
is_active = True  # логическое значение
```

### 3. Функции
```python
# Определение функции
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

# Вызов функции
message = greet("Alice")
print(message)  # "Hello, Alice!"

# Лямбда-функция (анонимная)
multiply = lambda x, y: x * y
print(multiply(5, 3))  # 15
```

### 4. Обработка ошибок
```python
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")
except Exception as e:
    print(f"An error occurred: {e}")
else:
    print("No errors occurred")
finally:
    print("This always executes")
```

### 5. Классы и ООП
```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        return f"Hello, my name is {self.name}"
    
    @property
    def is_adult(self):
        return self.age >= 18

# Создание объекта
john = Person("John", 30)
print(john.greet())  # "Hello, my name is John"
print(john.is_adult)  # True
```

## Лучшие практики

1. **Следуйте PEP 8** - официальному руководству по стилю кода Python

2. **Используйте аннотации типов** для повышения читаемости
   ```python
   def calculate_area(radius: float) -> float:
       return 3.14 * radius ** 2
   ```

3. **Предпочитайте списковые включения** вместо циклов
   ```python
   # Вместо:
   squares = []
   for i in range(10):
       squares.append(i ** 2)
   
   # Используйте:
   squares = [i ** 2 for i in range(10)]
   ```

4. **Используйте менеджеры контекста** для управления ресурсами
   ```python
   # Автоматически закрывает файл
   with open("file.txt", "r") as file:
       content = file.read()
   ```

5. **Избегайте глобальных переменных** - используйте параметры функций и классы

6. **Документируйте код** с помощью докстрингов
   ```python
   def func(arg1, arg2):
       """
       Краткое описание функции.
       
       Args:
           arg1: Описание первого аргумента
           arg2: Описание второго аргумента
           
       Returns:
           Описание возвращаемого значения
       """
       return arg1 + arg2
   ```

7. **Используйте виртуальные окружения** для изоляции зависимостей проекта`;
}

/**
 * Генерирует ответ для запросов об алгоритмах
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generateAlgorithmResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('быстрая сортировка') || lowerQuery.includes('quicksort')) {
    return `# Быстрая сортировка (QuickSort)

Быстрая сортировка - это эффективный алгоритм сортировки, использующий подход "разделяй и властвуй".

## Принцип работы

1. **Выбор опорного элемента (pivot)** из массива
2. **Разделение (partition)** массива на:
   - Элементы меньше опорного
   - Элементы равные опорному
   - Элементы больше опорного
3. **Рекурсивное применение** алгоритма к подмассивам
4. **Объединение** результатов

## Реализации

### JavaScript
\`\`\`javascript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}
\`\`\`

### Python
\`\`\`python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)
\`\`\`

### Java
\`\`\`java
public static List<Integer> quickSort(List<Integer> arr) {
    if (arr.size() <= 1) {
        return new ArrayList<>(arr);
    }
    
    Integer pivot = arr.get(arr.size() / 2);
    
    List<Integer> left = new ArrayList<>();
    List<Integer> middle = new ArrayList<>();
    List<Integer> right = new ArrayList<>();
    
    for (Integer x : arr) {
        if (x < pivot) {
            left.add(x);
        } else if (x.equals(pivot)) {
            middle.add(x);
        } else {
            right.add(x);
        }
    }
    
    List<Integer> result = new ArrayList<>();
    result.addAll(quickSort(left));
    result.addAll(middle);
    result.addAll(quickSort(right));
    
    return result;
}
\`\`\`

## Оптимизированная in-place реализация

В реальных приложениях чаще используют версию с разделением "на месте" для экономии памяти:

\`\`\`javascript
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    const pivotIndex = partition(arr, left, right);
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
  }
  return arr;
}

function partition(arr, left, right) {
  const pivot = arr[right];
  let i = left - 1;
  
  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];
  return i + 1;
}
\`\`\`

## Временная сложность

- **Лучший случай**: O(n log n)
- **Средний случай**: O(n log n)
- **Худший случай**: O(n²) - возникает, когда опорный элемент постоянно оказывается наименьшим или наибольшим

## Пространственная сложность

- **Наивная реализация**: O(n) дополнительной памяти
- **In-place реализация**: O(log n) для стека вызовов

## Важные замечания

1. **Выбор опорного элемента** существенно влияет на производительность
   - Часто используют медиану из первого, среднего и последнего элементов
   - Случайный выбор также эффективен

2. **Стабильность** - QuickSort не является стабильным алгоритмом (элементы с равными ключами могут изменить порядок)

3. **Применение** - в большинстве стандартных библиотек используется именно этот алгоритм или его варианты`;
  }
  
  if (lowerQuery.includes('сложность') || lowerQuery.includes('big o')) {
    return `# Алгоритмическая сложность (Big O Notation)

Большое O (Big O) - обозначение, описывающее поведение или сложность алгоритма при увеличении объема входных данных.

## Основные классы сложности

### O(1) - Константное время
Время выполнения не зависит от размера входных данных.

**Примеры:**
- Доступ к элементу массива по индексу
- Операции с хеш-таблицами (в среднем)
- Добавление/удаление в начало/конец стека или очереди

\`\`\`javascript
function isEven(num) {
  return num % 2 === 0; // O(1) - одна операция
}
\`\`\`

### O(log n) - Логарифмическое время
Время выполнения растет логарифмически с увеличением входных данных.

**Примеры:**
- Бинарный поиск
- Операции со сбалансированными деревьями
- Некоторые алгоритмы "разделяй и властвуй"

\`\`\`javascript
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}
\`\`\`

### O(n) - Линейное время
Время выполнения прямо пропорционально размеру входных данных.

**Примеры:**
- Обход массива или списка
- Линейный поиск
- Подсчет элементов

\`\`\`javascript
function findMax(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}
\`\`\`

### O(n log n) - Линейарифмическое время
Чаще всего встречается в алгоритмах, которые разделяют данные и затем линейно их обрабатывают.

**Примеры:**
- Эффективные алгоритмы сортировки (Merge Sort, Quick Sort, Heap Sort)
- Некоторые алгоритмы на графах

\`\`\`javascript
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return [...result, ...left.slice(i), ...right.slice(j)];
}
\`\`\`

### O(n²) - Квадратичное время
Алгоритмы, где каждый элемент обрабатывается в сочетании с каждым другим элементом.

**Примеры:**
- Вложенные циклы
- Простые алгоритмы сортировки (Bubble Sort, Insertion Sort)
- Поиск всех возможных пар в наборе

\`\`\`javascript
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
\`\`\`

### O(2^n) - Экспоненциальное время
Время выполнения удваивается с каждым дополнительным элементом во входных данных.

**Примеры:**
- Рекурсивный подсчет чисел Фибоначчи
- Решение задачи о рюкзаке методом грубой силы
- Перебор подмножеств

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

## Пространственная сложность

Кроме временной сложности, для алгоритмов важна пространственная сложность - объем дополнительной памяти, необходимый алгоритму для работы.

**Примеры:**
- Рекурсивные алгоритмы: O(глубина рекурсии) для стека вызовов
- Создание новых структур данных: O(n) при копировании массива

## Практические советы

1. **Всегда анализируйте худший случай**, но помните о среднем
2. **Избегайте вложенных циклов**, когда это возможно
3. **Используйте эффективные структуры данных** (хеш-таблицы, деревья)
4. **Для больших объемов данных** разница между O(n log n) и O(n²) критична
5. **Иногда константы имеют значение** - O(5n) может быть медленнее O(n log n) для малых n
6. **Оптимизируйте только когда необходимо** - сначала сделайте код правильным, потом быстрым`;
  }
  
  // Общий ответ по алгоритмам
  return `# Основные алгоритмы и структуры данных

## Алгоритмы сортировки

### 1. Быстрая сортировка (QuickSort)
- **Принцип**: Разделяй и властвуй с опорным элементом
- **Сложность**: O(n log n) в среднем, O(n²) в худшем случае
- **Применение**: Стандартная сортировка во многих языках

### 2. Сортировка слиянием (MergeSort)
- **Принцип**: Разделение на подмассивы, сортировка, слияние
- **Сложность**: O(n log n) во всех случаях
- **Особенность**: Стабильная сортировка, но требует O(n) дополнительной памяти

### 3. Пузырьковая сортировка (BubbleSort)
- **Принцип**: Последовательное сравнение и обмен соседних элементов
- **Сложность**: O(n²)
- **Применение**: Обучение, очень маленькие массивы

## Алгоритмы поиска

### 1. Бинарный поиск
- **Принцип**: Поиск в отсортированном массиве путем деления пополам
- **Сложность**: O(log n)
- **Ограничение**: Требует отсортированные данные

### 2. Поиск в ширину (BFS)
- **Принцип**: Исследование всех соседей на текущем уровне перед переходом глубже
- **Применение**: Кратчайший путь в невзвешенных графах, обход уровней

### 3. Поиск в глубину (DFS)
- **Принцип**: Исследование ветви до конца перед возвратом
- **Применение**: Топологическая сортировка, поиск циклов, обход дерева

## Структуры данных

### 1. Массивы (Arrays)
- **Доступ**: O(1) по индексу
- **Вставка/удаление**: O(n) в общем случае
- **Особенности**: Непрерывный блок памяти, быстрый доступ

### 2. Связанные списки (Linked Lists)
- **Доступ**: O(n)
- **Вставка/удаление**: O(1) если известен узел
- **Виды**: Односвязные, двусвязные, циклические

### 3. Хеш-таблицы (Hash Tables)
- **Доступ/вставка/удаление**: O(1) в среднем
- **Применение**: Словари, кеширование, индексирование
- **Проблемы**: Коллизии, нет упорядоченности

### 4. Деревья (Trees)
- **Бинарное дерево поиска**: 
  - Доступ/вставка/удаление: O(log n) в среднем случае
  - Проблемы: Может вырождаться в связный список
- **АВЛ-дерево**: 
  - Сбалансированное дерево с O(log n) для всех операций
- **Б-дерево**: 
  - Многопутевые деревья для дисковых операций, баз данных

### 5. Графы (Graphs)
- **Представление**: Матрица смежности, список смежности
- **Алгоритмы**: Дейкстра, Флойд-Уоршелл, Крускал, Прим
- **Применение**: Сети, маршрутизация, социальные связи

## Подходы к решению алгоритмических задач

### 1. Жадные алгоритмы
- **Принцип**: Выбор локально оптимального решения
- **Применение**: Задачи о расписании, задача о размене монет

### 2. Динамическое программирование
- **Принцип**: Разбиение задачи на подзадачи и сохранение их решений
- **Применение**: Задача о рюкзаке, наибольшая общая подпоследовательность

### 3. Разделяй и властвуй
- **Принцип**: Разбиение задачи на подзадачи, решение каждой отдельно
- **Применение**: Сортировки, умножение больших чисел

## Анализ сложности
- **Временная сложность**: Время выполнения как функция от размера входных данных
- **Пространственная сложность**: Объем памяти, необходимый для выполнения
- **Big O нотация**: O(1), O(log n), O(n), O(n log n), O(n²), O(2^n), O(n!)`;
}

/**
 * Генерирует ответ для запросов о фреймворках
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generateFrameworkResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('react')) {
    return `# React.js - Основы и лучшие практики

React - это JavaScript-библиотека для создания пользовательских интерфейсов, разработанная Facebook.

## Ключевые концепции

### 1. Компоненты

Компоненты - основные строительные блоки React-приложений. Существует два типа компонентов:

#### Функциональные компоненты
\`\`\`jsx
function Welcome(props) {
  return <h1>Привет, {props.name}</h1>;
}

// С использованием стрелочной функции
const Welcome = ({ name }) => <h1>Привет, {name}</h1>;
\`\`\`

#### Классовые компоненты
\`\`\`jsx
class Welcome extends React.Component {
  render() {
    return <h1>Привет, {this.props.name}</h1>;
  }
}
\`\`\`

### 2. Props (Свойства)

Props - способ передачи данных от родительского компонента дочернему.

\`\`\`jsx
// Родительский компонент
function App() {
  return <Welcome name="Алиса" />;
}

// Дочерний компонент
function Welcome({ name }) {
  return <h1>Привет, {name}</h1>;
}
\`\`\`

### 3. State (Состояние)

State - данные, которые могут изменяться внутри компонента.

#### В функциональных компонентах (с хуками)
\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Счетчик: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Увеличить
      </button>
    </div>
  );
}
\`\`\`

#### В классовых компонентах
\`\`\`jsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  
  render() {
    return (
      <div>
        <p>Счетчик: {this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Увеличить
        </button>
      </div>
    );
  }
}
\`\`\`

### 4. Хуки (Hooks)

Хуки позволяют использовать состояние и другие возможности React без написания классов.

#### useState
\`\`\`jsx
const [state, setState] = useState(initialState);
\`\`\`

#### useEffect
\`\`\`jsx
useEffect(() => {
  // Выполняется после рендера
  document.title = \`Счетчик: ${count}\`;
  
  // Функция очистки (опционально)
  return () => {
    // Выполняется перед следующим эффектом или размонтированием
  };
}, [count]); // Зависимости - эффект выполнится при изменении count
\`\`\`

#### useContext
\`\`\`jsx
const value = useContext(MyContext);
\`\`\`

#### useReducer
\`\`\`jsx
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

#### useCallback и useMemo
\`\`\`jsx
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
\`\`\`

### 5. Жизненный цикл компонента

#### Функциональные компоненты с хуками
\`\`\`jsx
function MyComponent() {
  // Монтирование
  useEffect(() => {
    // componentDidMount
    
    return () => {
      // componentWillUnmount
    };
  }, []); // Пустой массив зависимостей = выполнить только при монтировании/размонтировании
  
  // Обновление при изменении props.id
  useEffect(() => {
    // похоже на componentDidUpdate
  }, [props.id]);
}
\`\`\`

#### Классовые компоненты
\`\`\`jsx
class MyComponent extends React.Component {
  // Монтирование
  componentDidMount() { }
  
  // Обновление
  shouldComponentUpdate(nextProps, nextState) { }
  componentDidUpdate(prevProps, prevState) { }
  
  // Размонтирование
  componentWillUnmount() { }
  
  // Обработка ошибок
  static getDerivedStateFromError(error) { }
  componentDidCatch(error, info) { }
}
\`\`\`

## Лучшие практики

### 1. Композиция компонентов
\`\`\`jsx
function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
      <Content />
      <Footer />
    </div>
  );
}
\`\`\`

### 2. Условный рендеринг
\`\`\`jsx
function Greeting({ isLoggedIn }) {
  return isLoggedIn 
    ? <UserGreeting /> 
    : <GuestGreeting />;
}
\`\`\`

### 3. Списки и ключи
\`\`\`jsx
function NumberList({ numbers }) {
  return (
    <ul>
      {numbers.map(number => (
        <li key={number.id}>{number.value}</li>
      ))}
    </ul>
  );
}
\`\`\`

### 4. Обработка форм
\`\`\`jsx
function NameForm() {
  const [name, setName] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Отправлено имя:', name);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Имя:
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
      </label>
      <button type="submit">Отправить</button>
    </form>
  );
}
\`\`\`

### 5. Подъем состояния
\`\`\`jsx
function TemperatureCalculator() {
  const [temperature, setTemperature] = useState('');
  const [scale, setScale] = useState('c');
  
  const handleCelsiusChange = (temperature) => {
    setTemperature(temperature);
    setScale('c');
  };
  
  const handleFahrenheitChange = (temperature) => {
    setTemperature(temperature);
    setScale('f');
  };
  
  const celsius = scale === 'f' ? tryConvert(temperature, toCelsius) : temperature;
  const fahrenheit = scale === 'c' ? tryConvert(temperature, toFahrenheit) : temperature;
  
  return (
    <div>
      <TemperatureInput 
        scale="c"
        temperature={celsius}
        onTemperatureChange={handleCelsiusChange} 
      />
      <TemperatureInput 
        scale="f"
        temperature={fahrenheit}
        onTemperatureChange={handleFahrenheitChange} 
      />
    </div>
  );
}
\`\`\`

### 6. Фрагменты
\`\`\`jsx
function Table() {
  return (
    <table>
      <tbody>
        <Row />
      </tbody>
    </table>
  );
}

function Row() {
  return (
    <React.Fragment>
      <tr><td>Ячейка 1</td></tr>
      <tr><td>Ячейка 2</td></tr>
    </React.Fragment>
  );
  
  // Сокращенный синтаксис
  return (
    <>
      <tr><td>Ячейка 1</td></tr>
      <tr><td>Ячейка 2</td></tr>
    </>
  );
}
\`\`\`

### 7. Управление побочными эффектами

\`\`\`jsx
function DataFetcher({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();
        
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message);
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [url]);
  
  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!data) return <div>Нет данных</div>;
  
  return <div>{/* Отображение данных */}</div>;
}
\`\`\``;
  }
  
  if (lowerQuery.includes('vue')) {
    return `# Vue.js - Основы и лучшие практики

Vue.js - прогрессивный JavaScript-фреймворк для создания пользовательских интерфейсов.

## Ключевые концепции

### 1. Инстанс Vue и реактивность

\`\`\`javascript
// Vue 2
new Vue({
  el: '#app',
  data: {
    message: 'Привет, Vue!'
  }
});

// Vue 3
const app = Vue.createApp({
  data() {
    return {
      message: 'Привет, Vue!'
    }
  }
});
app.mount('#app');
\`\`\`

### 2. Шаблоны и директивы

\`\`\`html
<div id="app">
  <!-- Интерполяция текста -->
  <p>{{ message }}</p>
  
  <!-- Директивы -->
  <p v-if="seen">Сейчас меня видно</p>
  <p v-else>Сейчас меня не видно</p>
  
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.text }}</li>
  </ul>
  
  <button v-on:click="reverseMessage">Обратить сообщение</button>
  <!-- Сокращение для v-on: -->
  <button @click="reverseMessage">Обратить сообщение</button>
  
  <input v-model="message">
  
  <!-- Привязка атрибутов -->
  <div v-bind:class="{ active: isActive }"></div>
  <!-- Сокращение для v-bind: -->
  <div :class="{ active: isActive }"></div>
</div>
\`\`\`

### 3. Вычисляемые свойства и наблюдатели

\`\`\`javascript
const app = Vue.createApp({
  data() {
    return {
      firstName: 'Иван',
      lastName: 'Иванов'
    }
  },
  computed: {
    // Вычисляемое свойство (геттер)
    fullName() {
      return this.firstName + ' ' + this.lastName;
    },
    
    // Вычисляемое свойство (геттер и сеттер)
    fullName: {
      get() {
        return this.firstName + ' ' + this.lastName;
      },
      set(newValue) {
        const parts = newValue.split(' ');
        this.firstName = parts[0];
        this.lastName = parts[1];
      }
    }
  },
  watch: {
    // Наблюдатель, срабатывает при изменении firstName
    firstName(newValue, oldValue) {
      console.log('firstName изменен:', oldValue, '->', newValue);
    }
  }
});
\`\`\`

### 4. Компоненты

#### Глобальная регистрация (Vue 3)
\`\`\`javascript
const app = Vue.createApp({});

app.component('button-counter', {
  data() {
    return {
      count: 0
    }
  },
  template: \`
    <button @click="count++">
      Нажата {{ count }} раз
    </button>
  \`
});
\`\`\`

#### Локальная регистрация (Vue 3)
\`\`\`javascript
const ButtonCounter = {
  data() {
    return {
      count: 0
    }
  },
  template: \`
    <button @click="count++">
      Нажата {{ count }} раз
    </button>
  \`
};

const app = Vue.createApp({
  components: {
    'button-counter': ButtonCounter
  }
});
\`\`\`

#### Однофайловые компоненты (.vue)
\`\`\`vue
<template>
  <div class="button-counter">
    <button @click="increment">Нажата {{ count }} раз</button>
  </div>
</template>

<script>
export default {
  name: 'ButtonCounter',
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++;
    }
  }
}
</script>

<style scoped>
.button-counter {
  margin: 10px;
}
button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
\`\`\`

### 5. Props

\`\`\`vue
<template>
  <div>
    <h1>{{ title }}</h1>
    <p>{{ content }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    content: {
      type: String,
      required: true,
      default: 'Содержимое по умолчанию'
    },
    likes: {
      type: Number,
      validator: value => value >= 0
    }
  }
}
</script>
\`\`\`

Использование компонента с props:
\`\`\`vue
<template>
  <div>
    <article-item 
      title="Мой пост" 
      content="Содержание поста"
      :likes="42"
    />
  </div>
</template>
\`\`\`

### 6. Жизненный цикл компонента

\`\`\`javascript
export default {
  // Компонент создается
  beforeCreate() {
    console.log('beforeCreate');
  },
  created() {
    console.log('created');
    // Здесь можно выполнять запросы к API
  },
  
  // Шаблон компонента компилируется
  beforeMount() {
    console.log('beforeMount');
  },
  mounted() {
    console.log('mounted');
    // Здесь доступен DOM
  },
  
  // Компонент обновляется
  beforeUpdate() {
    console.log('beforeUpdate');
  },
  updated() {
    console.log('updated');
  },
  
  // Компонент удаляется
  beforeUnmount() { // в Vue 2: beforeDestroy
    console.log('beforeUnmount');
  },
  unmounted() { // в Vue 2: destroyed
    console.log('unmounted');
    // Очистка ресурсов
  }
}
\`\`\`

### 7. Composition API (Vue 3)

\`\`\`vue
<template>
  <div>
    <p>Счетчик: {{ count }}</p>
    <button @click="increment">Увеличить</button>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';

export default {
  setup() {
    // Реактивное состояние
    const count = ref(0);
    const message = ref('Привет');
    
    // Вычисляемое свойство
    const doubleCount = computed(() => count.value * 2);
    
    // Методы
    function increment() {
      count.value++;
    }
    
    // Хуки жизненного цикла
    onMounted(() => {
      console.log('Компонент смонтирован');
    });
    
    // Наблюдатели
    watch(count, (newValue, oldValue) => {
      console.log(\`count изменен с ${oldValue} на ${newValue}\`);
    });
    
    // Возвращаем все, что должно быть доступно в шаблоне
    return {
      count,
      doubleCount,
      increment
    };
  }
}
</script>
\`\`\`

## Лучшие практики

### 1. Структура проекта
\`\`\`
src/
├── assets/       # Статические файлы (изображения, шрифты)
├── components/   # Переиспользуемые компоненты
│   ├── common/   # Общие компоненты (кнопки, инпуты)
│   └── layout/   # Компоненты макета (хедер, футер)
├── views/        # Компоненты страниц
├── router/       # Настройки маршрутизации
├── store/        # Vuex хранилище
├── services/     # API и внешние сервисы
├── utils/        # Вспомогательные функции
├── App.vue       # Корневой компонент
└── main.js       # Точка входа
\`\`\`

### 2. Именование компонентов
- Используйте PascalCase для имен файлов компонентов: `UserProfile.vue`
- Используйте многословные имена для компонентов: `TodoItem` вместо `Todo`
- Используйте префиксы для базовых компонентов: `BaseButton`, `BaseInput`

### 3. Использование props
- Определяйте типы и валидацию для всех props
- Всегда используйте kebab-case в шаблонах: `<user-profile :user-name="name">`
- Не модифицируйте props напрямую, используйте события для коммуникации с родителем

### 4. Обработка событий
\`\`\`vue
<template>
  <button @click="$emit('update', { id, value })">Обновить</button>
</template>

<script>
export default {
  emits: ['update'],
  props: {
    id: Number,
    value: String
  }
}
</script>
\`\`\`

### 5. Переиспользование кода
- Используйте миксины или композиционный API для повторного использования логики
- Создавайте директивы для повторяющихся DOM-манипуляций
- Выносите бизнес-логику в отдельные сервисы`;
  }
  
  // Общий ответ по фреймворкам
  return `# Фреймворки для веб-разработки

## Frontend фреймворки

### 1. React

**Особенности:**
- Компонентный подход
- Виртуальный DOM
- Одностороннее связывание данных
- JSX синтаксис
- Большая экосистема

**Ключевые концепции:**
- Компоненты (функциональные и классовые)
- Props и State
- Хуки (useState, useEffect, useContext, useReducer)
- Жизненный цикл компонентов

**Основные библиотеки:**
- Redux/MobX для управления состоянием
- React Router для маршрутизации
- Next.js для серверного рендеринга
- styled-components/Emotion для стилизации

### 2. Vue.js

**Особенности:**
- Прогрессивный фреймворк
- Простой синтаксис шаблонов
- Двустороннее связывание данных
- Маленький размер
- Хорошо документирован

**Ключевые концепции:**
- Инстанс Vue и реактивность
- Директивы (v-if, v-for, v-model)
- Вычисляемые свойства и наблюдатели
- Однофайловые компоненты (.vue)
- Composition API (Vue 3)

**Основные библиотеки:**
- Vuex для управления состоянием
- Vue Router для маршрутизации
- Nuxt.js для серверного рендеринга
- Vuetify/Quasar для UI компонентов

### 3. Angular

**Особенности:**
- Полный фреймворк "из коробки"
- TypeScript как основной язык
- Двустороннее связывание данных
- Dependency Injection
- RxJS и реактивное программирование

**Ключевые концепции:**
- Компоненты и модули
- Сервисы и провайдеры
- Директивы и пайпы
- Формы (реактивные и на основе шаблонов)
- NgRx для управления состоянием

**Основные библиотеки:**
- Angular Material для UI компонентов
- Angular Universal для серверного рендеринга
- NgRx для управления состоянием
- Angular CLI для разработки

## Backend фреймворки

### 1. Node.js + Express

**Особенности:**
- JavaScript на сервере
- Неблокирующий ввод/вывод
- Однопоточная модель с event loop
- Большая экосистема npm

**Ключевые концепции:**
- Middleware
- Роутинг
- Контроллеры
- Шаблонизаторы (EJS, Pug, Handlebars)

**Основные библиотеки:**
- Mongoose/Sequelize для работы с БД
- Passport для аутентификации
- Socket.IO для веб-сокетов
- Multer для загрузки файлов

### 2. Django (Python)

**Особенности:**
- "Батарейки включены"
- ORM для работы с БД
- Админ-панель из коробки
- MTV архитектура (Model-Template-View)

**Ключевые концепции:**
- Models (модели данных)
- Views (представления)
- Templates (шаблоны)
- URLs (маршрутизация)
- Forms (формы)

**Основные библиотеки:**
- Django REST Framework для API
- Celery для асинхронных задач
- Django Channels для веб-сокетов
- django-allauth для аутентификации

### 3. Ruby on Rails

**Особенности:**
- Convention over Configuration
- ActiveRecord для ORM
- DRY принцип (Don't Repeat Yourself)
- MVC архитектура

**Ключевые концепции:**
- Models (модели)
- Views (представления)
- Controllers (контроллеры)
- Migrations (миграции БД)
- Active Record (ORM)

## Full-Stack решения

### 1. MERN Stack
- MongoDB
- Express.js
- React
- Node.js

### 2. MEAN Stack
- MongoDB
- Express.js
- Angular
- Node.js

### 3. JAMstack
- JavaScript
- APIs
- Markup (статическая разметка)

## Выбор фреймворка

При выборе фреймворка стоит учитывать:

1. **Цели проекта:**
   - Простой сайт или сложное приложение
   - Требования к масштабируемости
   - Необходимость SEO

2. **Команда:**
   - Опыт разработчиков
   - Предпочтения в языках программирования
   - Скорость обучения

3. **Технические аспекты:**
   - Производительность
   - Размер приложения
   - Возможность SSR
   - Поддержка и развитие фреймворка

4. **Экосистема:**
   - Доступность библиотек
   - Инструменты разработки
   - Сообщество и документация`;
}

/**
 * Генерирует ответ для запросов об API
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generateAPIResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('rest')) {
    return `# REST API - Принципы и лучшие практики

REST (Representational State Transfer) - это архитектурный стиль для создания веб-сервисов.

## Основные принципы REST

### 1. Ресурсный подход

REST API организован вокруг **ресурсов** - любых объектов, данных или сервисов, к которым можно получить доступ.

```
https://api.example.com/users      // Коллекция пользователей
https://api.example.com/users/123  // Конкретный пользователь
```

### 2. HTTP методы

RESTful API использует стандартные HTTP методы для выполнения операций над ресурсами:

| Метод   | Операция                                  | Идемпотентность |
|---------|-------------------------------------------|-----------------|
| GET     | Получение ресурса (чтение)                | Да              |
| POST    | Создание нового ресурса                   | Нет             |
| PUT     | Полное обновление существующего ресурса   | Да              |
| PATCH   | Частичное обновление существующего ресурса| Нет             |
| DELETE  | Удаление ресурса                          | Да              |

### 3. Представления ресурсов

Ресурсы могут иметь разные представления (например, JSON, XML):

```http
GET /users/123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### 4. Stateless (Отсутствие состояния)

Каждый запрос от клиента к серверу должен содержать всю информацию, необходимую для понимания запроса. Сервер не хранит состояние клиента между запросами.

## Проектирование REST API

### 1. Использование существительных во множественном числе для коллекций

```
GET /users        # Получить список пользователей
GET /users/123    # Получить пользователя с ID 123
POST /users       # Создать нового пользователя
PUT /users/123    # Обновить пользователя с ID 123
DELETE /users/123 # Удалить пользователя с ID 123
```

### 2. Вложенные ресурсы

Для представления отношений между ресурсами:

```
GET /users/123/orders      # Получить заказы пользователя 123
GET /users/123/orders/456  # Получить заказ 456 пользователя 123
```

### 3. Фильтрация, сортировка и пагинация

```
GET /users?role=admin       # Фильтрация
GET /users?sort=name        # Сортировка
GET /users?limit=10&page=2  # Пагинация
```

### 4. Версионирование API

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

или через заголовок:

```http
GET /users HTTP/1.1
Accept: application/vnd.example.v2+json
```

## HTTP коды состояния

### Успешные ответы (2xx)
- **200 OK**: Запрос успешно обработан
- **201 Created**: Ресурс успешно создан
- **204 No Content**: Запрос успешен, но нет данных для ответа

### Перенаправления (3xx)
- **301 Moved Permanently**: Ресурс перемещен навсегда
- **304 Not Modified**: Ресурс не изменился с момента последнего запроса

### Клиентские ошибки (4xx)
- **400 Bad Request**: Некорректный запрос
- **401 Unauthorized**: Требуется аутентификация
- **403 Forbidden**: Доступ запрещен
- **404 Not Found**: Ресурс не найден
- **422 Unprocessable Entity**: Ошибка валидации

### Серверные ошибки (5xx)
- **500 Internal Server Error**: Внутренняя ошибка сервера
- **502 Bad Gateway**: Ошибка шлюза
- **503 Service Unavailable**: Сервис временно недоступен

## Безопасность

### 1. Аутентификация и авторизация

- **Basic Authentication**: Передача учетных данных в заголовке
  ```
  Authorization: Basic base64(username:password)
  ```

- **Bearer Token (JWT)**: Использование токена в заголовке
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- **API Keys**: Ключи API в заголовке или параметрах запроса
  ```
  X-API-Key: abcd1234
  ```

### 2. HTTPS

Всегда используйте HTTPS для защиты данных при передаче.

### 3. CORS (Cross-Origin Resource Sharing)

Настраивайте CORS для контроля доступа к вашему API из браузера:

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Документация API

### 1. OpenAPI (Swagger)

OpenAPI - спецификация для документирования REST API.

```yaml
openapi: 3.0.0
info:
  title: Users API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Returns a list of users
      responses:
        '200':
          description: A JSON array of user objects
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

### 2. API Explorer / Тестирование

Предоставляйте интерактивную документацию с возможностью тестирования запросов.

## Примеры реализации REST API

### Node.js + Express

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Получение всех пользователей
app.get('/api/users', (req, res) => {
  // Логика получения пользователей
  res.json(users);
});

// Получение пользователя по ID
app.get('/api/users/:id', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Создание пользователя
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  // Валидация
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  // Логика создания пользователя
  const user = createUser({ name, email });
  res.status(201).json(user);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

### Python + Flask

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/users', methods=['GET'])
def get_users():
    # Логика получения пользователей
    return jsonify(users)

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = find_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    # Валидация
    if not data.get('name') or not data.get('email'):
        return jsonify({'error': 'Name and email are required'}), 400
    # Логика создания пользователя
    user = create_user(data)
    return jsonify(user), 201

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

## Передовые практики REST API

1. **Используйте существительные, а не глаголы** в URL-путях
2. **Никогда не храните состояние** на стороне сервера
3. **Используйте правильные HTTP методы** и статус-коды
4. **Защищайте свой API** с помощью аутентификации и HTTPS
5. **Версионирование API** для обеспечения обратной совместимости
6. **Предоставляйте подробную документацию** с примерами
7. **Реализуйте мониторинг и логирование** для отслеживания проблем
8. **Используйте HATEOAS** для предоставления ссылок на связанные ресурсы
9. **Правильно обрабатывайте ошибки** с информативными сообщениями
10. **Кэширование** для увеличения производительности`;
  }
  
  if (lowerQuery.includes('graphql')) {
    return `# GraphQL - Основы и лучшие практики

GraphQL - язык запросов для API и среда выполнения для их обработки, разработанный Facebook.

## Основные концепции

### 1. Схема и типы

GraphQL API определяется схемой, описывающей доступные типы данных и операции:

\`\`\`graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
  post(id: ID!): Post
  posts: [Post!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}
\`\`\`

### 2. Запросы (Queries)

Запросы позволяют получать данные:

\`\`\`graphql
query {
  user(id: "123") {
    id
    name
    posts {
      id
      title
    }
  }
}
\`\`\`

Результат:

\`\`\`json
{
  "data": {
    "user": {
      "id": "123",
      "name": "John Doe",
      "posts": [
        {
          "id": "1",
          "title": "Introduction to GraphQL"
        },
        {
          "id": "2",
          "title": "Advanced GraphQL Techniques"
        }
      ]
    }
  }
}
\`\`\`

### 3. Мутации (Mutations)

Мутации позволяют изменять данные:

\`\`\`graphql
mutation {
  createPost(
    title: "GraphQL vs REST"
    content: "A comparison between GraphQL and REST API..."
    authorId: "123"
  ) {
    id
    title
    author {
      name
    }
  }
}
\`\`\`

Результат:

\`\`\`json
{
  "data": {
    "createPost": {
      "id": "3",
      "title": "GraphQL vs REST",
      "author": {
        "name": "John Doe"
      }
    }
  }
}
\`\`\`

### 4. Подписки (Subscriptions)

Подписки позволяют получать обновления в реальном времени:

\`\`\`graphql
subscription {
  newPost {
    id
    title
    author {
      name
    }
  }
}
\`\`\`

## Основные преимущества GraphQL

1. **Точный запрос нужных данных** - клиент запрашивает только необходимые поля
2. **Один эндпоинт** - вместо множества эндпоинтов в REST
3. **Сильная типизация** - схема определяет структуру данных
4. **Получение связанных данных за один запрос** - без проблемы N+1 запросов
5. **Версионирование не требуется** - API эволюционирует путем добавления новых полей и типов
6. **Интроспекция** - API самодокументируется через систему типов

## Реализация GraphQL сервера

### Node.js + Apollo Server

\`\`\`javascript
const { ApolloServer, gql } = require('apollo-server');

// Определение схемы
const typeDefs = gql\`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
    post(id: ID!): Post
    posts: [Post!]!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String!, authorId: ID!): Post!
  }
\`;

// Пример данных
const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' }
];

const posts = [
  { id: '1', title: 'GraphQL 101', content: 'Introduction to GraphQL', authorId: '1' }
];

// Resolver-функции
const resolvers = {
  Query: {
    user: (_, { id }) => users.find(user => user.id === id),
    users: () => users,
    post: (_, { id }) => posts.find(post => post.id === id),
    posts: () => posts,
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      const user = { id: String(users.length + 1), name, email };
      users.push(user);
      return user;
    },
    createPost: (_, { title, content, authorId }) => {
      const post = {
        id: String(posts.length + 1),
        title,
        content,
        authorId
      };
      posts.push(post);
      return post;
    }
  },
  User: {
    posts: (user) => posts.filter(post => post.authorId === user.id)
  },
  Post: {
    author: (post) => users.find(user => user.id === post.authorId)
  }
};

// Создание сервера
const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(\`Server ready at ${url}\`);
});
\`\`\`

### Python + Graphene

\`\`\`python
import graphene
from graphene import ObjectType, String, ID, List, Field, Mutation

# Определение типов
class Post(ObjectType):
    id = ID(required=True)
    title = String(required=True)
    content = String(required=True)
    author_id = ID(required=True)
    author = Field(lambda: User)

class User(ObjectType):
    id = ID(required=True)
    name = String(required=True)
    email = String(required=True)
    posts = List(Post)
    
    def resolve_posts(self, info):
        return [post for post in posts if post.author_id == self.id]

# Мутации
class CreateUser(Mutation):
    class Arguments:
        name = String(required=True)
        email = String(required=True)
    
    user = Field(User)
    
    def mutate(self, info, name, email):
        user_id = str(len(users) + 1)
        user = User(id=user_id, name=name, email=email)
        users.append(user)
        return CreateUser(user=user)

class CreatePost(Mutation):
    class Arguments:
        title = String(required=True)
        content = String(required=True)
        author_id = ID(required=True)
    
    post = Field(Post)
    
    def mutate(self, info, title, content, author_id):
        post_id = str(len(posts) + 1)
        post = Post(id=post_id, title=title, content=content, author_id=author_id)
        posts.append(post)
        return CreatePost(post=post)

class Mutation(ObjectType):
    create_user = CreateUser.Field()
    create_post = CreatePost.Field()

# Запросы
class Query(ObjectType):
    user = Field(User, id=ID(required=True))
    users = List(User, required=True)
    post = Field(Post, id=ID(required=True))
    posts = List(Post, required=True)
    
    def resolve_user(self, info, id):
        return next((user for user in users if user.id == id), None)
    
    def resolve_users(self, info):
        return users
    
    def resolve_post(self, info, id):
        return next((post for post in posts if post.id == id), None)
    
    def resolve_posts(self, info):
        return posts

# Пример данных
users = [User(id='1', name='John Doe', email='john@example.com')]
posts = [Post(id='1', title='GraphQL 101', content='Introduction to GraphQL', author_id='1')]

# Создание схемы
schema = graphene.Schema(query=Query, mutation=Mutation)
\`\`\`

## Клиентская часть

### Apollo Client (React)

\`\`\`javascript
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';

// Создание клиента Apollo
const client = new ApolloClient({
  uri: 'http://localhost:4000',
  cache: new InMemoryCache()
});

// Запрос для получения пользователей
const GET_USERS = gql\`
  query GetUsers {
    users {
      id
      name
      posts {
        id
        title
      }
    }
  }
\`;

// Компонент для отображения пользователей
function UsersList() {
  const { loading, error, data } = useQuery(GET_USERS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {data.users.map(user => (
          <li key={user.id}>
            {user.name}
            <ul>
              {user.posts.map(post => (
                <li key={post.id}>{post.title}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Основной компонент приложения
function App() {
  return (
    <ApolloProvider client={client}>
      <div>
        <h1>My GraphQL App</h1>
        <UsersList />
      </div>
    </ApolloProvider>
  );
}
\`\`\`

## Лучшие практики GraphQL

### 1. Проектирование схемы

- **Используйте понятные имена** для типов и полей
- **Избегайте вложенных мутаций** - создавайте отдельные мутации для каждого действия
- **Разделяйте запросы и мутации** - не смешивайте их в одном операции
- **Используйте интерфейсы и объединения** для общих полей
- **Включайте описания** для типов и полей

### 2. Производительность

- **Ограничивайте вложенность** запросов для предотвращения DDoS
- **Используйте паджинацию** для больших коллекций
- **Реализуйте DataLoader** для решения проблемы N+1 запросов
- **Используйте кэширование** на клиенте и сервере

### 3. Безопасность

- **Валидируйте запросы** перед выполнением
- **Ограничивайте сложность** запросов
- **Используйте авторизацию** на уровне полей
- **Не раскрывайте внутренние ошибки** клиенту

### 4. Эволюция API

- **Добавляйте новые поля** вместо изменения существующих
- **Используйте директивы устаревания** (@deprecated) для устаревших полей
- **Никогда не удаляйте поля** без предупреждения
- **Используйте инструменты для отслеживания** использования полей

## Инструменты для работы с GraphQL

1. **Apollo Studio**: Интерфейс для изучения и тестирования API
2. **GraphiQL**: Встроенная среда разработки для выполнения запросов
3. **GraphQL Playground**: Альтернативная среда разработки
4. **GraphQL Voyager**: Визуализация схемы в виде интерактивного графа
5. **GraphQL Code Generator**: Генерация типизированного кода из схемы
6. **Apollo Client DevTools**: Расширение для Chrome для отладки Apollo Client`;
  }
  
  // Общий ответ по API
  return `# API - Основы и лучшие практики

## Что такое API?

API (Application Programming Interface) - интерфейс, который позволяет разным программам взаимодействовать друг с другом.

## Типы API

### 1. REST API

Representational State Transfer - архитектурный стиль для создания веб-сервисов.

**Ключевые принципы:**
- Ресурсный подход
- Использование HTTP методов (GET, POST, PUT, DELETE)
- Stateless (отсутствие состояния)
- Стандартные форматы данных (JSON, XML)

**Пример REST API:**
```http
GET /api/users/123 HTTP/1.1
Host: api.example.com
Accept: application/json
```

```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### 2. GraphQL API

Язык запросов для API, разработанный Facebook.

**Особенности:**
- Один эндпоинт для всех запросов
- Клиент указывает, какие данные ему нужны
- Строгая типизация
- Получение связанных данных в одном запросе

**Пример GraphQL запроса:**
```graphql
query {
  user(id: "123") {
    id
    name
    posts {
      id
      title
    }
  }
}
```

### 3. gRPC

Высокопроизводительный RPC фреймворк, разработанный Google.

**Особенности:**
- Использует Protocol Buffers для сериализации
- Поддерживает потоковую передачу данных
- Более эффективен по сравнению с REST/JSON
- Генерация кода клиента/сервера

### 4. SOAP

XML-протокол для обмена сообщениями.

**Особенности:**
- Строгие стандарты
- Встроенная поддержка безопасности
- Поддержка транзакций
- Сложная структура сообщений

## HTTP методы и коды состояния

### Методы HTTP

| Метод   | Описание                                    |
|---------|---------------------------------------------|
| GET     | Получение ресурса                           |
| POST    | Создание нового ресурса                     |
| PUT     | Полная замена существующего ресурса         |
| PATCH   | Частичное обновление существующего ресурса  |
| DELETE  | Удаление ресурса                            |
| HEAD    | Получение только заголовков                 |
| OPTIONS | Получение поддерживаемых методов для ресурса|

### Коды состояния HTTP

| Код  | Категория       | Примеры                                  |
|------|-----------------|------------------------------------------|
| 2xx  | Успех           | 200 OK, 201 Created, 204 No Content      |
| 3xx  | Перенаправление | 301 Moved Permanently, 304 Not Modified  |
| 4xx  | Ошибки клиента  | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 5xx  | Ошибки сервера  | 500 Internal Server Error, 503 Service Unavailable |

## Аутентификация и авторизация

### Методы аутентификации

1. **Basic Authentication**
   ```
   Authorization: Basic base64(username:password)
   ```

2. **JWT (JSON Web Tokens)**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **API Keys**
   ```
   X-API-Key: your_api_key_here
   ```

4. **OAuth 2.0**
   - Авторизационный код
   - Клиентские учетные данные
   - Неявная авторизация
   - Пароль владельца ресурса

### Авторизация

- **RBAC (Role-Based Access Control)** - доступ на основе ролей
- **ABAC (Attribute-Based Access Control)** - доступ на основе атрибутов
- **Scopes** - области доступа в OAuth 2.0

## Версионирование API

### Стратегии версионирования

1. **URL-путь**
   ```
   https://api.example.com/v1/users
   ```

2. **Параметр запроса**
   ```
   https://api.example.com/users?version=1
   ```

3. **HTTP заголовок**
   ```
   Accept: application/vnd.example.v1+json
   ```

4. **Тип содержимого**
   ```
   Content-Type: application/vnd.example.v1+json
   ```

## Проектирование API

### Принципы проектирования

1. **Используйте существительные, а не глаголы** в URL-путях
   ```
   GET /users     # Хорошо
   GET /getUsers  # Плохо
   ```

2. **Используйте множественное число** для коллекций
   ```
   GET /users     # Хорошо
   GET /user      # Не рекомендуется
   ```

3. **Используйте вложенные ресурсы** для связанных данных
   ```
   GET /users/123/orders
   ```

4. **Предоставляйте фильтрацию, сортировку и пагинацию**
   ```
   GET /users?role=admin&sort=name&page=2&limit=10
   ```

5. **Используйте HATEOAS** (Hypermedia as the Engine of Application State)
   ```json
   {
     "id": 123,
     "name": "John Doe",
     "_links": {
       "self": { "href": "/users/123" },
       "orders": { "href": "/users/123/orders" }
     }
   }
   ```

### Обработка ошибок

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The parameter 'email' is not a valid email address",
    "status": 400,
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

## Документация API

### Инструменты для документации

1. **OpenAPI/Swagger** - спецификация для RESTful API
2. **API Blueprint** - язык описания для веб-API
3. **RAML** - RESTful API Modeling Language
4. **GraphQL Schema** - самодокументирующаяся схема для GraphQL

### Компоненты хорошей документации

1. **Общее описание** API и его назначения
2. **Аутентификация** и процесс получения доступа
3. **Эндпоинты** с примерами запросов и ответов
4. **Параметры** и их описание
5. **Коды ошибок** и их значение
6. **Ограничения** и лимиты API
7. **Примеры кода** на различных языках

## Реализация API

### Node.js + Express

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Middleware для аутентификации
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Проверка токена...
  next();
}

// Получение списка пользователей
app.get('/api/users', authenticate, (req, res) => {
  // Фильтрация, сортировка, пагинация
  const { role, sort, page = 1, limit = 10 } = req.query;
  
  // Логика получения пользователей...
  
  res.json({
    data: users,
    meta: {
      total: 100,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

// Получение пользователя по ID
app.get('/api/users/:id', authenticate, (req, res) => {
  // Логика получения пользователя...
  res.json(user);
});

// Создание пользователя
app.post('/api/users', authenticate, (req, res) => {
  // Валидация входных данных
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'Name and email are required',
        status: 400
      }
    });
  }
  
  // Логика создания пользователя...
  
  res.status(201).json(newUser);
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

### Python + Flask

```python
from flask import Flask, jsonify, request
from functools import wraps

app = Flask(__name__)

# Middleware для аутентификации
def authenticate(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        # Проверка токена...
        return f(*args, **kwargs)
    return decorated

# Получение списка пользователей
@app.route('/api/users', methods=['GET'])
@authenticate
def get_users():
    # Фильтрация, сортировка, пагинация
    role = request.args.get('role')
    sort = request.args.get('sort')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # Логика получения пользователей...
    
    return jsonify({
        "data": users,
        "meta": {
            "total": 100,
            "page": page,
            "limit": limit
        }
    })

# Получение пользователя по ID
@app.route('/api/users/<int:user_id>', methods=['GET'])
@authenticate
def get_user(user_id):
    # Логика получения пользователя...
    return jsonify(user)

# Создание пользователя
@app.route('/api/users', methods=['POST'])
@authenticate
def create_user():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    
    if not name or not email:
        return jsonify({
            "error": {
                "code": "MISSING_FIELDS",
                "message": "Name and email are required",
                "status": 400
            }
        }), 400
    
    # Логика создания пользователя...
    
    return jsonify(new_user), 201

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

## Тестирование API

### Инструменты для тестирования

1. **Postman** - GUI для тестирования API
2. **curl** - консольная утилита для отправки HTTP запросов
3. **Newman** - CLI для запуска коллекций Postman
4. **Jest/Mocha** - фреймворки для автоматизированного тестирования
5. **Supertest** - библиотека для HTTP тестирования в Node.js

### Типы тестов для API

1. **Unit-тесты** - тестирование отдельных функций
2. **Интеграционные тесты** - тестирование взаимодействия компонентов
3. **Функциональные тесты** - тестирование API с точки зрения пользователя
4. **Нагрузочные тесты** - проверка производительности API

## Мониторинг и логирование

### Метрики для мониторинга

1. **Время отклика** - среднее, медиана, 95-й перцентиль
2. **Пропускная способность** - запросы в секунду
3. **Частота ошибок** - процент неудачных запросов
4. **Использование ресурсов** - CPU, память, диск, сеть

### Структурированное логирование

```json
{
  "timestamp": "2023-06-15T14:22:33.123Z",
  "level": "info",
  "method": "GET",
  "path": "/api/users/123",
  "responseTime": 34,
  "statusCode": 200,
  "userId": "user-456",
  "requestId": "req-789"
}
```

## Передовые практики

1. **Используйте HTTPS** для защиты данных
2. **Применяйте Rate Limiting** для защиты от DDoS
3. **Кэшируйте ответы** для улучшения производительности
4. **Используйте сжатие** для уменьшения объема передаваемых данных
5. **Разделяйте чтение и запись** для масштабирования
6. **Предоставляйте SDK** для популярных языков
7. **Поддерживайте обратную совместимость** при обновлениях
8. **Мониторьте использование устаревших функций** перед их удалением
9. **Предоставляйте песочницу** для тестирования API
10. **Регулярно проверяйте безопасность** API`;
}

/**
 * Генерирует общий технический ответ для запросов
 * @param {string} query - вопрос пользователя
 * @returns {string} - сформированный ответ
 */
function generateGeneralTechResponse(query) {
  return `# Анализ технического вопроса

Ваш вопрос связан с технической областью, где я как DeepSpeek AI специализируюсь на предоставлении точных, подробных и доступных объяснений. Вот мой анализ:

## Ключевые аспекты вопроса

Исходя из вашего запроса, необходимо рассмотреть следующие компоненты:

1. **Архитектурные решения** - выбор оптимальной структуры для реализации требуемой функциональности
2. **Алгоритмические подходы** - эффективные способы обработки и трансформации данных
3. **Технологический стек** - набор инструментов, оптимальных для решения задачи
4. **Соображения производительности** - оптимизация по скорости и использованию ресурсов
5. **Масштабируемость** - возможность расширения системы при росте нагрузки

## Технические рекомендации

Для эффективного решения подобных задач рекомендуется:

```javascript
// Пример архитектуры модуля на JavaScript
class DataProcessor {
  constructor(options = {}) {
    this.config = {
      maxBatchSize: 1000,
      timeout: 5000,
      retryCount: 3,
      ...options
    };
    this.cache = new Map();
  }
  
  async process(data) {
    // Валидация входных данных
    if (!this.validate(data)) {
      throw new Error('Invalid input data');
    }
    
    // Проверка кэша
    const cacheKey = this.generateCacheKey(data);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Обработка данных с повторными попытками
    let result;
    for (let i = 0; i <= this.config.retryCount; i++) {
      try {
        result = await this.performProcessing(data);
        break;
      } catch (error) {
        if (i === this.config.retryCount) {
          throw error;
        }
        await this.delay(Math.pow(2, i) * 100); // Экспоненциальная задержка
      }
    }
    
    // Сохранение в кэш
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  // Приватные вспомогательные методы
  validate(data) { /* ... */ }
  generateCacheKey(data) { /* ... */ }
  performProcessing(data) { /* ... */ }
  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
```

## Оптимизация и лучшие практики

1. **Минимизация сложности** - стремитесь к О(n) или лучше, когда это возможно
2. **Асинхронность и параллелизм** - используйте для операций ввода/вывода
3. **Модульность** - разделение ответственности между компонентами
4. **Тестируемость** - написание модульных и интеграционных тестов
5. **Мониторинг и логирование** - для выявления узких мест и отладки

## Возможные проблемы и их решения

| Проблема | Решение |
|----------|---------|
| Высокая латентность | Использование кэширования и оптимизация запросов |
| Утечки памяти | Профилирование и освобождение неиспользуемых ресурсов |
| Сбои в работе | Механизмы повторных попыток и цепи отказов |
| Сложность расширения | Микросервисная архитектура и изоляция компонентов |
| Безопасность | Валидация входных данных и шифрование чувствительной информации |

## Дальнейшие шаги

Для углубления в данную тему я рекомендую:

1. Изучить современные паттерны проектирования, применимые к вашему случаю
2. Рассмотреть инструменты для профилирования и оптимизации
3. Провести нагрузочное тестирование для выявления узких мест
4. Проанализировать похожие системы с открытым исходным кодом`;
}

module.exports = getDeepSpeekResponse;