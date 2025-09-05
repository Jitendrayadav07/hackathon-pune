#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting eERC Backend Server...');
console.log('📁 Working directory:', process.cwd());
console.log('🌐 Server will be available at: http://localhost:8000');
console.log('');

// Start the server
const server = spawn('node', ['index.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('close', (code) => {
  console.log(`\n❌ Server process exited with code ${code}`);
  console.log('🔄 Restarting server in 3 seconds...');
  
  setTimeout(() => {
    console.log('🔄 Restarting...');
    const newServer = spawn('node', ['index.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    newServer.on('close', (newCode) => {
      console.log(`\n❌ Server crashed again with code ${newCode}`);
      console.log('🛑 Please check your code for errors');
      process.exit(1);
    });
  }, 3000);
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Server started successfully!');
console.log('Press Ctrl+C to stop the server');
