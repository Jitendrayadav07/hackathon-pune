const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess = null;

function startServer() {
  console.log('🚀 Starting backend server...');
  
  serverProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0) {
      console.log('❌ Server crashed, restarting in 2 seconds...');
      setTimeout(startServer, 2000);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    setTimeout(startServer, 2000);
  });
}

function watchFiles() {
  const watchPaths = [
    'controllers',
    'models',
    'routes',
    'middlewares',
    'config',
    'index.js'
  ];

  watchPaths.forEach(watchPath => {
    const fullPath = path.join(__dirname, watchPath);
    if (fs.existsSync(fullPath)) {
      fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
          console.log(`📁 File changed: ${filename}`);
          console.log('🔄 Restarting server...');
          
          if (serverProcess) {
            serverProcess.kill();
          }
          
          setTimeout(startServer, 1000);
        }
      });
    }
  });
}

// Start the server
startServer();

// Start watching files
watchFiles();

console.log('👀 Watching for file changes...');
console.log('Press Ctrl+C to stop');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});
