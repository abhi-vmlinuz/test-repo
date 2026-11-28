# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-28:
- **PR `#6`** (`fix/attackbox-terminal-proxy` -> `main`) is **MERGED** (`b461bc1` on `origin/main`).
- **PR `#7`** (`feat/terminal-dark-theme-and-vpn-ux` -> `main`, `3247630`, open): Dark terminal theme (`#09090b`, ASCII prefixes, no emojis) in `TerminalComponent.tsx`, `qrcode` QR panel + `HANDSHAKE ACTIVE` badge in `VPNAccess.tsx`, and `GET /api/vpn/test-connection` in `backend/server.py`.
- **PR `#8`** (`feat/fresh-install-deploy` -> `main`, `bcc22e1`, open): Created `deploy/schema.sql` (pure DDL, 0 data rows), `deploy/.env.example`, and `deploy/e2e-verify.sh`; parameterized `docker-compose.yml` (`${VAR:-default}`) and updated `backend/server.py:6590` fallback to `127.0.0.1:8081`.
- Priorities confirmed: Browser AttackBox and Coding Arena (Judge0) are primary; WireGuard VPN is fallback; `Nexus Janitor` in `backend/server.py` stays.

## Current task

- Goal: complete backend/deploy hardening and E2E verification readiness before heavy UI/theme rewrite, 3x load test, and final runbook.
- In scope (files/dirs): `deploy/`, `docker-compose.yml`, `backend/server.py`, `frontend/`, `.continuity/`.
- Out of scope: heavy event-theme UI rewrite, Judge0 placement change.
- Done when: `PR #7` and `PR #8` are merged, fresh-install E2E (`deploy/e2e-verify.sh`) is verified, and backend/engine are ready for UI rewrite + 3x load test.

## Last session

- Merged **PR `#6`** (`b461bc1`): verified live browser AttackBox PTY + `/artifacts/readme.txt` + `wget 10.42.0.9:8080` + `X` teardown + `GET /api/artifacts/download/...` -> `200`, `14 passed` in `rlabz-ctf-backend:latest`, `23/23` `tests/live_judge0_check.py`.
- Built and pushed **PR `#7`** (`3247630`): `npm run build` (`11.75s`), `py_compile backend/server.py`, `14 passed` in `rlabz-ctf-backend:latest`.
- Built and pushed **PR `#8`** (`bcc22e1`): `docker compose config -q`, `py_compile backend/server.py`, `git diff --check`.

## Next up

1. Review and merge **PR `#7`** and **PR `#8`** into `main`.
2. Finish `nexus-framework` `deploy/setup.sh` hardening + merge `nexus-framework` **MR `!9`**.
3. Run fresh-install E2E test (`deploy/e2e-verify.sh`) once all backend/infra PRs are merged.
4. Heavy UI/theme rewrite for the event, 3x peak load test (once event host specs are known), and final event runbook.

## Open questions / blockers

- Real event host specs and Judge0 placement (same host vs. separate) are still open in `~/nexus-private/plan/nexus-euphoria-event-plan.md`.
- Note: Fedora host `postgresql.service` binds `:5432` on boot (`sudo ports kill 5432` needed before `docker compose up -d`).

## Private share (not in git)

This repo has no runtime secrets. Deployment env, database dumps and the event
plan live in `~/nexus-private/` (chmod 700), referenced from there rather than
committed. On another machine, mount or symlink that directory before running
anything that needs credentials.
