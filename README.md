# HH Assistant - AI-Powered Job Search Assistant

Интеллектуальный помощник для поиска работы на HeadHunter с автоматической генерацией сопроводительных писем на основе AI.

## 🚀 Возможности

- **Chrome Extension** - автоматический сбор cookies и генерация писем прямо на HH.ru
- **AI-анализ резюме** - извлечение структурированных данных из HTML резюме
- **Генерация писем** - персонализированные сопроводительные письма с помощью GPT-5 mini
- **🔍 Анализ вакансий** - проверка на токсичность, красные флаги и адекватность работодателя
- **Сохранение вакансий** - автоматическое сохранение просмотренных вакансий
- **NestJS Backend** - RESTful API с TypeScript и строгой типизацией

## 🛠 Технологический стек

### Backend
- **NestJS** - Node.js фреймворк
- **TypeScript** - строгая типизация
- **OpenAI API** - GPT-5 mini для генерации писем
- **Prisma** - ORM для работы с БД
- **Docker** - контейнеризация

### Frontend
- **Chrome Extension** - браузерное расширение
- **JavaScript ES6+** - современный JS
- **Chrome APIs** - работа с cookies и вкладками

### AI & ML
- **GPT-5 mini** - генерация сопроводительных писем
- **Custom prompts** - оптимизированные промпты для естественных писем
- **Resume parsing** - извлечение данных из HTML резюме

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

### 3. Настройка переменных окружения
```bash
# .env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

### ⚠️ Важно: AI провайдер
**Вариант 1 (OpenAI):** Для работы с OpenAI API в России необходимо использовать VPN. Убедитесь, что VPN включен перед запуском приложения.

**Вариант 2 (Российские решения):** Можно использовать отечественные AI решения:
- **YandexGPT** - API от Яндекса
- **GigaChat** - решение от Сбера  
- **Kandinsky** - для генерации текста

Для переключения на другой провайдер потребуется изменить конфигурацию в `src/config/openai.config.ts`.

### 4. Запуск Backend
```bash
npm run start:dev
```

### 5. Установка Chrome Extension
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

#### Сопроводительные письма
- `GET /cover-letter/latest` - последнее письмо
- `GET /cover-letter/:vacancyId` - письмо для конкретной вакансии

#### Анализ вакансий
- `POST /vacancy-analysis/analyze/:vacancyId` - анализ вакансии на токсичность
- `GET /vacancy-analysis/:vacancyId` - получение существующего анализа
- `GET /vacancy-analysis` - список всех анализов
- `GET /vacancy-analysis/stats/summary` - статистика анализов

#### OpenAI
- `POST /openai/generate-cover-letter` - генерация нового письма

## 🔧 Конфигурация

### OpenAI настройки
Все настройки AI находятся в `src/config/openai.config.ts`:

```typescript
export const OPENAI_CONFIGS = {
  COVER_LETTER: {
    model: 'gpt-5-mini',
    // GPT-5 mini не поддерживает кастомную температуру
  },
  // ... другие конфигурации
}
```

### Промпты для писем
Промпты оптимизированы для естественных, живых писем:

- Начинается с "Здравствуйте! Заинтересовала ваша вакансия"
- Максимум 2 абзаца
- Конкретные технологии и проекты
- Без шаблонных фраз
- Фокус на опыте, а не на названиях компаний

### Альтернативные AI провайдеры

#### YandexGPT
```typescript
// В src/config/openai.config.ts
const YANDEX_API_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
const YANDEX_API_KEY = 'your_yandex_api_key';
```

#### GigaChat (Сбер)
```typescript
// В src/config/openai.config.ts  
const GIGACHAT_API_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
const GIGACHAT_TOKEN = 'your_gigachat_token';
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
│   │   ├── auth/                  # Авторизация
│   │   ├── cover-letter/          # Сопроводительные письма
│   │   ├── openai/                # OpenAI интеграция
│   │   ├── resume/                # Работа с резюме
│   │   ├── vacancy/               # Работа с вакансиями
│   │   ├── types/                 # TypeScript типы
│   │   └── config/                # Конфигурация
│   ├── job-agent/data/            # Данные (в .gitignore)
│   │   ├── analysis/              # Анализ резюме
│   │   ├── cover-letters/         # Сгенерированные письма
│   │   ├── resumes/               # HTML резюме
│   │   └── vacancies/             # JSON вакансии
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


DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hhassistant?schema=public
OPENAI_API_KEY=REDACTED_OPENAI_KEY