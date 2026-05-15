-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('internal', 'customer');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ProductLineStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('platform_admin', 'company_admin', 'operator');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'COMPANY', 'PLATFORM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'platform_admin';
ALTER TYPE "UserRole" ADD VALUE 'company_admin';
ALTER TYPE "UserRole" ADD VALUE 'operator';

-- AlterTable
ALTER TABLE "ai_call_logs" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "created_by" TEXT;

-- AlterTable
ALTER TABLE "content_items" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "content_tasks" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "expansion_jobs" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "geo_analysis_tasks" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "geo_prompts" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "instruction_templates" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "knowledge_bases" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "knowledge_chunks" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT;

-- AlterTable
ALTER TABLE "knowledge_files" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "model_inclusion_records" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "product_line_id" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "project_profiles" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL DEFAULT 'internal',
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lines" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ProductLineStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'operator',
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- Seed the default tenant foundation before foreign keys are attached.
INSERT INTO "companies" ("id", "name", "code", "type", "status", "created_at", "updated_at")
VALUES ('company_default_kjt', '凯基特', 'kjt', 'internal', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "product_lines" ("id", "company_id", "name", "code", "status", "created_at", "updated_at")
VALUES ('product_line_default_kjt', 'company_default_kjt', '默认产品线', 'default', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "memberships" ("id", "user_id", "company_id", "role", "status", "is_default", "created_at", "updated_at")
SELECT
  'membership_default_' || "id",
  "id",
  'company_default_kjt',
  CASE
    WHEN "role" = 'admin' THEN 'platform_admin'::"MembershipRole"
    ELSE 'operator'::"MembershipRole"
  END,
  'active'::"MembershipStatus",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users";

UPDATE "project_profiles"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "geo_analysis_tasks"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "geo_prompts"
SET "company_id" = 'company_default_kjt',
    "visibility" = 'COMPANY'
WHERE "company_id" IS NULL OR "visibility" IS NULL;

UPDATE "expansion_jobs"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "knowledge_bases"
SET "company_id" = 'company_default_kjt',
    "visibility" = 'COMPANY'
WHERE "company_id" IS NULL OR "visibility" IS NULL;

UPDATE "knowledge_files"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "knowledge_chunks"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "instruction_templates"
SET "company_id" = 'company_default_kjt',
    "visibility" = 'COMPANY'
WHERE "company_id" IS NULL OR "visibility" IS NULL;

UPDATE "content_tasks"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "content_items"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "model_inclusion_records"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

UPDATE "ai_call_logs"
SET "company_id" = 'company_default_kjt'
WHERE "company_id" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "product_lines_company_id_idx" ON "product_lines"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_lines_company_id_code_key" ON "product_lines"("company_id", "code");

-- CreateIndex
CREATE INDEX "memberships_company_id_idx" ON "memberships"("company_id");

-- CreateIndex
CREATE INDEX "memberships_role_idx" ON "memberships"("role");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_company_id_key" ON "memberships"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_company_id_idx" ON "ai_call_logs"("company_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_created_by_idx" ON "ai_call_logs"("created_by");

-- CreateIndex
CREATE INDEX "content_items_company_id_idx" ON "content_items"("company_id");

-- CreateIndex
CREATE INDEX "content_tasks_company_id_idx" ON "content_tasks"("company_id");

-- CreateIndex
CREATE INDEX "content_tasks_updated_by_idx" ON "content_tasks"("updated_by");

-- CreateIndex
CREATE INDEX "content_tasks_product_line_id_idx" ON "content_tasks"("product_line_id");

-- CreateIndex
CREATE INDEX "expansion_jobs_company_id_idx" ON "expansion_jobs"("company_id");

-- CreateIndex
CREATE INDEX "expansion_jobs_updated_by_idx" ON "expansion_jobs"("updated_by");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_company_id_idx" ON "geo_analysis_tasks"("company_id");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_updated_by_idx" ON "geo_analysis_tasks"("updated_by");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_product_line_id_idx" ON "geo_analysis_tasks"("product_line_id");

-- CreateIndex
CREATE INDEX "geo_prompts_company_id_idx" ON "geo_prompts"("company_id");

-- CreateIndex
CREATE INDEX "geo_prompts_updated_by_idx" ON "geo_prompts"("updated_by");

-- CreateIndex
CREATE INDEX "geo_prompts_product_line_id_idx" ON "geo_prompts"("product_line_id");

-- CreateIndex
CREATE INDEX "geo_prompts_visibility_idx" ON "geo_prompts"("visibility");

-- CreateIndex
CREATE INDEX "instruction_templates_company_id_idx" ON "instruction_templates"("company_id");

-- CreateIndex
CREATE INDEX "instruction_templates_updated_by_idx" ON "instruction_templates"("updated_by");

-- CreateIndex
CREATE INDEX "instruction_templates_visibility_idx" ON "instruction_templates"("visibility");

-- CreateIndex
CREATE INDEX "knowledge_bases_company_id_idx" ON "knowledge_bases"("company_id");

-- CreateIndex
CREATE INDEX "knowledge_bases_updated_by_idx" ON "knowledge_bases"("updated_by");

-- CreateIndex
CREATE INDEX "knowledge_bases_product_line_id_idx" ON "knowledge_bases"("product_line_id");

-- CreateIndex
CREATE INDEX "knowledge_bases_visibility_idx" ON "knowledge_bases"("visibility");

-- CreateIndex
CREATE INDEX "knowledge_chunks_company_id_idx" ON "knowledge_chunks"("company_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_product_line_id_idx" ON "knowledge_chunks"("product_line_id");

-- CreateIndex
CREATE INDEX "knowledge_files_company_id_idx" ON "knowledge_files"("company_id");

-- CreateIndex
CREATE INDEX "knowledge_files_updated_by_idx" ON "knowledge_files"("updated_by");

-- CreateIndex
CREATE INDEX "model_inclusion_records_company_id_idx" ON "model_inclusion_records"("company_id");

-- CreateIndex
CREATE INDEX "model_inclusion_records_product_line_id_idx" ON "model_inclusion_records"("product_line_id");

-- CreateIndex
CREATE INDEX "model_inclusion_records_updated_by_idx" ON "model_inclusion_records"("updated_by");

-- CreateIndex
CREATE INDEX "project_profiles_company_id_idx" ON "project_profiles"("company_id");

-- CreateIndex
CREATE INDEX "project_profiles_created_by_idx" ON "project_profiles"("created_by");

-- CreateIndex
CREATE INDEX "project_profiles_updated_by_idx" ON "project_profiles"("updated_by");

-- AddForeignKey
ALTER TABLE "product_lines" ADD CONSTRAINT "product_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_profiles" ADD CONSTRAINT "project_profiles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_analysis_tasks" ADD CONSTRAINT "geo_analysis_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_analysis_tasks" ADD CONSTRAINT "geo_analysis_tasks_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_analysis_tasks" ADD CONSTRAINT "geo_analysis_tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_prompts" ADD CONSTRAINT "geo_prompts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_prompts" ADD CONSTRAINT "geo_prompts_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_prompts" ADD CONSTRAINT "geo_prompts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion_jobs" ADD CONSTRAINT "expansion_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion_jobs" ADD CONSTRAINT "expansion_jobs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruction_templates" ADD CONSTRAINT "instruction_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruction_templates" ADD CONSTRAINT "instruction_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_inclusion_records" ADD CONSTRAINT "model_inclusion_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_inclusion_records" ADD CONSTRAINT "model_inclusion_records_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_inclusion_records" ADD CONSTRAINT "model_inclusion_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
