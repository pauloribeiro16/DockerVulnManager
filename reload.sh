#!/bin/bash

# ==========================================
# DockerVulnManager - Reload Dashboard
# Rebuilds frontend and restarts server
# ==========================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist"
PID_FILE="$PROJECT_DIR/.server.pid"
PORT=${1:-8888}

echo "🔨 Building frontend..."
cd "$FRONTEND_DIR" && npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build complete."

# Kill existing server
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "🛑 Stopping old server (PID: $OLD_PID)..."
        kill "$OLD_PID"
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

# Find free port
if command -v ss >/dev/null 2>&1; then
    while ss -tuln 2>/dev/null | grep -q ":${PORT} "; do
        PORT=$((PORT + 1))
    done
fi

# Start new server
echo "🚀 Starting server on port $PORT..."
cd "$DIST_DIR"
nohup python3 -m http.server "$PORT" &>/dev/null &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✅ Dashboard running at: http://localhost:$PORT"
    echo "   PID: $SERVER_PID"
else
    echo "❌ Failed to start server"
    exit 1
fi
