#!/usr/bin/env bash
set -euo pipefail

# End-to-End Stack Verification for RLabZ CTF + Nexus + Judge0
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000}"
NEXUS_URL="${NEXUS_ENGINE_URL:-http://127.0.0.1:8081}"
JUDGE0_URL="${JUDGE0_URL:-http://127.0.0.1:2358}"

echo "[1/5] Checking Frontend ($FRONTEND_URL)..."
curl -sf -o /dev/null "$FRONTEND_URL/" && echo "  OK"

echo "[2/5] Checking Backend API ($BACKEND_URL)..."
curl -sf "$BACKEND_URL/api/health" >/dev/null
curl -sf "$BACKEND_URL/api/challenges" >/dev/null && echo "  OK"

echo "[3/5] Checking Judge0 ($JUDGE0_URL)..."
curl -sf "$JUDGE0_URL/about" >/dev/null && echo "  OK"

echo "[4/5] Checking Nexus Engine ($NEXUS_URL)..."
curl -sf "$NEXUS_URL/health" && echo ""

echo "[5/5] Checking Postgres schema tables..."
docker exec rlabz-postgres psql -U "${POSTGRES_USER:-rlabz}" -d "${POSTGRES_DB:-ctf_platform}" -c "\dt" | grep -E "users|ctf_public_challenges|ctf_challenge_artifacts" >/dev/null && echo "  OK"

echo "[+] All E2E checks passed."
