export interface OpenAIConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
}

export const OPENAI_CONFIGS = {
  // Конфигурация для генерации сопроводительных писем
  COVER_LETTER: {
    model: 'gpt-5-mini',
    // GPT-5 mini не поддерживает кастомную температуру, только default (1)
  } as OpenAIConfig,

  // Конфигурация для анализа HTML резюме
  RESUME_ANALYSIS_HTML: {
    model: 'gpt-5-mini',
    // GPT-5 mini не поддерживает кастомную температуру, только default (1)
  } as OpenAIConfig,

  // Конфигурация для анализа текста резюме
  RESUME_ANALYSIS_TEXT: {
    model: 'gpt-5-mini',
    // GPT-5 mini не поддерживает кастомную температуру, только default (1)
  } as OpenAIConfig,

  // Конфигурация для проверки API
  API_CHECK: {
    model: 'gpt-5-mini',
    // GPT-5 mini не поддерживает кастомную температуру, только default (1)
  } as OpenAIConfig,
} as const;

// Системные промпты
export const SYSTEM_PROMPTS = {
  COVER_LETTER:
    'Ты пишешь короткие сопроводительные письма. Пиши как живой человек - естественно, но профессионально. Избегай шаблонов и формальностей. Фокусируйся на конкретных технологиях и опыте.',

  RESUME_ANALYSIS:
    'Ты эксперт по анализу резюме. Извлекай только факты из HTML, не добавляй ничего от себя. Отвечай только в формате JSON.',

  RESUME_TEXT_ANALYSIS:
    'Ты эксперт по анализу резюме. Извлекай только факты из текста, не добавляй ничего от себя. Отвечай только в формате JSON.',
} as const;

// Промпты для пользователя
export const USER_PROMPTS = {
  COVER_LETTER: (resumeData: any, vacancyData: any) => `
Напиши короткое сопроводительное письмо на основе резюме и вакансии.

РЕЗЮМЕ:
${JSON.stringify(resumeData, null, 2)}

ВАКАНСИЯ:
${JSON.stringify(vacancyData, null, 2)}

Правила:
- Начинай с "Здравствуйте! Заинтересовала ваша вакансия"
- Максимум 2 абзаца
- Пиши как живой человек - естественно и без формальностей
- Упомяни конкретные технологии и проекты из резюме
- Покажи, что читал вакансию - упомяни название позиции, но НЕ название компании
- Свяжи свой опыт с требованиями вакансии
- Используй живые фразы: "хочется", "интересно", "готов"
- Избегай: "выразить интерес", "отличная возможность", "профессиональный рост"
- НЕ упоминай названия компаний/проектов - пиши про технологии и задачи
- Пиши от первого лица
- Закончи естественно, без "С уважением"
- НЕ придумывай лишние детали

Пример стиля:
"Здравствуйте! Заинтересовала ваша вакансия Node.js-разработчика — у меня есть реальные проекты на Node.js и TypeScript. Строил микросервисный бэкенд на NestJS с PostgreSQL, делал gRPC-интеграции и AI-классификацию, писал Telegram-бота с оплатами и API Gateway. Хочется применять эти технологии в новых проектах."

Ответ: только текст письма.
`,

  RESUME_ANALYSIS_HTML: (html: string) => `
Проанализируй HTML код резюме с сайта hh.ru и извлеки структурированную информацию в JSON формате.

ВАЖНО: Обязательно найди и включи ВСЕ секции резюме: Опыт работы, Навыки, Образование, О себе, Повышение квалификации/курсы, Тесты и экзамены, Сертификаты.

Верни JSON объект со следующей структурой:
{
  "personalInfo": {
    "fullName": "ФИО",
    "email": "email",
    "phone": "телефон",
    "location": "местоположение"
  },
  "position": "желаемая должность",
  "about": "краткое описание о себе",
  "experience": [
    {
      "company": "название компании",
      "position": "должность",
      "period": "период работы",
      "description": "описание обязанностей"
    }
  ],
  "education": [
    {
      "institution": "учебное заведение",
      "degree": "степень/специальность",
      "period": "период обучения"
    }
  ],
  "skills": [
    {
      "name": "название навыка",
      "level": "уровень (если указан)",
      "verified": "подтвержден ли навык"
    }
  ],
  "languages": [
    {
      "language": "язык",
      "level": "уровень владения"
    }
  ],
  "courses": [
    {
      "name": "название курса",
      "institution": "учреждение",
      "period": "период прохождения",
      "description": "описание курса"
    }
  ],
  "tests": [
    {
      "name": "название теста/экзамена",
      "score": "результат",
      "period": "период прохождения",
      "description": "описание"
    }
  ],
  "certificates": [
    {
      "name": "название сертификата",
      "issuer": "выдающая организация",
      "period": "период получения",
      "description": "описание"
    }
  ],
  "additionalInfo": {
    "projects": [],
    "other": "другая информация"
  }
}

HTML код резюме:
${html}
`,

  RESUME_ANALYSIS_TEXT: (text: string) => `
Проанализируй текст резюме с сайта hh.ru и извлеки структурированную информацию в JSON формате.

ВАЖНО: Внимательно найди и включи ВСЕ секции резюме:
- Опыт работы (места работы, должности, периоды, описания)
- Навыки (технологии, языки программирования, инструменты)
- Образование (учебные заведения, специальности, годы)
- О себе (краткое описание кандидата, его цели, особенности)
- Повышение квалификации/курсы (дополнительное обучение, курсы)
- Тесты и экзамены (пройденные тесты, результаты)
- Сертификаты (полученные сертификаты, дипломы)

Если какая-то секция отсутствует в резюме, оставь соответствующий массив пустым [].

Верни JSON объект со следующей структурой:
{
  "personalInfo": {
    "fullName": "ФИО",
    "email": "email",
    "phone": "телефон",
    "location": "местоположение"
  },
  "position": "желаемая должность",
  "about": "краткое описание о себе (если есть)",
  "experience": [
    {
      "company": "название компании",
      "position": "должность",
      "period": "период работы",
      "description": "описание обязанностей"
    }
  ],
  "education": [
    {
      "institution": "учебное заведение",
      "degree": "степень/специальность",
      "period": "период обучения"
    }
  ],
  "skills": [
    {
      "name": "название навыка",
      "level": "уровень (если указан)",
      "verified": "подтвержден ли навык"
    }
  ],
  "languages": [
    {
      "language": "язык",
      "level": "уровень владения"
    }
  ],
  "courses": [
    {
      "name": "название курса",
      "institution": "учреждение",
      "period": "период прохождения",
      "description": "описание курса"
    }
  ],
  "tests": [
    {
      "name": "название теста/экзамена",
      "score": "результат",
      "period": "период прохождения",
      "description": "описание"
    }
  ],
  "certificates": [
    {
      "name": "название сертификата",
      "issuer": "выдающая организация",
      "period": "период получения",
      "description": "описание"
    }
  ],
  "additionalInfo": {
    "projects": [],
    "other": "другая информация"
  }
}

Текст резюме:
${text}
`,
} as const;

// Пути и директории
export const FILE_PATHS = {
  COVER_LETTERS_DIR: 'job-agent/data/cover-letters',
  VACANCIES_DIR: 'job-agent/data/vacancies',
  RESUMES_DIR: 'job-agent/data/resumes',
} as const;

// Шаблоны имен файлов
export const FILE_TEMPLATES = {
  COVER_LETTER: 'cover_letter_{vacancyId}_{date}.txt',
  VACANCY: 'vacancy_{vacancyId}_{date}.json',
  RESUME: '{resumeId}.html',
} as const;

// Регулярные выражения
export const REGEX_PATTERNS = {
  COVER_LETTER_VACANCY_ID: /cover_letter_([^_]+)_/,
  VACANCY_FILE: /vacancy_([^_]+)_/,
  FILE_SEPARATOR: /========================/,
  RESUME_ID: /\/resume\/([a-f0-9]+)/,
} as const;

// Шаблоны содержимого файлов
export const FILE_CONTENT_TEMPLATES = {
  COVER_LETTER_HEADER: `СОПРОВОДИТЕЛЬНОЕ ПИСЬМО
========================

Вакансия: {vacancyName}
ID вакансии: {vacancyId}
Дата генерации: {generatedAt}
Зарплата: {salary}

========================

{coverLetter}

========================
Сгенерировано с помощью OpenAI API`,
} as const;

// Константы
export const CONSTANTS = {
  UNKNOWN_VALUE: 'unknown',
  NOT_SPECIFIED: 'Не указано',
  NOT_SPECIFIED_SALARY: 'Не указана',
  DATE_FORMAT: 'YYYY-MM-DD',
} as const;
