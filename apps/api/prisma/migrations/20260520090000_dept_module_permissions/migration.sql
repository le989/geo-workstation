CREATE TYPE "DepartmentStatus" AS ENUM ('active', 'inactive');

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "department_module_permissions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "can_access" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_module_permissions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "memberships" ADD COLUMN "department_id" TEXT;

CREATE UNIQUE INDEX "departments_company_id_code_key" ON "departments"("company_id", "code");
CREATE INDEX "departments_company_id_idx" ON "departments"("company_id");
CREATE INDEX "departments_status_idx" ON "departments"("status");
CREATE UNIQUE INDEX "department_module_permissions_department_id_module_key_key" ON "department_module_permissions"("department_id", "module_key");
CREATE INDEX "department_module_permissions_company_id_idx" ON "department_module_permissions"("company_id");
CREATE INDEX "department_module_permissions_module_key_idx" ON "department_module_permissions"("module_key");
CREATE INDEX "memberships_department_id_idx" ON "memberships"("department_id");

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "department_module_permissions"
  ADD CONSTRAINT "department_module_permissions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "department_module_permissions"
  ADD CONSTRAINT "department_module_permissions_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
