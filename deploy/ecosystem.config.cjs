// PM2 (VPS): pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: "huquqyol",
    script: "app.cjs",
    cwd: __dirname + "/..",
    instances: 1,                 // rate limit xotirada — bitta jarayon yetarli va to‘g‘ri
    max_memory_restart: "300M",
    env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 3000, TRUST_PROXY: "1" }
  }]
};
