# HeadHunter Job Agent API

## Обзор

HeadHunter Job Agent - это NestJS приложение для работы с HeadHunter API. Предоставляет универсальные методы для поиска вакансий, анализа и автоматизации процессов поиска работы.

## 🚀 Быстрый старт

### Запуск приложения

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run start:dev

# Сборка проекта
npm run build
```

### Базовые запросы

```bash
# Поиск вакансий
curl "http://localhost:3000/vacancies/search?text=python&area=1&per_page=5"

# Детальная информация о вакансии
curl "http://localhost:3000/vacancies/125979327"

# Получение справочников
curl "http://localhost:3000/vacancies/areas"
curl "http://localhost:3000/vacancies/skills"
curl "http://localhost:3000/vacancies/professional-roles"
```

## 📋 API Endpoints

### Поиск вакансий

**GET** `/vacancies/search`

Поддерживает все параметры HeadHunter API для универсального поиска вакансий.

#### Основные параметры поиска

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `text` | string | Поисковый запрос (ключевые слова) | `"python developer"` |
| `search_field` | string | Область поиска | `"name"`, `"description"` |

#### Фильтры по опыту и занятости

| Параметр | Тип | Описание | Возможные значения |
|----------|-----|----------|-------------------|
| `experience` | string | Опыт работы | `"noExperience"`, `"between1And3"`, `"between3And6"`, `"moreThan6"` |
| `employment` | string | Тип занятости (deprecated) | `"full"`, `"part"`, `"project"`, `"volunteer"`, `"probation"` |
| `schedule` | string | График работы (deprecated) | `"fullDay"`, `"shift"`, `"flexible"`, `"remote"`, `"flyInFlyOut"` |

#### Географические фильтры

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `area` | string | ID региона | `"1"` (Москва), `"2"` (СПб) |
| `metro` | string | ID станции метро | `"2.34"` (Динамо) |
| `top_lat` | number | Верхняя граница широты | `55.8` |
| `bottom_lat` | number | Нижняя граница широты | `55.7` |
| `left_lng` | number | Левая граница долготы | `37.5` |
| `right_lng` | number | Правая граница долготы | `37.6` |

#### Профессиональные фильтры

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `professional_role` | string | ID профессиональной области | `"96"` (Программист) |
| `industry` | string | ID индустрии компании | `"7"` (IT) |

#### Фильтры по работодателю

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `employer_id` | string | ID работодателя | `"852361"` |

#### Фильтры по зарплате

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `salary` | number | Размер зарплаты | `100000` |
| `currency` | string | Валюта | `"RUR"`, `"USD"`, `"EUR"` |
| `only_with_salary` | boolean | Только с указанной зарплатой | `true` |
| `describe_currency` | string | Валюта для описания зарплаты | `"RUR"` |

#### Фильтры по времени

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `period` | number | Количество дней для поиска | `7` |
| `date_from` | string | Дата начала (ISO 8601) | `"2024-01-01"` |
| `date_to` | string | Дата окончания (ISO 8601) | `"2024-01-31"` |

#### Фильтры по меткам

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `label` | string | ID метки вакансии | `"with_salary"` |

#### Сортировка и дополнительные параметры

| Параметр | Тип | Описание | Возможные значения |
|----------|-----|----------|-------------------|
| `order_by` | string | Поле для сортировки | `"publication_time"`, `"salary_desc"`, `"salary_asc"` |
| `order` | string | Направление сортировки | `"asc"`, `"desc"` |
| `clusters` | boolean | Включить кластеры | `true` |

#### Пагинация

| Параметр | Тип | Описание | По умолчанию | Максимум |
|----------|-----|----------|--------------|----------|
| `per_page` | number | Количество результатов | `10` | `100` |
| `page` | number | Номер страницы | `0` | `199` |

#### Множественные значения (массивы)

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `professional_roles` | string[] | Профессиональные роли | `["96", "97"]` |
| `skills` | string[] | Навыки | `["Python", "Django"]` |
| `areas` | string[] | Регионы | `["1", "2"]` |
| `metro_stations` | string[] | Станции метро | `["2.34", "2.35"]` |
| `industries` | string[] | Индустрии | `["7", "8"]` |
| `employer_ids` | string[] | ID работодателей | `["852361", "123456"]` |
| `labels` | string[] | Метки | `["with_salary", "remote"]` |

### Примеры запросов

#### Базовый поиск

```bash
curl "http://localhost:3000/vacancies/search?text=python&area=1&per_page=10"
```

#### Расширенный поиск с фильтрами

```bash
curl "http://localhost:3000/vacancies/search?text=frontend&area=1&experience=between1And3&salary=80000&currency=RUR&only_with_salary=true&per_page=20"
```

#### Поиск по координатам

```bash
curl "http://localhost:3000/vacancies/search?text=developer&top_lat=55.8&bottom_lat=55.7&left_lng=37.5&right_lng=37.6"
```

#### Поиск с временными фильтрами

```bash
curl "http://localhost:3000/vacancies/search?text=python&period=7&date_from=2024-01-01"
```

#### Поиск с множественными значениями

```bash
curl "http://localhost:3000/vacancies/search?professional_roles=96&professional_roles=97&areas=1&areas=2"
```

#### Поиск с кластерами

```bash
curl "http://localhost:3000/vacancies/search?text=developer&clusters=true&per_page=0"
```

### Детальная информация о вакансии

**GET** `/vacancies/:id`

Получение полной информации о конкретной вакансии.

```bash
curl "http://localhost:3000/vacancies/125979327"
```

### Справочники

#### Регионы

**GET** `/vacancies/areas`

Получение списка всех регионов.

```bash
curl "http://localhost:3000/vacancies/areas"
```

#### Навыки

**GET** `/vacancies/skills`

Получение списка всех навыков.

```bash
curl "http://localhost:3000/vacancies/skills"
```

#### Профессиональные роли

**GET** `/vacancies/professional-roles`

Получение списка профессиональных ролей.

```bash
curl "http://localhost:3000/vacancies/professional-roles"
```

## 🔧 Технические детали

### Ограничения API

- **Глубина поиска**: максимум 2000 результатов (page * per_page ≤ 2000)
- **Размер страницы**: максимум 100 результатов на страницу
- **Rate limiting**: HeadHunter может ограничивать количество запросов

### Обработка ошибок

API возвращает стандартные HTTP коды ошибок:

- `200` - Успешный запрос
- `400` - Ошибка в параметрах запроса
- `403` - Ошибка авторизации
- `404` - Ресурс не найден
- `429` - Превышен лимит запросов

### Формат ответов

Все ответы возвращаются в формате JSON с единообразной структурой:

```json
{
  "items": [...],
  "found": 1000,
  "pages": 100,
  "per_page": 10,
  "page": 0,
  "clusters": {...}
}
```

## 🚀 Возможности

### ✅ Реализовано

- [x] Универсальный поиск вакансий с поддержкой всех параметров HeadHunter API
- [x] Получение детальной информации о вакансиях
- [x] Доступ к справочникам (регионы, навыки, профессиональные роли)
- [x] Поддержка множественных значений для фильтров
- [x] Географический поиск по координатам
- [x] Временные фильтры
- [x] Кластеры для анализа данных
- [x] Пагинация результатов

### 🔄 В разработке

- [ ] ИИ-анализ вакансий
- [ ] Генерация сопроводительных писем
- [ ] Автоматические рекомендации
- [ ] Мониторинг новых вакансий

## 📚 Полезные ссылки

- [HeadHunter API Документация](https://api.hh.ru/openapi/redoc)
- [Язык запросов HeadHunter](https://hh.ru/article/1175)
- [Справочники HeadHunter](https://api.hh.ru/dictionaries)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.