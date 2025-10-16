# HH Assistant - AI-Powered Job Search Assistant

Интеллектуальный помощник для поиска работы на HeadHunter с автоматической генерацией сопроводительных писем на основе AI.

## 🚀 Возможности

- **Chrome Extension** - автоматический сбор cookies и генерация писем прямо на HH.ru
- **AI-анализ резюме** - извлечение структурированных данных из HTML резюме
- **Генерация писем** - персонализированные сопроводительные письма с поддержкой разных AI провайдеров
- **🔍 Анализ вакансий** - проверка на токсичность, красные флаги и адекватность работодателя
- **Сохранение вакансий** - автоматическое сохранение просмотренных вакансий
- **NestJS Backend** - RESTful API с TypeScript и строгой типизацией
- **🤖 Гибкие AI провайдеры** - легкое переключение между OpenAI и Yandex

## 🛠 Технологический стек

### Backend
- **NestJS** - Node.js фреймворк
- **TypeScript** - строгая типизация
- **Универсальная AI архитектура** - поддержка разных провайдеров (OpenAI, Yandex) с простым переключением
- **Prisma** - ORM для работы с БД
- **PostgreSQL + pgvector** - база данных с векторными эмбеддингами
- **Docker** - контейнеризация

### Frontend
- **Chrome Extension** - браузерное расширение
- **JavaScript ES6+** - современный JS
- **Chrome APIs** - работа с cookies и вкладками

### AI & ML
- **OpenAI GPT-5 mini** - генерация сопроводительных писем и анализ
- **Yandex GPT** - альтернативный провайдер AI
- **Простое переключение** - одна строка в конфиге для смены провайдера
- **Универсальные промпты** - оптимизированные промпты для естественных писем
- **Resume parsing** - извлечение данных из HTML резюме
- **Векторные эмбеддинги** - семантический поиск через pgvector

## 📦 Установка

### 1. Клонирование репозитория
```bash
git clone https://github.com/Morzh777/HHAssistant.git
cd HHAssistant
```

### 2. Настройка Backend
```bash
cd job-agent
npm install
cp config.example.env .env
```

### 3. База данных (PostgreSQL + pgvector)

В проекте используется PostgreSQL c расширением `pgvector` для хранения эмбеддингов.

Вариант A — Docker (рекомендуется):
```bash
cd job-agent
docker compose up -d postgres
# проверяем, что БД доступна на 5433
```

Вариант B — локальный Postgres: установите `pgvector` и создайте БД `hhassistant`.

Примените Prisma миграции:
```bash
cd job-agent
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Настройка AI провайдера

Проект поддерживает два AI провайдера. Настройте нужный в `.env`:

```bash
# Только API ключи (чувствительные данные)
OPENAI_API_KEY=your_openai_api_key_here
YANDEX_API_KEY=your_yandex_api_key_here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hhapp
PORT=3000
```

### 5. Переключение AI провайдера

Для переключения между провайдерами измените одну строку в `src/config/ai.config.ts`:

```typescript
// Для OpenAI
export const DEFAULT_AI_PROVIDER = 'openai' as const;

// Для Yandex
export const DEFAULT_AI_PROVIDER = 'yandex' as const;
```

После изменения перезапустите приложение.

### ⚠️ Важно: AI провайдер

**OpenAI:** Для работы с OpenAI API в России необходимо использовать VPN. Убедитесь, что VPN включен перед запуском приложения.

**Yandex:** Российское решение, работает без VPN. Рекомендуется для пользователей в России.

**Переключение:** Просто измените `DEFAULT_AI_PROVIDER` в конфиге и перезапустите приложение.

### 6. Запуск Backend
```bash
npm run start:dev
```

### 7. Установка Chrome Extension
1. Откройте Chrome → Расширения → Режим разработчика
2. Нажмите "Загрузить распакованное расширение"
3. Выберите папку `chrome-extension-hh-cookie`

## 🎯 Использование

### Перед началом работы
⚠️ **Включите VPN** - для работы с OpenAI API требуется VPN соединение

### Chrome Extension

1. **Авторизация на HH.ru** - зайдите на сайт и авторизуйтесь
2. **Сохранение резюме** - откройте страницу своего резюме и нажмите "Сохранить резюме"
3. **Анализ вакансии** - на странице вакансии нажмите "Анализ вакансии 🔍" для проверки на токсичность
4. **Генерация писем** - на странице вакансии нажмите "Создать сопроводительное письмо"
5. **Копирование** - скопируйте сгенерированное письмо и отправьте отклик

### API Endpoints

#### Резюме
- `POST /resume/save-resume` - сохранение и анализ резюме
- `GET /resume/latest` - получение последнего резюме
- `POST /resume/reset-resume` - сброс сохраненных данных

#### Вакансии
- `POST /vacancy-storage/save` - сохранение вакансии
- `GET /vacancy-storage/list` - список сохраненных вакансий
- `GET /vacancy-storage/:id` - получение вакансии по ID

#### AI провайдеры
- `POST /ai/generate-cover-letter` - генерация письма с выбором провайдера
- `POST /ai/analyze-resume-html` - анализ HTML резюме
- `POST /ai/analyze-resume-text` - анализ текста резюме
- `GET /ai/providers` - список доступных провайдеров
- `GET /ai/check-availability` - проверка доступности API

#### Сопроводительные письма
- `GET /cover-letter/latest` - последнее письмо
- `GET /cover-letter/:vacancyId` - письмо для конкретной вакансии

## 🔧 Конфигурация

### AI настройки
Все настройки AI находятся в `src/config/ai.config.ts`:

```typescript
export const AI_CONFIGS = {
  COVER_LETTER: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
  },
  RESUME_ANALYSIS_HTML: {
    model: 'gpt-4o-mini', 
    temperature: 0.1,
  },
  // ... другие конфигурации
};

export const PROVIDER_CONFIGS = {
  OPENAI: {
    COVER_LETTER: { model: 'gpt-4o-mini', temperature: 0.7 },
    RESUME_ANALYSIS: { model: 'gpt-4o-mini', temperature: 0.1 },
  },
  YANDEX: {
    COVER_LETTER: { model: 'yandexgpt', temperature: 0.7 },
    RESUME_ANALYSIS: { model: 'yandexgpt', temperature: 0.1 },
  },
};
```

### Эмбеддинги и pgvector
- Для всех сущностей (резюме, вакансии, сопроводительные письма, анализ вакансий) генерируются эмбеддинги через универсальную AI архитектуру
- Эмбеддинги сохраняются в колонках типа `vector` (`pgvector`) и используются для семантического поиска/сопоставления
- Генерация и сохранение выполняются автоматически в сервисах после создания/обновления записей

### Промпты для писем
Промпты оптимизированы для естественных, живых писем:

- Начинается с "Здравствуйте! Заинтересовала ваша вакансия"
- Максимум 2 абзаца
- Конкретные технологии и проекты
- Без шаблонных фраз
- Фокус на опыте, а не на названиях компаний

### Поддерживаемые AI провайдеры

#### OpenAI
- **Модели**: GPT-4o-mini, text-embedding-3-small
- **API**: https://api.openai.com/v1
- **Конфигурация**: `OPENAI_API_KEY`, `OPENAI_BASE_URL`

#### Yandex GPT
- **Модели**: yandexgpt, yandexgpt-embedding
- **API**: https://llm.api.cloud.yandex.net/foundationModels/v1
- **Конфигурация**: `YANDEX_API_KEY`, `YANDEX_BASE_URL`

#### Переключение провайдеров
```typescript
// В запросе можно указать провайдера
POST /ai/generate-cover-letter
{
  "resume": {...},
  "vacancy": {...},
  "provider": "yandex"  // или "openai"
}
```

## 📁 Структура проекта

```
HHAssistant/
├── chrome-extension-hh-cookie/     # Chrome расширение
│   ├── manifest.json
│   ├── popup.html/js
│   ├── background.js
│   └── options.html/js
├── job-agent/                     # NestJS Backend
│   ├── src/
│   │   ├── ai/                     # Универсальная AI архитектура
│   │   │   ├── providers/          # AI провайдеры (OpenAI, Yandex)
│   │   │   ├── ai.service.ts       # Универсальный AI сервис
│   │   │   ├── ai.controller.ts    # AI контроллер
│   │   │   └── ai.module.ts        # AI модуль
│   │   ├── auth/                   # Авторизация
│   │   ├── cover-letter/           # Сопроводительные письма
│   │   ├── resume/                 # Работа с резюме
│   │   ├── vacancy/                # Работа с вакансиями
│   │   ├── types/                  # TypeScript типы
│   │   └── config/                 # Конфигурация
│   ├── prisma/                     # База данных
│   │   ├── schema.prisma           # Схема БД
│   │   └── migrations/             # Миграции
│   └── package.json
└── README.md
```

## 🔒 Безопасность

- **API ключи** - хранятся в `.env` файлах (не в git)
- **Личные данные** - папка `data/` исключена из git
- **Cookies** - используются только для авторизации на HH.ru
- **HTTPS** - все API запросы через защищенные соединения
- **VPN** - обязательно для работы с OpenAI API в России

## ⚠️ Возможные ошибки

### "Country, region, or territory not supported"
Эта ошибка возникает при попытке использовать OpenAI API без VPN. 

**Решения:**
1. Включите VPN и перезапустите приложение
2. Переключитесь на российские AI решения (YandexGPT, GigaChat)

### "P3018: type 'vector' does not exist"
Включите расширение `pgvector` в миграции (в проекте уже добавлено):
```
CREATE EXTENSION IF NOT EXISTS vector;
```
Убедитесь, что миграции применены: `npx prisma migrate dev`.

### "Письмо для вакансии не найдено"
Это нормальное поведение - система сначала проверяет существующие письма, затем генерирует новые. Если генерация не происходит, проверьте соединение с AI провайдером.

## 🚀 Разработка

### Запуск в режиме разработки
```bash
cd job-agent
npm run start:dev
```

### Сборка
```bash
npm run build
```

### Тестирование
```bash
npm run test
npm run test:e2e
```

### Миграция данных (опционально)
Исторические данные из файловой системы больше не используются. Все данные теперь хранятся в PostgreSQL с векторными эмбеддингами. При необходимости можно создать скрипт миграции для переноса старых данных в БД.

## 📊 Мониторинг

- **Логи** - подробное логирование всех операций
- **Ошибки** - детальная обработка ошибок OpenAI API
- **Метрики** - отслеживание генерации писем и анализа резюме

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.

## 👨‍💻 Автор

**Илья Степанов**
- GitHub: [@Morzh777](https://github.com/Morzh777)
- Email: kla_atu@mail.ru

## 🙏 Благодарности

- OpenAI за GPT-5 mini API
- HeadHunter за открытый API
- NestJS команде за отличный фреймворк
- Chrome Extensions API за возможности браузерной интеграции

---

**Сделано с ❤️ для упрощения поиска работы**
 