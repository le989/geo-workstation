CREATE TYPE "KnowledgeMaterialType" AS ENUM (
  'product_material',
  'aftersales_material',
  'company_trust_material',
  'content_reference_material',
  'internal_process_material',
  'customer_case_material'
);

CREATE TYPE "KnowledgeReviewStatus" AS ENUM ('pending', 'approved', 'disabled');

CREATE TYPE "KnowledgeTrustLevel" AS ENUM ('high', 'medium', 'low');

ALTER TABLE "knowledge_files"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "source_type" TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN "material_type" "KnowledgeMaterialType" NOT NULL DEFAULT 'content_reference_material',
  ADD COLUMN "applicable_modules" JSONB,
  ADD COLUMN "source_description" TEXT,
  ADD COLUMN "trust_level" "KnowledgeTrustLevel" NOT NULL DEFAULT 'medium',
  ADD COLUMN "review_status" "KnowledgeReviewStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "allowed_department_ids" JSONB;

UPDATE "knowledge_files"
SET "title" = "file_name"
WHERE "title" IS NULL;

CREATE INDEX "knowledge_files_material_type_idx" ON "knowledge_files"("material_type");
CREATE INDEX "knowledge_files_trust_level_idx" ON "knowledge_files"("trust_level");
CREATE INDEX "knowledge_files_review_status_idx" ON "knowledge_files"("review_status");
