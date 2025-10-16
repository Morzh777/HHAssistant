# Job Agent - AI Integration

## Описание

Этот сервис интегрирован с универсальной AI архитектурой для анализа резюме с сайта hh.ru. Сервис поддерживает два AI провайдера (OpenAI, Yandex) с простым переключением через конфигурацию.

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Только API ключи (чувствительные данные)
OPENAI_API_KEY=your_openai_api_key_here
YANDEX_API_KEY=your_yandex_api_key_here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hhapp
PORT=3000
```

### 3. Переключение AI провайдера

Для переключения между провайдерами измените одну строку в `src/config/ai.config.ts`:

```typescript
// Для OpenAI
export const DEFAULT_AI_PROVIDER = 'openai' as const;

// Для Yandex
export const DEFAULT_AI_PROVIDER = 'yandex' as const;
```

После изменения перезапустите приложение.

### 4. Получение API ключей

#### OpenAI API ключ
1. Зайдите на [OpenAI Platform](https://platform.openai.com/)
2. Создайте аккаунт или войдите в существующий
3. Перейдите в раздел "API Keys"
4. Создайте новый API ключ
5. Скопируйте ключ в файл `.env`

#### Yandex API ключ
1. Зайдите на [Yandex Cloud](https://cloud.yandex.ru/)
2. Создайте сервисный аккаунт
3. Назначьте роль `ai.languageModels.user`
4. Создайте API ключ
5. Скопируйте ключ в файл `.env`

## API Endpoints

### Универсальные AI endpoints

#### Генерация сопроводительного письма
```http
POST /ai/generate-cover-letter
Content-Type: application/json

{
  "resume": {...},
  "vacancy": {...},
  "provider": "openai"  // опционально: "openai", "yandex"
}
```

#### Анализ HTML резюме
```http
POST /ai/analyze-resume-html
Content-Type: application/json

{
  "html": "<html>...</html>",
  "provider": "yandex"  // опционально
}
```

#### Анализ текста резюме
```http
POST /ai/analyze-resume-text
Content-Type: application/json

{
  "text": "Текст резюме...",
  "provider": "openai"  // опционально
}
```

#### Получение доступных провайдеров
```http
GET /ai/providers
```

#### Проверка доступности API
```http
GET /ai/check-availability?provider=openai
```

### Специализированные endpoints

#### Анализ резюме через URL
```http
GET /resume/analyze?url=https://spb.hh.ru/resume/your-resume-id
```

#### Получение последнего резюме
```http
GET /resume/latest
```

## Структура ответа

Сервис возвращает JSON с следующей структурой:

```json
{
  "personalInfo": {
    "fullName": "ФИО",
    "email": "email@example.com",
    "phone": "+7 (999) 123-45-67",
    "location": "Санкт-Петербург"
  },
  "position": "Fullstack-разработчик",
  "about": "Краткое описание о себе",
  "experience": [
    {
      "company": "Название компании",
      "position": "Должность",
      "period": "2020-2023",
      "description": "Описание обязанностей"
    }
  ],
  "education": [
    {
      "institution": "Учебное заведение",
      "degree": "Специальность",
      "period": "2016-2020"
    }
  ],
  "skills": [
    {
      "name": "TypeScript",
      "level": "Продвинутый",
      "verified": true
    }
  ],
  "languages": [
    {
      "language": "Английский",
      "level": "B2"
    }
  ],
  "additionalInfo": {
    "certificates": [],
    "projects": [],
    "other": "Другая информация"
  }
}
```

## Использование

### 1. Запуск сервиса

```bash
npm run start:dev
```

### 2. Проверка доступных провайдеров

```bash
curl "http://localhost:3000/ai/providers"
```

Ответ:
```json
{
  "success": true,
  "availableProviders": ["openai", "yandex"],
  "defaultProvider": "openai",
  "providers": [
    {
      "type": "openai",
      "name": "Openai",
      "available": true
    },
    {
      "type": "yandex", 
      "name": "Yandex",
      "available": true
    }
  ]
}
```

### 3. Проверка доступности API

```bash
curl "http://localhost:3000/ai/check-availability?provider=openai"
```

### 4. Анализ резюме с выбором провайдера

```bash
curl -X POST "http://localhost:3000/ai/analyze-resume-html" \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html>...</html>",
    "provider": "yandex"
  }'
```

### 5. Генерация сопроводительного письма

```bash
curl -X POST "http://localhost:3000/ai/generate-cover-letter" \
  -H "Content-Type: application/json" \
  -d '{
    "resume": {...},
    "vacancy": {...},
    "provider": "openai"
  }'
```

## Хранение данных

- HTML резюме и результаты анализа сохраняются в PostgreSQL
- Векторные эмбеддинги сохраняются в pgvector для семантического поиска
- Все данные доступны через API endpoints

## Стоимость

- Используется модель `gpt-4o-mini` для экономии средств
- Примерная стоимость анализа одного резюме: $0.01-0.05
- С $20 на балансе можно проанализировать 400-2000 резюме

## Обработка ошибок

Сервис обрабатывает следующие ошибки:

- `401 Unauthorized` - Cookies не найдены
- `404 Not Found` - Резюме не найдено
- `503 Service Unavailable` - OpenAI API недоступен
- `400 Bad Request` - Ошибка анализа

## Логирование

Все операции логируются с помощью NestJS Logger. Проверьте консоль для отладки.


