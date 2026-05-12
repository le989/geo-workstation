-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'geo_operator', 'content_editor', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "GeoPromptType" AS ENUM ('base', 'distilled', 'brand', 'scene');

-- CreateEnum
CREATE TYPE "UserIntent" AS ENUM ('selection', 'purchase', 'manufacturer_recommendation', 'domestic_alternative', 'comparison', 'troubleshooting', 'application_solution', 'brand_verification');

-- CreateEnum
CREATE TYPE "ExpansionMode" AS ENUM ('rule', 'ai');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('pending', 'parsing', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "RecordMethod" AS ENUM ('manual', 'api', 'import');

-- CreateEnum
CREATE TYPE "AiCallStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_analysis_tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "website_url" TEXT,
    "product_line" TEXT,
    "target_models" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "summary" JSONB,
    "content_gaps" JSONB,
    "knowledge_gaps" JSONB,
    "prompt_suggestions" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_analysis_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_model_results" (
    "id" TEXT NOT NULL,
    "analysis_task_id" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "brand_recommended" BOOLEAN NOT NULL DEFAULT false,
    "ranking_position" INTEGER,
    "cited_official_site" BOOLEAN NOT NULL DEFAULT false,
    "answer_summary" TEXT,
    "competitors" JSONB,
    "raw_answer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_model_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_line" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_files" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "storage_path" TEXT,
    "parse_status" "ParseStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "file_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "product_line" TEXT,
    "material_type" TEXT,
    "tags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_prompts" (
    "id" TEXT NOT NULL,
    "type" "GeoPromptType" NOT NULL,
    "base_word" TEXT,
    "prompt_text" TEXT NOT NULL,
    "product_line" TEXT,
    "scenario" TEXT,
    "user_intent" "UserIntent" NOT NULL DEFAULT 'selection',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "target_models" JSONB,
    "source" TEXT,
    "track_enabled" BOOLEAN NOT NULL DEFAULT false,
    "latest_coverage_status" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "geo_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expansion_jobs" (
    "id" TEXT NOT NULL,
    "mode" "ExpansionMode" NOT NULL,
    "prompt_type" "GeoPromptType" NOT NULL,
    "input_payload" JSONB NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expansion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expansion_candidates" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "base_word" TEXT,
    "prompt_text" TEXT NOT NULL,
    "user_intent" "UserIntent",
    "priority" INTEGER NOT NULL DEFAULT 3,
    "recommended_content_type" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "saved_prompt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expansion_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruction_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instruction_type" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "target_prompt_type" "GeoPromptType",
    "target_model" TEXT,
    "instruction" TEXT NOT NULL,
    "output_format" TEXT,
    "quality_rules" TEXT,
    "forbidden_rules" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "instruction_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_line" TEXT,
    "knowledge_base_id" TEXT,
    "instruction_template_id" TEXT,
    "generation_type" TEXT NOT NULL,
    "target_model" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "model" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "geo_prompt_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "geo_optimization_points" JSONB,
    "suggested_publish_channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_inclusion_records" (
    "id" TEXT NOT NULL,
    "geo_prompt_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brand_mentioned" BOOLEAN NOT NULL DEFAULT false,
    "brand_recommended" BOOLEAN NOT NULL DEFAULT false,
    "ranking_position" INTEGER,
    "cited_official_site" BOOLEAN NOT NULL DEFAULT false,
    "answer_summary" TEXT,
    "competitors" JSONB,
    "record_method" "RecordMethod" NOT NULL DEFAULT 'manual',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_inclusion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "related_type" TEXT,
    "related_id" TEXT,
    "token_input" INTEGER,
    "token_output" INTEGER,
    "cost_estimate" DECIMAL(12,6),
    "status" "AiCallStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_created_by_idx" ON "geo_analysis_tasks"("created_by");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_brand_name_idx" ON "geo_analysis_tasks"("brand_name");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_product_line_idx" ON "geo_analysis_tasks"("product_line");

-- CreateIndex
CREATE INDEX "geo_analysis_tasks_status_idx" ON "geo_analysis_tasks"("status");

-- CreateIndex
CREATE INDEX "geo_model_results_analysis_task_id_idx" ON "geo_model_results"("analysis_task_id");

-- CreateIndex
CREATE INDEX "geo_model_results_model_idx" ON "geo_model_results"("model");

-- CreateIndex
CREATE INDEX "knowledge_bases_created_by_idx" ON "knowledge_bases"("created_by");

-- CreateIndex
CREATE INDEX "knowledge_bases_product_line_idx" ON "knowledge_bases"("product_line");

-- CreateIndex
CREATE INDEX "knowledge_bases_status_idx" ON "knowledge_bases"("status");

-- CreateIndex
CREATE INDEX "knowledge_bases_deleted_at_idx" ON "knowledge_bases"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_files_knowledge_base_id_idx" ON "knowledge_files"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "knowledge_files_created_by_idx" ON "knowledge_files"("created_by");

-- CreateIndex
CREATE INDEX "knowledge_files_parse_status_idx" ON "knowledge_files"("parse_status");

-- CreateIndex
CREATE INDEX "knowledge_files_deleted_at_idx" ON "knowledge_files"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_chunks_knowledge_base_id_idx" ON "knowledge_chunks"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_file_id_idx" ON "knowledge_chunks"("file_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_product_line_idx" ON "knowledge_chunks"("product_line");

-- CreateIndex
CREATE INDEX "knowledge_chunks_material_type_idx" ON "knowledge_chunks"("material_type");

-- CreateIndex
CREATE INDEX "knowledge_chunks_deleted_at_idx" ON "knowledge_chunks"("deleted_at");

-- CreateIndex
CREATE INDEX "geo_prompts_created_by_idx" ON "geo_prompts"("created_by");

-- CreateIndex
CREATE INDEX "geo_prompts_type_idx" ON "geo_prompts"("type");

-- CreateIndex
CREATE INDEX "geo_prompts_prompt_text_idx" ON "geo_prompts"("prompt_text");

-- CreateIndex
CREATE INDEX "geo_prompts_product_line_idx" ON "geo_prompts"("product_line");

-- CreateIndex
CREATE INDEX "geo_prompts_user_intent_idx" ON "geo_prompts"("user_intent");

-- CreateIndex
CREATE INDEX "geo_prompts_track_enabled_idx" ON "geo_prompts"("track_enabled");

-- CreateIndex
CREATE INDEX "geo_prompts_deleted_at_idx" ON "geo_prompts"("deleted_at");

-- CreateIndex
CREATE INDEX "expansion_jobs_created_by_idx" ON "expansion_jobs"("created_by");

-- CreateIndex
CREATE INDEX "expansion_jobs_mode_idx" ON "expansion_jobs"("mode");

-- CreateIndex
CREATE INDEX "expansion_jobs_prompt_type_idx" ON "expansion_jobs"("prompt_type");

-- CreateIndex
CREATE INDEX "expansion_jobs_status_idx" ON "expansion_jobs"("status");

-- CreateIndex
CREATE INDEX "expansion_candidates_job_id_idx" ON "expansion_candidates"("job_id");

-- CreateIndex
CREATE INDEX "expansion_candidates_saved_prompt_id_idx" ON "expansion_candidates"("saved_prompt_id");

-- CreateIndex
CREATE INDEX "expansion_candidates_selected_idx" ON "expansion_candidates"("selected");

-- CreateIndex
CREATE INDEX "instruction_templates_created_by_idx" ON "instruction_templates"("created_by");

-- CreateIndex
CREATE INDEX "instruction_templates_instruction_type_idx" ON "instruction_templates"("instruction_type");

-- CreateIndex
CREATE INDEX "instruction_templates_content_type_idx" ON "instruction_templates"("content_type");

-- CreateIndex
CREATE INDEX "instruction_templates_target_prompt_type_idx" ON "instruction_templates"("target_prompt_type");

-- CreateIndex
CREATE INDEX "instruction_templates_deleted_at_idx" ON "instruction_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "content_tasks_created_by_idx" ON "content_tasks"("created_by");

-- CreateIndex
CREATE INDEX "content_tasks_product_line_idx" ON "content_tasks"("product_line");

-- CreateIndex
CREATE INDEX "content_tasks_knowledge_base_id_idx" ON "content_tasks"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "content_tasks_instruction_template_id_idx" ON "content_tasks"("instruction_template_id");

-- CreateIndex
CREATE INDEX "content_tasks_status_idx" ON "content_tasks"("status");

-- CreateIndex
CREATE INDEX "content_items_task_id_idx" ON "content_items"("task_id");

-- CreateIndex
CREATE INDEX "content_items_geo_prompt_id_idx" ON "content_items"("geo_prompt_id");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_deleted_at_idx" ON "content_items"("deleted_at");

-- CreateIndex
CREATE INDEX "model_inclusion_records_geo_prompt_id_idx" ON "model_inclusion_records"("geo_prompt_id");

-- CreateIndex
CREATE INDEX "model_inclusion_records_created_by_idx" ON "model_inclusion_records"("created_by");

-- CreateIndex
CREATE INDEX "model_inclusion_records_model_idx" ON "model_inclusion_records"("model");

-- CreateIndex
CREATE INDEX "model_inclusion_records_checked_at_idx" ON "model_inclusion_records"("checked_at");

-- CreateIndex
CREATE INDEX "model_inclusion_records_brand_mentioned_idx" ON "model_inclusion_records"("brand_mentioned");

-- CreateIndex
CREATE INDEX "model_inclusion_records_brand_recommended_idx" ON "model_inclusion_records"("brand_recommended");

-- CreateIndex
CREATE INDEX "ai_call_logs_provider_idx" ON "ai_call_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_call_logs_model_idx" ON "ai_call_logs"("model");

-- CreateIndex
CREATE INDEX "ai_call_logs_purpose_idx" ON "ai_call_logs"("purpose");

-- CreateIndex
CREATE INDEX "ai_call_logs_related_type_related_id_idx" ON "ai_call_logs"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_status_idx" ON "ai_call_logs"("status");

-- AddForeignKey
ALTER TABLE "geo_analysis_tasks" ADD CONSTRAINT "geo_analysis_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_model_results" ADD CONSTRAINT "geo_model_results_analysis_task_id_fkey" FOREIGN KEY ("analysis_task_id") REFERENCES "geo_analysis_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "knowledge_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_prompts" ADD CONSTRAINT "geo_prompts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion_jobs" ADD CONSTRAINT "expansion_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion_candidates" ADD CONSTRAINT "expansion_candidates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "expansion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion_candidates" ADD CONSTRAINT "expansion_candidates_saved_prompt_id_fkey" FOREIGN KEY ("saved_prompt_id") REFERENCES "geo_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruction_templates" ADD CONSTRAINT "instruction_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_instruction_template_id_fkey" FOREIGN KEY ("instruction_template_id") REFERENCES "instruction_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "content_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_geo_prompt_id_fkey" FOREIGN KEY ("geo_prompt_id") REFERENCES "geo_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_inclusion_records" ADD CONSTRAINT "model_inclusion_records_geo_prompt_id_fkey" FOREIGN KEY ("geo_prompt_id") REFERENCES "geo_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_inclusion_records" ADD CONSTRAINT "model_inclusion_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
