-- Add an optional topic label for knowledge material records.
ALTER TABLE "knowledge_files" ADD COLUMN "material_topic" TEXT;

CREATE INDEX "knowledge_files_material_topic_idx" ON "knowledge_files"("material_topic");
