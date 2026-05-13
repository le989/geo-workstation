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
        API_PORT: "3000",
        PORT: "3000",
        LOCAL_STORAGE_ROOT: "/var/www/geo-workstation/storage"
      }
    }
  ]
};
