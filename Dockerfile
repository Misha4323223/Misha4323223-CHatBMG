FROM node:20-slim

WORKDIR /app

# Копируем файлы проекта
COPY package*.json ./
COPY g4f-proxy.js ./
COPY g4f-index.html ./
COPY .env.example ./.env

# Устанавливаем зависимости
RUN npm install express g4f

# Открываем порт
EXPOSE 3334

# Запускаем прокси-сервер
CMD ["node", "--es-module-specifier-resolution=node", "g4f-proxy.js"]