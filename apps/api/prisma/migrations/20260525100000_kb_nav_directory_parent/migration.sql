-- KB-NAV-UX-1A: support bounded multi-level knowledge directories.

ALTER TABLE "knowledge_directories"
  ADD COLUMN "parent_id" TEXT,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "knowledge_directories_knowledge_base_id_name_key";

CREATE INDEX "knowledge_directories_parent_id_idx" ON "knowledge_directories"("parent_id");
CREATE INDEX "knowledge_directories_knowledge_base_id_parent_id_idx"
  ON "knowledge_directories"("knowledge_base_id", "parent_id");

ALTER TABLE "knowledge_directories"
  ADD CONSTRAINT "knowledge_directories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "knowledge_directories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
