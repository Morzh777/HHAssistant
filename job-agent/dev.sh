#!/bin/bash

# Быстрая очистка порта 3000 и запуск dev сервера

echo "🔍 Очищаем порт 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Порт уже свободен"

echo "⏳ Ждем 2 секунды..."
sleep 2

echo "🚀 Запускаем dev сервер..."
npm run start:dev
