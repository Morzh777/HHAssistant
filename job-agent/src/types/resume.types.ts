export interface PersonalInfo {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  period: string;
}

export interface Skill {
  name: string;
  level?: string;
  verified?: boolean;
}

export interface Language {
  language: string;
  level: string;
}

export interface Course {
  name: string;
  institution: string;
  period: string;
  description?: string;
}

export interface Test {
  name: string;
  score?: string;
  period: string;
  description?: string;
}

export interface Certificate {
  name: string;
  issuer: string;
  period: string;
  description?: string;
}

export interface AdditionalInfo {
  projects?: string[];
  other?: string;
}

