# Технологический стек

## Frontend
- **Next.js 14** - React фреймворк (тонкий клиент)
- **TypeScript** - типизация
- **Tailwind CSS** - стили
- **SWR** - управление состоянием
- **Axios** - HTTP клиент для API

## Backend
- **NestJS** - Node.js фреймворк
- **Passport.js** - авторизация (OAuth HeadHunter)
- **@nestjs/jwt** - JWT токены
- **Prisma** - ORM для базы данных
- **PostgreSQL** - база данных
- **Redis** - кэширование и очереди
- **Bull** - фоновые задачи

## ИИ и внешние API
- **LocalAI** - локальный ИИ с OpenAI-совместимым API
- **t-pro-it-2.0:q2_k** - специализированная модель для IT
- **HeadHunter API** - поиск вакансий

## Инфраструктура
- **Docker** - контейнеризация

## Архитектура

### Next.js как тонкий клиент
- React компоненты для UI
- Отправка запросов к NestJS бэкенду

### NestJS как полноценный бэкенд
- OAuth HeadHunter авторизация
- Prisma + PostgreSQL
- HeadHunter API интеграция
- LocalAI интеграция
- Бизнес-логика

### Поток данных
1. Frontend → NestJS Backend (REST API)
2. NestJS → Prisma → PostgreSQL
3. NestJS → HeadHunter API
4. NestJS → LocalAI

## LocalAI с t-pro-it-2.0

### Docker Compose
```yaml
version: '3.8'
services:
  localai:
    image: localai/localai:latest
    ports:
      - "8080:8080"
    environment:
      - MODELS_PATH=/models
      - THREADS=4
    volumes:
      - ./models:/models
      - ./config:/config
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - LOCALAI_URL=http://localai:8080
      - DATABASE_URL=postgresql://user:pass@postgres:5432/hhapp
    depends_on:
      - localai
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=hhapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Конфигурация модели
```yaml
# config/models.yaml
models:
  - name: t-pro-it-2.0
    backend: llama
    parameters:
      model: t-pro-it-2.0:q2_k
      context_size: 32768
      threads: 4
      temperature: 0.3
```

### NestJS интеграция
```typescript
@Injectable()
export class LocalAIService {
  private readonly baseUrl = process.env.LOCALAI_URL || 'http://localhost:8080'
  private readonly model = 't-pro-it-2.0'

  async generateCoverLetter(vacancy: any, resume: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'user',
          content: `Напиши персонализированное сопроводительное письмо для вакансии: ${vacancy.name} на основе резюме: ${resume.title}`
        }],
        temperature: 0.3,
        max_tokens: 1000
      })
    })
    
    const data = await response.json()
    return data.choices[0].message.content
  }

  async analyzeVacancy(vacancy: any, resume: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'user',
          content: `Проанализируй соответствие вакансии "${vacancy.name}" резюме "${resume.title}". Верни JSON с полями: match_score (0-1), matching_skills (массив), missing_skills (массив), recommendation (текст)`
        }],
        temperature: 0.1
      })
    })
    
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  }
}

@Controller('ai')
export class AIController {
  constructor(private readonly localAIService: LocalAIService) {}

  @Post('cover-letter')
  async generateCoverLetter(@Body() body: { vacancy: any, resume: any }) {
    return await this.localAIService.generateCoverLetter(body.vacancy, body.resume)
  }

  @Post('analyze-vacancy')
  async analyzeVacancy(@Body() body: { vacancy: any, resume: any }) {
    return await this.localAIService.analyzeVacancy(body.vacancy, body.resume)
  }
}
```

### Запуск
```bash
# Запуск системы
docker-compose up -d

# Проверка статуса
curl http://localhost:8080/v1/models
```

### Производительность t-pro-it-2.0
- Анализ вакансии: 3-5 секунд
- Генерация письма: 5-8 секунд
- RAM: ~8-10GB
- Точность: 85-95% для IT задач

