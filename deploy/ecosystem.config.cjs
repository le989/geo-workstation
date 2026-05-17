// PM2 does not load private .env files by itself.
// Export required production variables before starting PM2, or use your deployment platform's
// secret/env injection. Do not write real DATABASE_URL, JWT_SECRET, or API keys into this file.
module.exports = {
  apps: [
    {
      name: "geo-workstation-api",
      cwd: "/var/www/geo-workstation/apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        API_PORT: process.env.API_PORT || "3000",
        PORT: process.env.PORT || process.env.API_PORT || "3000",
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "12h",
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        LOCAL_STORAGE_ROOT: process.env.LOCAL_STORAGE_ROOT || "/var/www/geo-workstation/storage",
        BYPASS_AUTH_FOR_TESTS: "false",
        AI_PROVIDER: process.env.AI_PROVIDER || "mock",
        AI_OPENAI_COMPATIBLE_BASE_URL: process.env.AI_OPENAI_COMPATIBLE_BASE_URL,
        AI_OPENAI_COMPATIBLE_API_KEY: process.env.AI_OPENAI_COMPATIBLE_API_KEY,
        AI_OPENAI_COMPATIBLE_MODEL: process.env.AI_OPENAI_COMPATIBLE_MODEL
      }
    }
  ]
};
