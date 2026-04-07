"""Test file to verify pre-commit doesn't block normal code."""

import os
import subprocess
from pathlib import Path

# This should NOT be blocked (env vars, not hardcoded)
DB_PASSWORD = os.getenv("DB_PASSWORD", "changeme")
API_KEY = os.getenv("API_KEY")

# This should NOT be blocked (localhost is allowed)
LOCAL_HOST = "127.0.0.1"

# This should trigger a WARNING (not a block) for IP
# PRIVATE_IP = "192.168.1.50"  # Uncommenting would warn

def run_command(cmd: list[str]) -> str:
    """Run command safely without shell=True."""
    # This is GOOD practice - no shell=True
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def load_config() -> dict:
    """Load config from file, not hardcoded."""
    config_path = Path.home() / ".dockervuln" / "config.json"
    if config_path.exists():
        import json
        return json.loads(config_path.read_text())
    return {}
