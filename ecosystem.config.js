module.exports = {
  apps: [{
    name: 'laporfik-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Performance
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Restart policy
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    
    // Environment variables
    env_file: '.env'
  }]
}; 