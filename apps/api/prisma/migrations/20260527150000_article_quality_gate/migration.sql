ALTER TABLE "content_items" ADD COLUMN "publish_status" TEXT;
ALTER TABLE "content_items" ADD COLUMN "quality_gate_result" JSONB;
ALTER TABLE "content_items" ADD COLUMN "quality_checked_at" TIMESTAMP(3);

CREATE INDEX "content_items_publish_status_idx" ON "content_items"("publish_status");
