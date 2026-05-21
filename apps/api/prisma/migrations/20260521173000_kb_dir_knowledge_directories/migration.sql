-- KB-DIR-1: add maintainable knowledge directories and attach files to directories.

CREATE TABLE "knowledge_directories" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "knowledge_base_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_directories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "knowledge_files" ADD COLUMN "directory_id" TEXT;

CREATE INDEX "knowledge_directories_company_id_idx" ON "knowledge_directories"("company_id");
CREATE INDEX "knowledge_directories_knowledge_base_id_idx" ON "knowledge_directories"("knowledge_base_id");
CREATE INDEX "knowledge_directories_status_idx" ON "knowledge_directories"("status");
CREATE INDEX "knowledge_directories_is_default_idx" ON "knowledge_directories"("is_default");
CREATE UNIQUE INDEX "knowledge_directories_knowledge_base_id_name_key" ON "knowledge_directories"("knowledge_base_id", "name");
CREATE INDEX "knowledge_files_directory_id_idx" ON "knowledge_files"("directory_id");

ALTER TABLE "knowledge_directories"
  ADD CONSTRAINT "knowledge_directories_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_directories"
  ADD CONSTRAINT "knowledge_directories_knowledge_base_id_fkey"
  FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_directories"
  ADD CONSTRAINT "knowledge_directories_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "knowledge_directories"
  ADD CONSTRAINT "knowledge_directories_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_files"
  ADD CONSTRAINT "knowledge_files_directory_id_fkey"
  FOREIGN KEY ("directory_id") REFERENCES "knowledge_directories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "knowledge_directories" (
  "id",
  "company_id",
  "knowledge_base_id",
  "name",
  "status",
  "is_default",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'kbdir_root_' || substr(md5("knowledge_bases"."id"), 1, 20),
  "knowledge_bases"."company_id",
  "knowledge_bases"."id",
  '默认根目录',
  'active',
  true,
  "knowledge_bases"."created_by",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "knowledge_bases"
WHERE NOT EXISTS (
  SELECT 1
  FROM "knowledge_directories"
  WHERE "knowledge_directories"."knowledge_base_id" = "knowledge_bases"."id"
    AND "knowledge_directories"."is_default" = true
);

UPDATE "knowledge_files"
SET "directory_id" = "knowledge_directories"."id"
FROM "knowledge_directories"
WHERE "knowledge_files"."knowledge_base_id" = "knowledge_directories"."knowledge_base_id"
  AND "knowledge_directories"."is_default" = true
  AND "knowledge_files"."directory_id" IS NULL;
