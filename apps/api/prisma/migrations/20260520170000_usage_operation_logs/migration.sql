CREATE TABLE "ai_usage_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT,
    "department_id" TEXT,
    "module_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "is_mock" BOOLEAN NOT NULL DEFAULT false,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operation_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT,
    "department_id" TEXT,
    "module_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "target_title" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_records_company_id_idx" ON "ai_usage_records"("company_id");
CREATE INDEX "ai_usage_records_user_id_idx" ON "ai_usage_records"("user_id");
CREATE INDEX "ai_usage_records_department_id_idx" ON "ai_usage_records"("department_id");
CREATE INDEX "ai_usage_records_module_key_idx" ON "ai_usage_records"("module_key");
CREATE INDEX "ai_usage_records_action_idx" ON "ai_usage_records"("action");
CREATE INDEX "ai_usage_records_provider_idx" ON "ai_usage_records"("provider");
CREATE INDEX "ai_usage_records_is_mock_idx" ON "ai_usage_records"("is_mock");
CREATE INDEX "ai_usage_records_success_idx" ON "ai_usage_records"("success");
CREATE INDEX "ai_usage_records_created_at_idx" ON "ai_usage_records"("created_at");

CREATE INDEX "operation_logs_company_id_idx" ON "operation_logs"("company_id");
CREATE INDEX "operation_logs_user_id_idx" ON "operation_logs"("user_id");
CREATE INDEX "operation_logs_department_id_idx" ON "operation_logs"("department_id");
CREATE INDEX "operation_logs_module_key_idx" ON "operation_logs"("module_key");
CREATE INDEX "operation_logs_action_idx" ON "operation_logs"("action");
CREATE INDEX "operation_logs_target_type_idx" ON "operation_logs"("target_type");
CREATE INDEX "operation_logs_target_id_idx" ON "operation_logs"("target_id");
CREATE INDEX "operation_logs_success_idx" ON "operation_logs"("success");
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs"("created_at");

ALTER TABLE "ai_usage_records"
  ADD CONSTRAINT "ai_usage_records_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_records"
  ADD CONSTRAINT "ai_usage_records_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_usage_records"
  ADD CONSTRAINT "ai_usage_records_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operation_logs"
  ADD CONSTRAINT "operation_logs_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operation_logs"
  ADD CONSTRAINT "operation_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operation_logs"
  ADD CONSTRAINT "operation_logs_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
