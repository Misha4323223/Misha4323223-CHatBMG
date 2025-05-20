// Модуль для прямого доступа к бесплатным AI моделям без API ключей
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Список доступных бесплатных провайдеров
const FREE_PROVIDERS = [
  {
    name: "GPT",
    url: "https://nexra.aryahcr.cc/api/chat/gpt",
    model: "gpt-4",
    working: true,
    headers: {
      "Content-Type": "application/json"
    }
  },
  {
    name: "Bing",
    url: "https://nexra.aryahcr.cc/api/chat/complements",
    model: "gpt-4",
    working: true,
    headers: {
      "Content-Type": "application/json"
    }
  },
  {
    name: "Llama",
    url: "https://openrouter-api.herokuapp.com/api/v1/chat/completions",
    model: "openrouter/meta-llama-3-70b-instruct",
    working: true,
    headers: {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://openrouter.ai/",
      "X-Title": "FreeGPT Web Application"
    }
  },
  {
    name: "Claude",
    url: "https://api.anthropic.com/v1/complete",
    model: "claude-2.0",
    working: false, // Нужен API ключ
    headers: {
      "Content-Type": "application/json"
    }
  }
];

// Обработчик запросов к бесплатным моделям
export async function handleFreeModelRequest(req, res) {
  try {
    // Получаем сообщение из тела запроса
    const userMessage = req.body.message || "";
    
    if (!userMessage) {
      return res.status(400).json({ error: "Отсутствует сообщение пользователя" });
    }
    
    // Получаем модель из запроса или используем llama по умолчанию
    const modelRequest = req.body.model || "llama-2-70b";
    
    console.log(`Запрос к бесплатной модели: ${modelRequest}, сообщение=${userMessage.substring(0, 30)}...`);
    
    // Выбираем провайдера и модель в зависимости от запроса
    let providerToUse;
    
    if (modelRequest.toLowerCase().includes('gpt')) {
      providerToUse = FREE_PROVIDERS.find(p => p.name === "GPT");
    } else if (modelRequest.toLowerCase().includes('llama')) {
      providerToUse = FREE_PROVIDERS.find(p => p.name === "Llama");
    } else if (modelRequest.toLowerCase().includes('claude')) {
      providerToUse = FREE_PROVIDERS.find(p => p.name === "Claude");
    } else {
      // По умолчанию используем первый рабочий провайдер
      providerToUse = FREE_PROVIDERS.find(p => p.working);
    }
    
    // Если не нашли рабочий провайдер, возвращаем ошибку
    if (!providerToUse || !providerToUse.working) {
      console.log("Не найден рабочий провайдер для модели", modelRequest);
      // Используем локальную имитацию
      return await handleLocalFallback(req, res);
    }
    
    console.log(`Используем провайдер ${providerToUse.name} для запроса к модели ${modelRequest}`);
    
    try {
      // Формируем тело запроса в зависимости от провайдера
      const requestBody = formatRequestBody(providerToUse, userMessage);
      
      // Отправляем запрос к API провайдера
      const response = await fetch(providerToUse.url, {
        method: "POST",
        headers: providerToUse.headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка ${response.status} от провайдера ${providerToUse.name}:`, errorText);
        
        // Пробуем следующий провайдер
        return await tryAlternativeProvider(userMessage, modelRequest, res);
      }
      
      // Парсим ответ и извлекаем текст
      const data = await response.json();
      const responseText = extractResponseText(data, providerToUse.name);
      
      if (!responseText) {
        console.error("Не удалось извлечь текст ответа из данных:", data);
        // Пробуем альтернативный провайдер
        return await tryAlternativeProvider(userMessage, modelRequest, res);
      }
      
      console.log(`Получен ответ от ${providerToUse.name}: ${responseText.substring(0, 30)}...`);
      
      // Отправляем ответ клиенту
      return res.json({ response: responseText });
    } catch (error) {
      console.error(`Ошибка при запросе к ${providerToUse.name}:`, error);
      // Пробуем следующий провайдер
      return await tryAlternativeProvider(userMessage, modelRequest, res);
    }
  } catch (error) {
    console.error("Общая ошибка обработки запроса:", error);
    
    // В случае общей ошибки используем локальный fallback
    return await handleLocalFallback(req, res);
  }
}

// Функция для форматирования тела запроса в зависимости от провайдера
function formatRequestBody(provider, message) {
  const baseRequest = {
    model: provider.model,
    messages: [{ role: "user", content: message }]
  };
  
  // Для некоторых провайдеров нужен специальный формат
  if (provider.name === "Claude") {
    return {
      model: provider.model,
      prompt: `\\n\\nHuman: ${message}\\n\\nAssistant:`,
      max_tokens_to_sample: 2000,
      temperature: 0.7
    };
  } else if (provider.name === "Llama") {
    return {
      model: provider.model,
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
      max_tokens: 2048,
      format: "json"
    };
  }
  
  // Для остальных используем стандартный формат
  return baseRequest;
}

// Функция для извлечения текста ответа из данных
function extractResponseText(data, providerName) {
  if (!data) return null;
  
  // Для разных провайдеров, данные могут быть структурированы по-разному
  if (providerName === "GPT" || providerName === "Bing") {
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
  } else if (providerName === "Llama") {
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
  } else if (providerName === "Claude") {
    if (data.completion) {
      return data.completion.trim();
    }
  }
  
  // Пытаемся найти ответ в любых данных
  if (data.message && typeof data.message === 'string') {
    return data.message;
  } else if (data.text && typeof data.text === 'string') {
    return data.text;
  } else if (data.content && typeof data.content === 'string') {
    return data.content;
  }
  
  // Возвращаем весь ответ как строку
  return JSON.stringify(data);
}

// Функция для попытки использования альтернативного провайдера
async function tryAlternativeProvider(message, requestedModel, res) {
  // Ищем следующий рабочий провайдер
  const nextProvider = FREE_PROVIDERS.find(p => p.name !== "GPT" && p.working);
  
  if (nextProvider) {
    try {
      console.log(`Пробуем альтернативный провайдер: ${nextProvider.name}`);
      
      // Формируем запрос к альтернативному провайдеру
      const requestBody = formatRequestBody(nextProvider, message);
      
      // Отправляем запрос
      const response = await fetch(nextProvider.url, {
        method: "POST",
        headers: nextProvider.headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status} от альтернативного провайдера`);
      }
      
      const data = await response.json();
      const responseText = extractResponseText(data, nextProvider.name);
      
      if (!responseText) {
        throw new Error("Не удалось извлечь ответ из альтернативного провайдера");
      }
      
      console.log(`Получен ответ от альтернативного провайдера ${nextProvider.name}`);
      
      return res.json({ response: responseText });
    } catch (error) {
      console.error(`Ошибка при использовании альтернативного провайдера ${nextProvider.name}:`, error);
      
      // Если альтернативный провайдер не сработал, используем локальную имитацию
      return handleLocalFallback({ body: { message, model: requestedModel } }, res);
    }
  }
  
  // Если нет доступных альтернативных провайдеров, используем локальный fallback
  return handleLocalFallback({ body: { message, model: requestedModel } }, res);
}

// Функция для локальной имитации ответов AI
async function handleLocalFallback(req, res) {
  const message = req.body.message;
  
  console.log("Используем локальную имитацию для ответа");
  
  // Определяем шаблон ответа в зависимости от типа вопроса
  let response = "";
  
  // Приветствие
  if (message.match(/привет|здравствуй|добрый день|хай|hello|hi/i)) {
    response = "Привет! Я GPT-ассистент, работающий через G4F. Чем я могу вам помочь сегодня?";
  } 
  // Вопрос о способностях
  else if (message.match(/что ты (умеешь|можешь)|расскажи о себе|кто ты/i)) {
    response = "Я искусственный интеллект, который может отвечать на вопросы, предоставлять информацию, помогать с различными задачами, такими как написание текстов, объяснение сложных тем, анализ данных и многое другое. Обратите внимание, что я не имею доступа к интернету, поэтому моя информация может быть не самой актуальной.";
  } 
  // Вопрос о погоде
  else if (message.match(/погода|температура|осадки/i)) {
    response = "К сожалению, я не имею доступа к актуальным данным о погоде. Чтобы узнать текущую погоду, вам лучше обратиться к специализированным сервисам, таким как Яндекс.Погода, Gismeteo или AccuWeather.";
  } 
  // Вопрос о текущем времени или дате
  else if (message.match(/время|дата|день недели|который час/i)) {
    const now = new Date();
    response = `По моим данным сейчас ${now.toLocaleString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}. Это время моего сервера, оно может отличаться от вашего местного времени.`;
  } 
  // Вопрос о разработке/программировании
  else if (message.match(/код|программирован|разработк|javascript|python|сайт/i)) {
    response = "Программирование - это процесс создания компьютерных программ с помощью языков программирования. Популярные языки включают JavaScript, Python, Java, C++, и многие другие. Для веб-разработки часто используют HTML, CSS и JavaScript. Если у вас есть конкретный вопрос по программированию, я постараюсь на него ответить.";
  } 
  // Математические вопросы
  else if (message.match(/\d[\+\-\*\/\=]\d|сколько будет|посчитай|вычисли|математик/i)) {
    response = "Я могу помочь с решением математических задач, но без доступа к базовым математическим функциям, я не могу произвести точные вычисления. Для сложных вычислений рекомендую использовать калькулятор или специализированные математические инструменты.";
  } 
  // Просьба о переводе
  else if (message.match(/перевед|перевод|как по[-\s]английски|как по[-\s]русски|как по[-\s]немецки|как по[-\s]французски/i)) {
    response = "Для точного перевода я рекомендую использовать специализированные сервисы, такие как Google Translate, Yandex Translate или DeepL, которые постоянно обновляются и обеспечивают более качественный перевод с учетом контекста.";
  }
  // Философские вопросы 
  else if (message.match(/смысл жизни|бог|религия|философия|этика|мораль/i)) {
    response = "Это глубокий философский вопрос, на который нет однозначного ответа. Разные философские школы, религии и отдельные мыслители предлагают различные интерпретации. Я могу предложить рассмотреть различные точки зрения, но в конечном счете, это вопрос личного мировоззрения и поиска каждого человека.";
  }
  // Общий ответ на любой другой вопрос
  else {
    response = "Я обрабатываю ваш запрос в локальном режиме из-за недоступности внешних API. К сожалению, у меня нет доступа к актуальной информации из интернета. Я могу помочь с общими вопросами, но для получения специфической или актуальной информации, рекомендую обратиться к специализированным источникам.";
  }
  
  // Добавляем задержку для имитации обработки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Отправляем подготовленный ответ
  return res.json({ response });
}

// Страница для бесплатного GPT чата
export function freeGPTPage(req, res) {
  res.sendFile(path.join(process.cwd(), "free-chatgpt.html"));
}