-- Add aftersales answer feedback review workflow.
ALTER TYPE "AftersalesFeedbackStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "AftersalesFeedbackStatus" ADD VALUE IF NOT EXISTS 'handled';
ALTER TYPE "AftersalesFeedbackStatus" ADD VALUE IF NOT EXISTS 'no_action';

CREATE TYPE "AftersalesFeedbackErrorType" AS ENUM (
  'citation_wrong',
  'answer_incomplete',
  'answer_wrong',
  'knowledge_missing',
  'question_unclear',
  'other'
);

CREATE TABLE "aftersales_answer_feedbacks" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "question_record_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "department_id" TEXT,
  "error_type" "AftersalesFeedbackErrorType" NOT NULL,
  "correction_text" TEXT NOT NULL,
  "description" TEXT,
  "status" "AftersalesFeedbackStatus" NOT NULL DEFAULT 'pending',
  "handled_by_id" TEXT,
  "handled_at" TIMESTAMP(3),
  "handle_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "aftersales_answer_feedbacks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "aftersales_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_question_record_id_fkey"
  FOREIGN KEY ("question_record_id") REFERENCES "aftersales_question_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_handled_by_id_fkey"
  FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "aftersales_answer_feedbacks_question_record_id_user_id_key"
  ON "aftersales_answer_feedbacks"("question_record_id", "user_id");
CREATE INDEX "aftersales_answer_feedbacks_company_id_idx"
  ON "aftersales_answer_feedbacks"("company_id");
CREATE INDEX "aftersales_answer_feedbacks_conversation_id_idx"
  ON "aftersales_answer_feedbacks"("conversation_id");
CREATE INDEX "aftersales_answer_feedbacks_question_record_id_idx"
  ON "aftersales_answer_feedbacks"("question_record_id");
CREATE INDEX "aftersales_answer_feedbacks_user_id_idx"
  ON "aftersales_answer_feedbacks"("user_id");
CREATE INDEX "aftersales_answer_feedbacks_department_id_idx"
  ON "aftersales_answer_feedbacks"("department_id");
CREATE INDEX "aftersales_answer_feedbacks_error_type_idx"
  ON "aftersales_answer_feedbacks"("error_type");
CREATE INDEX "aftersales_answer_feedbacks_status_idx"
  ON "aftersales_answer_feedbacks"("status");
CREATE INDEX "aftersales_answer_feedbacks_handled_by_id_idx"
  ON "aftersales_answer_feedbacks"("handled_by_id");
CREATE INDEX "aftersales_answer_feedbacks_created_at_idx"
  ON "aftersales_answer_feedbacks"("created_at");
