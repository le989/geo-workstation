-- Add conversational aftersales QA support while keeping legacy question records compatible.
CREATE TYPE "AftersalesConversationStatus" AS ENUM ('active', 'archived');

ALTER TYPE "AftersalesAnswerStatus" ADD VALUE IF NOT EXISTS 'needs_clarification';

CREATE TABLE "aftersales_conversations" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "department_id" TEXT,
  "title" TEXT NOT NULL,
  "status" "AftersalesConversationStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "aftersales_conversations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "aftersales_conversations"
  ADD CONSTRAINT "aftersales_conversations_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aftersales_conversations"
  ADD CONSTRAINT "aftersales_conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "aftersales_conversations"
  ADD CONSTRAINT "aftersales_conversations_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aftersales_question_records"
  ADD COLUMN "conversation_id" TEXT,
  ADD COLUMN "sequence" INTEGER;

ALTER TABLE "aftersales_question_records"
  ADD CONSTRAINT "aftersales_question_records_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "aftersales_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "aftersales_conversations_company_id_idx" ON "aftersales_conversations"("company_id");
CREATE INDEX "aftersales_conversations_user_id_idx" ON "aftersales_conversations"("user_id");
CREATE INDEX "aftersales_conversations_department_id_idx" ON "aftersales_conversations"("department_id");
CREATE INDEX "aftersales_conversations_status_idx" ON "aftersales_conversations"("status");
CREATE INDEX "aftersales_conversations_last_message_at_idx" ON "aftersales_conversations"("last_message_at");
CREATE INDEX "aftersales_question_records_conversation_id_idx" ON "aftersales_question_records"("conversation_id");
CREATE INDEX "aftersales_question_records_conversation_id_sequence_idx" ON "aftersales_question_records"("conversation_id", "sequence");
