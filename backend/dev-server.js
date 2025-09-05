const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess = null;
let isRestarting = false;

function startServer() {
  if (isRestarting) return;
  
  console.log('🚀 Starting backend server...');
  
  serverProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0 && !isRestarting) {
      console.log('❌ Server crashed, restarting in 3 seconds...');
      setTimeout(() => {
        isRestarting = false;
        startServer();
      }, 3000);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    if (!isRestarting) {
      setTimeout(() => {
        isRestarting = false;
        startServer();
      }, 3000);
    }
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
        if (filename && filename.endsWith('.js') && !isRestarting) {
          console.log(`📁 File changed: ${filename}`);
          console.log('🔄 Restarting server...');
          
          isRestarting = true;
          if (serverProcess) {
            serverProcess.kill('SIGTERM');
          }
          
          setTimeout(() => {
            startServer();
          }, 1000);
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
console.log('🌐 Server will be available at: http://localhost:8000');
console.log('Press Ctrl+C to stop');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Keep the process alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  setTimeout(() => {
    startServer();
  }, 2000);
});
