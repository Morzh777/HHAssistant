export interface Vacancy {
  id: string;
  name: string;
  description?: string;
  salary?: {
    from?: number;
    to?: number;
    currency?: string;
    gross?: boolean;
  };
  employer?: {
    id: string;
    name: string;
    logo_urls?: {
      original?: string;
      '90'?: string;
      '240'?: string;
    };
  };
  area?: { id: string; name: string };
  experience?: { id: string; name: string };
  employment?: { id: string; name: string };
  schedule?: { id: string; name: string };
  key_skills?: Array<{ name: string }>;
  professional_roles?: Array<{ id: string; name: string }>;
  published_at?: string;
  created_at?: string;
  alternate_url?: string;
  _metadata?: {
    savedAt?: string;
    source?: string;
  };
}

export interface VacancySearchResponse {
  items: Vacancy[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
  clusters?: unknown;
}
