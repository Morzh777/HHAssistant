# Как работает выбор провайдера и модели

## Архитектура

Теперь логика выбора модели находится в самих провайдерах:

### OpenAI Provider (`src/ai/providers/openai.provider.ts`)
```typescript
export const OPENAI_CONFIGS = {
  COVER_LETTER: { model: 'gpt-5-mini', temperature: 0.7 },
  RESUME_ANALYSIS: { model: 'gpt-5-mini', temperature: 0.1 },
  VACANCY_ANALYSIS: { model: 'gpt-5-mini', temperature: 0.3 },
  API_CHECK: { model: 'gpt-5-mini', temperature: 0, maxTokens: 10 },
  EMBEDDINGS: { model: 'text-embedding-3-small', temperature: 0 },
} as const;

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';
```

### Yandex Provider (`src/ai/providers/yandex.provider.ts`)
```typescript
export const YANDEX_CONFIGS = {
  COVER_LETTER: { model: 'yandexgpt', temperature: 0.7 },
  RESUME_ANALYSIS: { model: 'yandexgpt', temperature: 0.1 },
  VACANCY_ANALYSIS: { model: 'yandexgpt', temperature: 0.3 },
  API_CHECK: { model: 'yandexgpt', temperature: 0, maxTokens: 10 },
  EMBEDDINGS: { model: 'yandexgpt-embedding', temperature: 0 },
} as const;

export const YANDEX_BASE_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1';
```

### Конфигурация (`src/config/ai.config.ts`)
```typescript
// Импортируем конфигурации из провайдеров
import { OPENAI_CONFIGS, OPENAI_BASE_URL } from '../ai/providers/openai.provider';
import { YANDEX_CONFIGS, YANDEX_BASE_URL } from '../ai/providers/yandex.provider';

// Провайдер по умолчанию
export const DEFAULT_AI_PROVIDER = 'openai' as const;

// Базовые URL провайдеров
export const PROVIDER_URLS = {
  OPENAI: OPENAI_BASE_URL,
  YANDEX: YANDEX_BASE_URL,
} as const;

// Экспортируем конфигурации провайдеров
export const PROVIDER_CONFIGS = {
  OPENAI: OPENAI_CONFIGS,
  YANDEX: YANDEX_CONFIGS,
} as const;
```

## Логика выбора

1. **Провайдер по умолчанию**: `AI_DEFAULT_PROVIDER=openai` (из .env)
2. **Модель**: Берется из конфигурации конкретного провайдера через `provider.getConfig(taskType)`
3. **Переключение**: Можно указать провайдера в запросе

## Примеры использования

### Генерация письма через OpenAI (по умолчанию)
```bash
POST /ai/generate-cover-letter
{
  "resume": {...},
  "vacancy": {...}
}
# Использует: OpenAI + gpt-5-mini
```

### Генерация письма через Yandex
```bash
POST /ai/generate-cover-letter
{
  "resume": {...},
  "vacancy": {...},
  "provider": "yandex"
}
# Использует: Yandex + yandexgpt
```

### Анализ резюме через OpenAI
```bash
POST /ai/analyze-resume-html
{
  "html": "<html>...</html>"
}
# Использует: OpenAI + gpt-5-mini (temperature: 0.1)
```

### Анализ резюме через Yandex
```bash
POST /ai/analyze-resume-html
{
  "html": "<html>...</html>",
  "provider": "yandex"
}
# Использует: Yandex + yandexgpt (temperature: 0.1)
```

## Переменные окружения

```env
# Только API ключи (чувствительные данные)
OPENAI_API_KEY=your_key
YANDEX_API_KEY=your_key

# Остальные настройки в конфиге (не чувствительные данные)
# DEFAULT_AI_PROVIDER = 'openai' (в src/config/ai.config.ts)
# ACTIVE_PROVIDER_URL = {...} (в src/config/ai.config.ts)
```

## Как переключить провайдера

Чтобы переключиться на другой провайдер, просто измените значение в `src/config/ai.config.ts`:

```typescript
// Для OpenAI
export const DEFAULT_AI_PROVIDER = 'openai' as const;

// Для Yandex  
export const DEFAULT_AI_PROVIDER = 'yandex' as const;
```

После изменения перезапустите приложение.

## Преимущества новой архитектуры

1. **Инкапсуляция**: Каждый провайдер знает свои модели
2. **Расширяемость**: Легко добавить новый провайдер
3. **Типобезопасность**: TypeScript проверяет конфигурации
4. **Централизация**: Все конфигурации в одном месте
