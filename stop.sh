#!/bin/bash

# ==========================================
# DockerVulnManager - Stop Web Dashboard
# ==========================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No running server found"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping dashboard server (PID: $PID)..."
    kill "$PID"
    sleep 1

    # Force kill if still running
    if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID"
    fi

    rm -f "$PID_FILE"
    echo "✓ Server stopped"
else
    echo "Server not running (stale PID file removed)"
    rm -f "$PID_FILE"
fi
