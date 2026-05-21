-- Link aftersales feedback to the knowledge draft created from it.
ALTER TABLE "aftersales_answer_feedbacks"
  ADD COLUMN "converted_knowledge_file_id" TEXT,
  ADD COLUMN "converted_at" TIMESTAMP(3),
  ADD COLUMN "converted_by_user_id" TEXT;

CREATE UNIQUE INDEX "aftersales_answer_feedbacks_converted_knowledge_file_id_key"
  ON "aftersales_answer_feedbacks"("converted_knowledge_file_id");
CREATE INDEX "aftersales_answer_feedbacks_converted_at_idx"
  ON "aftersales_answer_feedbacks"("converted_at");
CREATE INDEX "aftersales_answer_feedbacks_converted_by_user_id_idx"
  ON "aftersales_answer_feedbacks"("converted_by_user_id");

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_converted_knowledge_file_id_fkey"
  FOREIGN KEY ("converted_knowledge_file_id") REFERENCES "knowledge_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aftersales_answer_feedbacks"
  ADD CONSTRAINT "aftersales_answer_feedbacks_converted_by_user_id_fkey"
  FOREIGN KEY ("converted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
