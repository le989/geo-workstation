-- SCHEMA-1: allow AI model inclusion records to be softly voided and restored.

ALTER TABLE "model_inclusion_records"
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "voided_by_user_id" TEXT,
  ADD COLUMN "void_reason" TEXT,
  ADD COLUMN "restored_at" TIMESTAMP(3),
  ADD COLUMN "restored_by_user_id" TEXT;

CREATE INDEX "model_inclusion_records_company_id_voided_at_idx"
  ON "model_inclusion_records"("company_id", "voided_at");
CREATE INDEX "model_inclusion_records_voided_by_user_id_idx"
  ON "model_inclusion_records"("voided_by_user_id");
CREATE INDEX "model_inclusion_records_restored_by_user_id_idx"
  ON "model_inclusion_records"("restored_by_user_id");

ALTER TABLE "model_inclusion_records"
  ADD CONSTRAINT "model_inclusion_records_voided_by_user_id_fkey"
  FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "model_inclusion_records"
  ADD CONSTRAINT "model_inclusion_records_restored_by_user_id_fkey"
  FOREIGN KEY ("restored_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
