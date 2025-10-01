#!/bin/bash

# Быстрая очистка порта 3000

echo "🔍 Ищем процессы на порту 3000..."
PROCESSES=$(lsof -ti:3000)

if [ ! -z "$PROCESSES" ]; then
    echo "⚠️  Найдены процессы: $PROCESSES"
    echo "🛑 Убиваем процессы..."
    kill -9 $PROCESSES
    sleep 1
    echo "✅ Порт 3000 очищен"
else
    echo "✅ Порт 3000 уже свободен"
fi
