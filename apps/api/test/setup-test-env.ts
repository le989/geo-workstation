const DEFAULT_TEST_DATABASE_URL =
  "postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public";

function resolveTestDatabaseUrl() {
  const raw = process.env.DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  const url = new URL(raw);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName || databaseName === "geo_workstation_clean") {
    url.pathname = `/${process.env.GEO_TEST_DATABASE_NAME || "geo_workstation"}`;
  }

  if (url.pathname.replace(/^\//, "") === "geo_workstation_clean") {
    throw new Error("Refusing to run write tests against geo_workstation_clean.");
  }

  return url.toString();
}

process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET ??= "test_only_jwt_secret";
