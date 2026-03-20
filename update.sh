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

# Cleanup unused images
if [ "$MODE" == "fresh" ]; then
  docker image prune -f
fi

echo "[$(date)] CTF update complete!"
