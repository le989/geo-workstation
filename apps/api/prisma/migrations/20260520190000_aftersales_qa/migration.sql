CREATE TYPE "AftersalesAnswerStatus" AS ENUM (
  'answered',
  'no_reliable_source',
  'failed'
);

CREATE TYPE "AftersalesFeedbackStatus" AS ENUM ('none');

CREATE TABLE "aftersales_question_records" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "department_id" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "answer_status" "AftersalesAnswerStatus" NOT NULL DEFAULT 'no_reliable_source',
  "cited_sources" JSONB NOT NULL DEFAULT '[]',
  "used_material_types" JSONB NOT NULL DEFAULT '[]',
  "is_answered" BOOLEAN NOT NULL DEFAULT false,
  "has_reliable_source" BOOLEAN NOT NULL DEFAULT false,
  "is_mock" BOOLEAN NOT NULL DEFAULT true,
  "ai_usage_record_id" TEXT,
  "feedback_status" "AftersalesFeedbackStatus" NOT NULL DEFAULT 'none',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "aftersales_question_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "aftersales_question_records_company_id_idx"
  ON "aftersales_question_records"("company_id");
CREATE INDEX "aftersales_question_records_user_id_idx"
  ON "aftersales_question_records"("user_id");
CREATE INDEX "aftersales_question_records_department_id_idx"
  ON "aftersales_question_records"("department_id");
CREATE INDEX "aftersales_question_records_answer_status_idx"
  ON "aftersales_question_records"("answer_status");
CREATE INDEX "aftersales_question_records_has_reliable_source_idx"
  ON "aftersales_question_records"("has_reliable_source");
CREATE INDEX "aftersales_question_records_is_answered_idx"
  ON "aftersales_question_records"("is_answered");
CREATE INDEX "aftersales_question_records_ai_usage_record_id_idx"
  ON "aftersales_question_records"("ai_usage_record_id");
CREATE INDEX "aftersales_question_records_created_at_idx"
  ON "aftersales_question_records"("created_at");

ALTER TABLE "aftersales_question_records"
  ADD CONSTRAINT "aftersales_question_records_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aftersales_question_records"
  ADD CONSTRAINT "aftersales_question_records_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "aftersales_question_records"
  ADD CONSTRAINT "aftersales_question_records_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aftersales_question_records"
  ADD CONSTRAINT "aftersales_question_records_ai_usage_record_id_fkey"
  FOREIGN KEY ("ai_usage_record_id") REFERENCES "ai_usage_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
