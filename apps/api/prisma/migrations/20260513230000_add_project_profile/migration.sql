CREATE TABLE "project_profiles" (
  "id" TEXT NOT NULL,
  "project_name" TEXT NOT NULL,
  "company_name" TEXT,
  "brand_name" TEXT,
  "website_url" TEXT,
  "industry" TEXT,
  "main_products" JSONB,
  "target_customers" TEXT,
  "positioning" TEXT,
  "tone" TEXT,
  "forbidden_claims" JSONB,
  "target_models" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_profiles_pkey" PRIMARY KEY ("id")
);
