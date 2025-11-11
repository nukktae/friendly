module.exports = {
  apps: [
    {
      name: 'friendly-backend',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '0.0.0.0'
      },
      // Auto-restart options
      watch: false, // Set to true for development auto-restart
      ignore_watch: ['node_modules', 'uploads', '*.log'],
      max_memory_restart: '500M',
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart behavior
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      
      // Advanced options
      merge_logs: true,
      kill_timeout: 5000
    }
  ]
};

