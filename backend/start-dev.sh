#!/bin/bash

# Kill any existing processes
echo "Killing existing processes..."
pkill -f "node index.js" 2>/dev/null
pkill -f nodemon 2>/dev/null

# Wait a moment
sleep 2

# Start the server
echo "Starting backend server..."
node index.js &

# Get the process ID
SERVER_PID=$!

echo "Backend server started with PID: $SERVER_PID"
echo "Server is running on http://localhost:8000"
echo ""
echo "To stop the server, run: kill $SERVER_PID"
echo "Or use: pkill -f 'node index.js'"
echo ""
echo "Press Ctrl+C to stop this script (server will continue running)"

# Keep the script running
wait $SERVER_PID
