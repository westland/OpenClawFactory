// PM2 process manager config
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'openclaw-backend',
      cwd: '/opt/openclaw-factory/backend',
      script: '/opt/openclaw-factory/venv/bin/python',
      args: 'main.py',
      env: { PYTHONPATH: '/opt/openclaw-factory/backend' },
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '/opt/openclaw-factory/logs/backend-err.log',
      out_file:   '/opt/openclaw-factory/logs/backend-out.log',
    },
    {
      name: 'openclaw-frontend',
      cwd: '/opt/openclaw-factory/frontend',
      script: 'npm',
      args: 'start',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '/opt/openclaw-factory/logs/frontend-err.log',
      out_file:   '/opt/openclaw-factory/logs/frontend-out.log',
    },
  ],
}
