-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN     "embedding" vector(1536);

-- AlterTable
ALTER TABLE "VacancyAnalysis" ADD COLUMN     "embedding" vector(1536);
