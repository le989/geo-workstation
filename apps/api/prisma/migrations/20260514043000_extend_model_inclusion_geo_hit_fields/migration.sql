-- Extend legacy model coverage records so they can store multi-entry GEO hit monitoring evidence.
ALTER TABLE "model_inclusion_records"
  ADD COLUMN "platform" TEXT,
  ADD COLUMN "entry_point" TEXT,
  ADD COLUMN "detection_method" TEXT,
  ADD COLUMN "device_type" TEXT,
  ADD COLUMN "is_web_search_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_logged_in" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cited_content_asset" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "competitor_mentioned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hit_level" TEXT,
  ADD COLUMN "raw_answer" TEXT,
  ADD COLUMN "citations" JSONB,
  ADD COLUMN "search_results" JSONB,
  ADD COLUMN "screenshot_path" TEXT,
  ADD COLUMN "error_message" TEXT;

UPDATE "model_inclusion_records"
SET "hit_level" = CASE
  WHEN "brand_recommended" = true THEN 'recommended'
  WHEN "brand_mentioned" = true THEN 'mentioned'
  WHEN "cited_official_site" = true OR "cited_content_asset" = true THEN 'cited'
  WHEN "competitor_mentioned" = true AND "brand_mentioned" = false THEN 'competitor_only'
  WHEN "brand_mentioned" = false
    AND "brand_recommended" = false
    AND "cited_official_site" = false
    AND "cited_content_asset" = false THEN 'not_mentioned'
  ELSE 'unclear'
END
WHERE "hit_level" IS NULL;

CREATE INDEX "model_inclusion_records_platform_idx" ON "model_inclusion_records"("platform");
CREATE INDEX "model_inclusion_records_entry_point_idx" ON "model_inclusion_records"("entry_point");
CREATE INDEX "model_inclusion_records_detection_method_idx" ON "model_inclusion_records"("detection_method");
CREATE INDEX "model_inclusion_records_device_type_idx" ON "model_inclusion_records"("device_type");
CREATE INDEX "model_inclusion_records_is_web_search_enabled_idx" ON "model_inclusion_records"("is_web_search_enabled");
CREATE INDEX "model_inclusion_records_is_logged_in_idx" ON "model_inclusion_records"("is_logged_in");
CREATE INDEX "model_inclusion_records_cited_content_asset_idx" ON "model_inclusion_records"("cited_content_asset");
CREATE INDEX "model_inclusion_records_competitor_mentioned_idx" ON "model_inclusion_records"("competitor_mentioned");
CREATE INDEX "model_inclusion_records_hit_level_idx" ON "model_inclusion_records"("hit_level");
