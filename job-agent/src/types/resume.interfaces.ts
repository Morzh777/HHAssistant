import {
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Language,
  Course,
  Test,
  Certificate,
  AdditionalInfo,
} from './resume.types';

export interface Resume {
  personalInfo: PersonalInfo;
  position: string;
  about?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  courses: Course[];
  tests: Test[];
  certificates: Certificate[];
  additionalInfo: AdditionalInfo;
}

export interface ResumeAnalysisResult {
  personalInfo: PersonalInfo;
  position: string;
  about?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  courses: Course[];
  tests: Test[];
  certificates: Certificate[];
  additionalInfo: AdditionalInfo;
}

