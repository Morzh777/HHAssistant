import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Vacancy } from '../types/vacancy.types';

@Injectable()
export class VacancyService {
  private readonly HH_API_BASE_URL = 'https://api.hh.ru';
  private readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  // Конфигурация параметров поиска
  private readonly SINGLE_PARAM_KEYS: readonly string[];
  private readonly ARRAY_PARAM_MAPPINGS: Array<{
    key: string;
    field: string;
  }>;
  private readonly SERIALIZERS: Record<string, (v: unknown) => string>;

  constructor() {
    this.SINGLE_PARAM_KEYS = [
      'text',
      'search_field',
      'experience',
      'employment',
      'schedule',
      'area',
      'metro',
      'professional_role',
      'industry',
      'employer_id',
      'salary',
      'currency',
      'label',
      'period',
      'date_from',
      'date_to',
      'top_lat',
      'bottom_lat',
      'left_lng',
      'right_lng',
      'order_by',
      'order',
      'describe_currency',
      'per_page',
      'page',
      // булевые флаги, добавляются только когда true
      'only_with_salary',
      'clusters',
    ] as const;

    this.ARRAY_PARAM_MAPPINGS = [
      { key: 'professional_role', field: 'professional_roles' },
      { key: 'skill', field: 'skills' },
      { key: 'area', field: 'areas' },
      { key: 'metro', field: 'metro_stations' },
      { key: 'industry', field: 'industries' },
      { key: 'employer_id', field: 'employer_ids' },
      { key: 'label', field: 'labels' },
    ];

    this.SERIALIZERS = {
      // boolean → 'true' только при true
      only_with_salary: (v) => (v === true ? 'true' : ''),
      clusters: (v) => (v === true ? 'true' : ''),
    };
  }

  /**
   * Поиск вакансий
   */
  async searchVacancies(
    searchParams: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const params = this.buildSearchParams(searchParams);
      const url = `${this.HH_API_BASE_URL}/vacancies?${params.toString()}`;

      console.log('🌐 URL запроса:', url);
      console.log('📋 Параметры:', params.toString());

      const response = await axios.get(url);

      console.log('✅ Успешный ответ от HH API:', response.status);
      return response.data as unknown;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      throw new HttpException(
        `Ошибка при поиске вакансий: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Построение параметров поиска для HH API
   */
  private buildSearchParams(
    searchParams: Record<string, unknown>,
  ): URLSearchParams {
    const params = new URLSearchParams();

    const shouldAppend = (value: unknown): boolean =>
      typeof value === 'boolean' ? value : value != null && value !== '';

    const toParamValue = (key: string, value: unknown): string => {
      const serializer = this.SERIALIZERS[key];
      if (serializer) return serializer(value);
      if (typeof value === 'number') return String(value);
      return String(value);
    };

    // Одиночные параметры → entries → filter → append
    const singlePairs = this.SINGLE_PARAM_KEYS.map(
      (key) => [key, searchParams[key]] as const,
    );

    singlePairs
      .filter(([, v]) => shouldAppend(v))
      .forEach(([k, v]) => params.append(k, toParamValue(k, v)));

    // Массивы значений → flatMap
    const arrayPairs = this.ARRAY_PARAM_MAPPINGS.flatMap(({ key, field }) => {
      const values = (searchParams[field] ?? []) as string[];
      return values
        .filter((v) => v != null && v !== '')
        .map((v) => [key, v] as const);
    });

    arrayPairs.forEach(([k, v]) => params.append(k, v));

    return params;
  }

  /**
   * Получение детальной информации о вакансии
   */
  async getVacancyById(vacancyId: string): Promise<Vacancy> {
    try {
      const url = `${this.HH_API_BASE_URL}/vacancies/${vacancyId}`;

      console.log('🌐 URL запроса вакансии:', url);

      const response = await axios.get(url);

      console.log('✅ Успешный ответ от HH API для вакансии:', response.status);

      return response.data as Vacancy;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      throw new HttpException(
        `Ошибка при получении вакансии: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Поиск вакансий на основе структурированных данных резюме
   */
  async searchVacanciesByStructuredResume(
    resumeAnalysis: any,
  ): Promise<unknown> {
    try {
      const searchParams: Record<string, unknown> = {};

      // Основные параметры поиска
      if (resumeAnalysis.position) {
        searchParams.text = resumeAnalysis.position;
      }

      // Город (Санкт-Петербург = 2)
      if (resumeAnalysis.personalInfo?.location === 'Санкт-Петербург') {
        searchParams.area = 2;
      }

      // Навыки - добавляем в текстовый поиск
      if (resumeAnalysis.skills && Array.isArray(resumeAnalysis.skills)) {
        const skillNames = resumeAnalysis.skills
          .slice(0, 5) // Берем топ-5 навыков
          .map((skill: any) => skill.name)
          .filter((name: string) => name && name.trim() !== '');

        if (skillNames.length > 0) {
          // Добавляем навыки к текстовому поиску
          const skillsText = skillNames.join(' ');
          searchParams.text = `${searchParams.text || ''} ${skillsText}`.trim();
        }
      }

      // Опыт работы - определяем по количеству мест работы
      const experienceCount = resumeAnalysis.experience?.length || 0;
      if (experienceCount >= 2) {
        searchParams.experience = 'between1And3'; // 1-3 года
      } else if (experienceCount >= 1) {
        searchParams.experience = 'noExperience'; // Без опыта
      }

      // Дополнительные параметры для лучшего поиска
      searchParams.per_page = 20; // Уменьшаем количество результатов
      searchParams.order_by = 'publication_time';
      searchParams.order = 'desc';
      searchParams.only_with_salary = true; // Только с зарплатой

      console.log(
        '🔍 Параметры поиска на основе резюме:',
        JSON.stringify(searchParams, null, 2),
      );

      return this.searchVacancies(searchParams);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new HttpException(
        `Structured resume search error: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
