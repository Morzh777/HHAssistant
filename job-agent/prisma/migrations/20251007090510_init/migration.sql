-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "UserResume" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "analysisJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "UserResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "salary" JSONB,
    "employer" JSONB,
    "area" JSONB,
    "experience" JSONB,
    "employment" JSONB,
    "schedule" JSONB,
    "keySkills" JSONB,
    "professional" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'chrome-extension',
    "raw" JSONB,
    "embedding" vector(1536),

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyAnalysis" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toxicityScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "redFlags" JSONB NOT NULL,
    "positives" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "salaryAdequacy" TEXT NOT NULL,
    "experienceMatch" TEXT NOT NULL,
    "raw" JSONB,

    CONSTRAINT "VacancyAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserResume_resumeId_key" ON "UserResume"("resumeId");

-- CreateIndex
CREATE INDEX "Vacancy_name_idx" ON "Vacancy"("name");

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyAnalysis" ADD CONSTRAINT "VacancyAnalysis_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
