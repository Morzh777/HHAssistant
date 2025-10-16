# Технологический стек HH Assistant

## 🎯 Архитектура проекта

HH Assistant состоит из двух основных компонентов:
- **Chrome Extension** - браузерное расширение для работы с HH.ru
- **NestJS Backend** - серверная часть с AI интеграцией

## 🖥 Frontend (Chrome Extension)

### Основные технологии
- **JavaScript ES6+** - современный JavaScript
- **Chrome Extensions API** - работа с браузером
- **Manifest V3** - современный формат расширений
- **HTML5/CSS3** - интерфейс расширения

### Функциональность
- **Cookie Management** - автоматический сбор cookies с HH.ru
- **Tab Detection** - определение страниц резюме и вакансий
- **Background Scripts** - фоновые задачи и API вызовы
- **Popup Interface** - пользовательский интерфейс
- **Notification System** - уведомления о статусе операций

### Структура расширения
```
chrome-extension-hh-cookie/
├── manifest.json          # Конфигурация расширения
├── background.js          # Service Worker (фоновые задачи)
├── popup.html/js         # Интерфейс расширения
├── options.html/js       # Настройки
└── cover-letter.html     # Отображение писем
```

## ⚙️ Backend (NestJS)

### Основные технологии
- **NestJS** - Node.js фреймворк с декораторами
- **TypeScript** - строгая типизация
- **Универсальная AI архитектура** - поддержка разных провайдеров (OpenAI, Yandex) с простым переключением
- **PostgreSQL + pgvector** - база данных с векторными эмбеддингами
- **Prisma ORM** - работа с базой данных
- **HTTP Client** - работа с внешними API

### Архитектурные принципы
- **Modular Design** - модульная архитектура
- **Dependency Injection** - внедрение зависимостей
- **Decorators** - декораторы для контроллеров и сервисов
- **Guards & Interceptors** - защита и перехват запросов
- **Centralized Configuration** - централизованная конфигурация
- **Provider Pattern** - универсальные AI провайдеры

### Модули системы
```
src/
├── ai/                     # Универсальная AI архитектура
│   ├── providers/          # AI провайдеры
│   │   ├── openai.provider.ts    # OpenAI провайдер
│   │   └── yandex.provider.ts    # Yandex провайдер
│   ├── ai.service.ts       # Универсальный AI сервис
│   ├── ai.controller.ts     # AI контроллер
│   └── ai.module.ts        # AI модуль
├── auth/                   # Авторизация и cookies
├── cover-letter/           # Сопроводительные письма
├── resume/                 # Работа с резюме
├── vacancy/                # Работа с вакансиями
├── types/                  # TypeScript типы
└── config/                 # Конфигурация
```

## 🤖 AI & Machine Learning

### Универсальная AI архитектура
- **Provider Pattern** - универсальный интерфейс для всех AI провайдеров
- **OpenAI GPT-5 mini** - основная модель для генерации
- **Yandex GPT** - альтернативный провайдер
- **Простое переключение** - одна строка в конфиге для смены провайдера
- **Векторные эмбеддинги** - семантический поиск через pgvector
- **Error Handling** - обработка ошибок API

### Поддерживаемые провайдеры
```typescript
// OpenAI Provider
interface OpenAIProvider {
  generateText(prompt: string, systemPrompt: string, config: AIConfig): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  checkApiAvailability(): Promise<boolean>;
}

// Yandex Provider  
interface YandexProvider {
  generateText(prompt: string, systemPrompt: string, config: AIConfig): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  checkApiAvailability(): Promise<boolean>;
}
```

### Промпт-инжиниринг
```typescript
// Системный промпт
'Ты пишешь короткие сопроводительные письма. Пиши как живой человек - естественно, но профессионально. Избегай шаблонов и формальностей. Фокусируйся на конкретных технологиях и опыте.'

// Пользовательский промпт
'Здравствуйте! Заинтересовала ваша вакансия [позиция] — у меня есть реальные проекты на [технологии]. Строил [конкретные проекты], делал [задачи]. Хочется присоединиться к команде.'
```

### Оптимизация промптов
- **Естественность** - избегание шаблонных фраз
- **Конкретность** - упоминание реальных технологий
- **Персонализация** - адаптация под вакансию
- **Краткость** - максимум 2 абзаца

## 💾 Хранение данных

### База данных PostgreSQL
```
job-agent/
├── prisma/schema.prisma    # Схема базы данных
├── prisma/migrations/     # Миграции БД
└── src/                   # Сервисы для работы с БД
```

### Форматы данных
- **Resume Analysis** - структурированный JSON в БД
- **Cover Letters** - текстовые данные в БД с векторными эмбеддингами
- **Vacancies** - JSON с полной информацией в БД
- **Cookies** - текстовые данные в БД для авторизации

### Безопасность данных
- **Database Storage** - все данные хранятся в PostgreSQL
- **Vector Embeddings** - семантический поиск через pgvector
- **Encrypted Connections** - защищенные соединения с БД

## 🔧 Конфигурация

### Централизованная конфигурация
```typescript
// src/config/ai.config.ts
export const DEFAULT_AI_PROVIDER = 'openai' as const; // или 'yandex'

// Автоматически выбирается нужный провайдер
export const ACTIVE_PROVIDER_CONFIG = 
  DEFAULT_AI_PROVIDER === 'openai' ? OPENAI_CONFIGS : YANDEX_CONFIGS;

export const ACTIVE_PROVIDER_URL = 
  DEFAULT_AI_PROVIDER === 'openai' ? OPENAI_BASE_URL : YANDEX_BASE_URL;
```

### Переменные окружения
```bash
# .env - только чувствительные данные
OPENAI_API_KEY=your_openai_api_key_here
YANDEX_API_KEY=your_yandex_api_key_here
PORT=3000
NODE_ENV=development
```

### Настройки расширения
```json
// manifest.json
{
  "manifest_version": 3,
  "name": "HH Assistant",
  "permissions": [
    "cookies",
    "tabs",
    "notifications",
    "storage"
  ],
  "host_permissions": [
    "https://*.hh.ru/*"
  ]
}
```

## 🚀 Развертывание

### Локальная разработка
```bash
# Backend
cd job-agent
npm install
npm run start:dev

# Chrome Extension
# Загрузить в Chrome через "Режим разработчика"
```

### Production
```bash
# Сборка
npm run build

# Запуск
npm run start:prod
```

## 📊 Мониторинг и логирование

### Логирование
- **NestJS Logger** - встроенное логирование
- **Request/Response** - логирование всех запросов
- **Error Tracking** - детальная обработка ошибок
- **Performance** - отслеживание времени выполнения

### Метрики
- **Cover Letter Generation** - количество сгенерированных писем
- **Resume Analysis** - успешность анализа резюме
- **API Usage** - использование OpenAI API
- **Error Rates** - частота ошибок

## 🔒 Безопасность

### Защита данных
- **API Keys** - хранение в .env файлах
- **Local Storage** - данные не покидают локальную машину
- **HTTPS Only** - все API запросы через HTTPS
- **No Sensitive Data** - исключение личных данных из git

### Ограничения API
- **Rate Limiting** - соблюдение лимитов OpenAI
- **Error Handling** - обработка всех типов ошибок
- **Retry Logic** - повторные попытки при сбоях
- **Timeout Management** - управление таймаутами

## 🎯 Производительность

### Оптимизации
- **Caching** - кэширование результатов анализа
- **Batch Processing** - группировка запросов
- **Lazy Loading** - загрузка по требованию
- **Memory Management** - управление памятью

### Метрики производительности
- **Cover Letter Generation** - 2-5 секунд
- **Resume Analysis** - 3-7 секунд
- **API Response Time** - < 1 секунды
- **Memory Usage** - ~100MB в runtime

## 🔄 Интеграции

### Внешние API
- **OpenAI API** - генерация текста
- **HeadHunter API** - получение данных вакансий
- **Chrome APIs** - работа с браузером

### Внутренние сервисы
- **Resume Service** - анализ и хранение резюме
- **Vacancy Service** - работа с вакансиями
- **Cover Letter Service** - генерация писем
- **AI Service** - универсальная интеграция с AI провайдерами

---

**Технологический стек оптимизирован для простоты развертывания и высокой производительности**