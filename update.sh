#!/bin/bash
# ZecurX CTF Smart Update Script
# Usage: ./update.sh [mode]
# Modes: cached (default), fresh, quick

MODE=${1:-"cached"}

echo "[$(date)] Starting CTF update in '$MODE' mode..."

# Build base command
case $MODE in
  fresh)
    docker compose build --no-cache
    docker compose up -d --remove-orphans
    ;;
  quick)
    docker compose up -d --no-build --remove-orphans
    ;;
  *)
    docker compose build
    docker compose up -d --remove-orphans
    ;;
esac

# Wait for containers to be healthy
echo "[$(date)] Waiting for containers to stabilize..."
sleep 5

# Reload nginx to re-resolve container DNS names
# This prevents 502 errors after container IP changes
echo "[$(date)] Reloading nginx..."
cd /opt/zecurx-infra && docker compose exec -T nginx nginx -s reload 2>/dev/null || echo "Warning: Could not reload nginx"

# Cleanup unused images
if [ "$MODE" == "fresh" ]; then
  docker image prune -f
fi

echo "[$(date)] CTF update complete!"
