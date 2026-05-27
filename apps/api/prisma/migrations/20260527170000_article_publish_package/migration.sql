-- 文章发布包为内容项的人工发布辅助数据，字段保持可空以兼容旧内容项。
ALTER TABLE "content_items"
  ADD COLUMN "publish_package" JSONB,
  ADD COLUMN "publish_package_generated_at" TIMESTAMP(3);
