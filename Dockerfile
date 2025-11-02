# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json backend
COPY backend/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код backend
COPY backend/ ./

# Открываем порт 3001
EXPOSE 3001

# Запускаем приложение
CMD ["npm", "start"]