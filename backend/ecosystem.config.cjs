/** PM2 ecosystem config for Sage backend. Run from repo root: pm2 start backend/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "sage-server",
      cwd: __dirname,
      script: "dist/index.js",
      node_args: "--enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5001,
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
