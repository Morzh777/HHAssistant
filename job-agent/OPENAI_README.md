# Job Agent - OpenAI Integration

## Описание

Этот сервис интегрирован с OpenAI API для анализа резюме с сайта hh.ru. Сервис может извлекать структурированную информацию из HTML резюме с помощью ИИ.

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
PORT=3000
```

### 3. Получение OpenAI API ключа

1. Зайдите на [OpenAI Platform](https://platform.openai.com/)
2. Создайте аккаунт или войдите в существующий
3. Перейдите в раздел "API Keys"
4. Создайте новый API ключ
5. Скопируйте ключ в файл `.env`

## API Endpoints

### Анализ резюме через OpenAI

```http
GET /resume/analyze?url=https://spb.hh.ru/resume/your-resume-id
```

Анализирует резюме по URL и возвращает структурированную информацию.

### Анализ сохраненного резюме

```http
GET /resume/analyze/{resume-id}
```

Анализирует уже сохраненное резюме по его ID.

### Получение структуры резюме

```http
GET /resume/structure/{resume-id}
```

Извлекает базовую структуру резюме без использования OpenAI (бесплатно).

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

### 2. Отправка cookies

Сначала отправьте cookies через Chrome extension:

```http
POST /auth/cookies
Content-Type: application/json

{
  "cookies": "your_hh_ru_cookies_here"
}
```

### 3. Анализ резюме

```bash
curl "http://localhost:3000/resume/analyze?url=https://spb.hh.ru/resume/32f17360ff0e46ee9e0039ed1f715755465a6a"
```

## Файлы

- HTML резюме сохраняются в: `job-agent/data/resumes/`
- Результаты анализа сохраняются в: `job-agent/data/analysis/`

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
