# HH Job Agent - Работа с HeadHunter API

## Обзор HeadHunter API

HeadHunter предоставляет REST API для работы с вакансиями, резюме и откликами. API доступен по адресу `https://api.hh.ru/` и требует авторизации через OAuth 2.0.

## Авторизация через личный аккаунт

### 1. Регистрация приложения
1. Перейдите на [https://dev.hh.ru/](https://dev.hh.ru/)
2. Создайте новое приложение
3. Получите `client_id` и `client_secret`
4. Укажите `redirect_uri` для вашего приложения

### 2. OAuth авторизация через ваш аккаунт
```python
import requests
import webbrowser

# Шаг 1: Перенаправление пользователя на авторизацию
def get_authorization_code(client_id, redirect_uri):
    auth_url = f"https://hh.ru/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}"
    print(f"Перейдите по ссылке для авторизации: {auth_url}")
    webbrowser.open(auth_url)
    
    # Пользователь должен скопировать code из URL после авторизации
    code = input("Введите authorization code из URL: ")
    return code

# Шаг 2: Обмен code на access_token
def get_access_token(client_id, client_secret, code):
    token_url = "https://hh.ru/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code
    }
    response = requests.post(token_url, data=data)
    return response.json()["access_token"]
```

### 3. Использование токена в запросах
```python
headers = {
    "Authorization": f"Bearer {access_token}",
    "User-Agent": "YourApp/1.0 (your-email@example.com)"
}
```

### 4. Получение данных вашего аккаунта
```python
# Получение списка ваших резюме
def get_my_resumes(access_token):
    url = "https://api.hh.ru/resumes/mine"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    return response.json()

# Получение детальной информации о резюме
def get_resume_details(resume_id, access_token):
    url = f"https://api.hh.ru/resumes/{resume_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    return response.json()
```

## Основные эндпоинты

### Поиск вакансий
```python
# Базовый поиск
GET /vacancies?text=python+developer&area=1&salary=100000

# Расширенный поиск с фильтрами
GET /vacancies?text=python&area=1&experience=between3And6&employment=full&schedule=fullDay&salary=100000&currency=RUR&only_with_salary=true
```

**Параметры поиска:**
- `text` - ключевые слова для поиска
- `area` - ID региона (1 - Москва, 2 - СПб)
- `experience` - опыт работы (noExperience, between1And3, between3And6, moreThan6)
- `employment` - тип занятости (full, part, project, volunteer, probation)
- `schedule` - график работы (fullDay, shift, flexible, remote, flyInFlyOut)
- `salary` - желаемая зарплата
- `currency` - валюта (RUR, USD, EUR)
- `only_with_salary` - только с указанной зарплатой

### Получение детальной информации о вакансии
```python
GET /vacancies/{vacancy_id}
```

**Ответ содержит:**
- Полное описание вакансии
- Требования к кандидату
- Условия работы
- Информацию о работодателе
- Контактные данные

### Работа с резюме
```python
# Получение списка резюме пользователя
GET /resumes/mine

# Получение конкретного резюме
GET /resumes/{resume_id}
```

### Рекомендуемые вакансии на основе резюме

Хотя HeadHunter API не предоставляет прямой эндпоинт для получения "рекомендуемых" вакансий, вы можете реализовать собственную систему рекомендаций:

```python
def get_recommended_vacancies(resume_data, access_token):
    """
    Получение вакансий, соответствующих резюме пользователя
    """
    # Извлекаем ключевые навыки из резюме
    skills = extract_skills_from_resume(resume_data)
    experience = resume_data.get('experience', [])
    desired_position = resume_data.get('title', '')
    
    # Формируем поисковый запрос на основе резюме
    search_text = f"{desired_position} {' '.join(skills)}"
    
    # Поиск вакансий с параметрами из резюме
    url = "https://api.hh.ru/vacancies"
    params = {
        "text": search_text,
        "area": resume_data.get('area', {}).get('id', 1),  # Регион из резюме
        "experience": map_experience_level(experience),
        "employment": "full",  # или из резюме
        "per_page": 50
    }
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, params=params, headers=headers)
    vacancies = response.json()
    
    # Дополнительная фильтрация и ранжирование
    return rank_vacancies_by_relevance(vacancies, resume_data)

def extract_skills_from_resume(resume_data):
    """
    Извлечение ключевых навыков из резюме
    """
    skills = []
    
    # Навыки из специального поля
    if 'key_skills' in resume_data:
        skills.extend([skill['name'] for skill in resume_data['key_skills']])
    
    # Навыки из опыта работы
    for exp in resume_data.get('experience', []):
        if 'description' in exp:
            skills.extend(extract_skills_from_text(exp['description']))
    
    return list(set(skills))  # Убираем дубликаты

def rank_vacancies_by_relevance(vacancies, resume_data):
    """
    Ранжирование вакансий по релевантности резюме
    """
    resume_skills = extract_skills_from_resume(resume_data)
    scored_vacancies = []
    
    for vacancy in vacancies['items']:
        # Получаем детальную информацию о вакансии
        vacancy_details = get_vacancy_details(vacancy['id'])
        
        # Вычисляем score соответствия
        score = calculate_match_score(vacancy_details, resume_skills)
        
        scored_vacancies.append({
            'vacancy': vacancy,
            'details': vacancy_details,
            'match_score': score
        })
    
    # Сортируем по score
    return sorted(scored_vacancies, key=lambda x: x['match_score'], reverse=True)
```

### Автоматические поиски (Saved Searches)

HeadHunter API поддерживает сохраненные поиски, которые можно использовать для автоматического получения новых вакансий:

```python
# Создание сохраненного поиска
def create_saved_search(search_params, access_token):
    url = "https://api.hh.ru/saved_searches"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    data = {
        "name": "Автопоиск по резюме",
        "url": f"/vacancies?{urlencode(search_params)}"
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Получение результатов сохраненного поиска
def get_saved_search_results(search_id, access_token):
    url = f"https://api.hh.ru/saved_searches/{search_id}/results"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(url, headers=headers)
    return response.json()
```

### Отправка откликов
```python
POST /negotiations
{
    "resume_id": "123456",
    "vacancy_id": "789012",
    "message": "Персонализированное сопроводительное письмо"
}
```

**Важные ограничения:**
- Максимум 200 откликов в день
- Нельзя откликаться на одну вакансию дважды
- Некоторые вакансии требуют обязательного сопроводительного письма

### Получение активных откликов
```python
GET /negotiations?status=active
```

## Обработка ошибок

### Стандартные коды ошибок
- `400` - Неверные параметры запроса
- `401` - Неверная авторизация
- `403` - Недостаточно прав
- `404` - Ресурс не найден
- `429` - Превышен лимит запросов

### Структура ошибки
```json
{
    "errors": [
        {
            "type": "bad_argument",
            "value": "parameter_name"
        }
    ]
}
```

### Специфичные ошибки для откликов
- `limit_exceeded` - превышен лимит откликов
- `duplicate` - повторный отклик на вакансию
- `resume_not_found` - резюме не найдено или скрыто
- `vacancy_archived` - вакансия архивирована

## Rate Limiting

API имеет ограничения на количество запросов:
- **Поиск вакансий**: 1000 запросов в день
- **Получение деталей**: 10000 запросов в день
- **Отправка откликов**: 200 в день

**Рекомендации:**
- Используйте кэширование результатов
- Добавляйте задержки между запросами
- Обрабатывайте HTTP 429 ошибки с retry логикой

## Использование личного аккаунта для персональных рекомендаций

### Полный цикл работы с вашим аккаунтом
```python
def setup_personal_job_search():
    """
    Настройка персонального поиска работы на основе вашего аккаунта
    """
    # 1. Авторизация через ваш аккаунт
    access_token = get_access_token_from_oauth()
    
    # 2. Получение ваших резюме
    resumes = get_my_resumes(access_token)
    main_resume = resumes['items'][0]  # Берем основное резюме
    
    # 3. Получение детальной информации о резюме
    resume_details = get_resume_details(main_resume['id'], access_token)
    
    # 4. Создание персонального поиска
    search_params = create_personal_search_params(resume_details)
    
    # 5. Создание сохраненного поиска для автоматических уведомлений
    saved_search = create_saved_search(search_params, access_token)
    
    return {
        'access_token': access_token,
        'resume': resume_details,
        'saved_search_id': saved_search['id']
    }

def create_personal_search_params(resume_data):
    """
    Создание параметров поиска на основе резюме
    """
    # Извлекаем ключевые данные из резюме
    title = resume_data.get('title', '')
    skills = [skill['name'] for skill in resume_data.get('key_skills', [])]
    area = resume_data.get('area', {}).get('id', 1)
    salary = resume_data.get('salary', {}).get('amount')
    
    # Формируем поисковый запрос
    search_text = f"{title} {' '.join(skills[:5])}"  # Ограничиваем количество навыков
    
    params = {
        "text": search_text,
        "area": area,
        "per_page": 50,
        "only_with_salary": True
    }
    
    if salary:
        params["salary"] = salary
    
    return params

def get_personal_recommendations(access_token, resume_data):
    """
    Получение персональных рекомендаций вакансий
    """
    # Получаем вакансии на основе резюме
    recommended_vacancies = get_recommended_vacancies(resume_data, access_token)
    
    # Фильтруем только высокорелевантные
    high_relevance = [v for v in recommended_vacancies if v['match_score'] > 0.7]
    
    return high_relevance
```

## Примеры использования

### Поиск вакансий по навыкам
```python
def search_vacancies_by_skills(skills, area_id=1):
    url = "https://api.hh.ru/vacancies"
    params = {
        "text": " ".join(skills),
        "area": area_id,
        "per_page": 50,
        "only_with_salary": True
    }
    
    response = requests.get(url, params=params, headers=headers)
    return response.json()
```

### Анализ соответствия вакансии резюме
```python
def analyze_vacancy_match(vacancy, resume_skills):
    vacancy_text = f"{vacancy['name']} {vacancy['description']}"
    vacancy_skills = extract_skills_from_text(vacancy_text)
    
    match_score = calculate_skill_match(resume_skills, vacancy_skills)
    return match_score
```

### Отправка персонализированного отклика
```python
def send_personalized_response(vacancy_id, resume_id, cover_letter):
    url = "https://api.hh.ru/negotiations"
    data = {
        "resume_id": resume_id,
        "vacancy_id": vacancy_id,
        "message": cover_letter
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.status_code == 201
```

## Полезные ссылки

- [Официальная документация API](https://api.hh.ru/openapi/redoc)
- [Регистрация приложения](https://dev.hh.ru/)
- [Примеры использования](https://github.com/hhru/api)
- [Форум разработчиков](https://github.com/hhru/api/discussions)

## Важные замечания

1. **Соблюдайте правила использования** - не злоупотребляйте API
2. **Тестируйте на тестовых данных** - используйте sandbox окружение
3. **Обрабатывайте все ошибки** - API может возвращать неожиданные ответы
4. **Кэшируйте результаты** - это поможет избежать лишних запросов
5. **Уважайте работодателей** - отправляйте только релевантные отклики
