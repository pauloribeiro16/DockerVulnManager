#!/bin/bash

# ==========================================
# DockerVulnManager - Start Web Dashboard
# ==========================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist"
PID_FILE="$PROJECT_DIR/.server.pid"
PORT=${1:-8888}

# Find free port if default is busy
if command -v ss >/dev/null 2>&1; then
    while ss -tuln 2>/dev/null | grep -q ":${PORT} "; do
        PORT=$((PORT + 1))
    done
fi

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Server already running on port $PORT (PID: $OLD_PID)"
        echo "Access: http://localhost:$PORT"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Check if dist exists
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
    echo "Building frontend..."
    cd "$FRONTEND_DIR" && npm run build
    if [ $? -ne 0 ]; then
        echo "Build failed!"
        exit 1
    fi
    echo "Build complete."
fi

# Start server in background
echo "Starting web dashboard on port $PORT..."
cd "$DIST_DIR"
nohup python3 -m http.server "$PORT" &>/dev/null &
SERVER_PID=$!

echo "$SERVER_PID" > "$PID_FILE"

# Wait for server to start
sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✓ Dashboard running at: http://localhost:$PORT"
    echo "  PID: $SERVER_PID"
    echo ""
    echo "To stop: ./stop.sh"
    echo "Or:      kill $SERVER_PID"
else
    echo "✗ Failed to start server"
    rm -f "$PID_FILE"
    exit 1
fi
