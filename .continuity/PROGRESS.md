# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-27: `main` is at `62ce3fb` (**PR #5** merged).
Branch `fix/attackbox-terminal-proxy` (synced with `origin`) has:
- Judge0 cgroup v2 fix (`enable_per_process_and_thread_*` flags, D-006; verified live, 23 checks)
- Authenticated WebSocket terminal proxy `/api/nexus/sessions/{id}/terminal` + nginx WS upgrade (D-005)
- `/terminal/:vmId` and `TerminalComponent` routed exclusively through the Nexus backend proxy (all `VITE_CONDUCTOR_URL` fallbacks removed)
- `/api/attackbox/start`, `/api/attackbox/sessions/{id}`, `/api/attackbox/sessions/current` wired to `ChallengeDetail.tsx` (calling engine `POST /api/v1/sessions/env` with `/artifacts`, D-007)
- Per-challenge artifact storage (`uploads/artifacts/<challenge_id>/` via `_artifact_file_path`) + `docker-compose.yml` bind mount `/var/lib/nexus/artifacts:/app/uploads/artifacts` (D4)

## Current task

- Goal: complete initial AttackBox + artifact wiring in `rlabz-ctf` and reopen PR `#6` for end-to-end verification against `nexus-vm`.
- In scope (files/dirs): `backend/server.py`, `docker-compose.yml`, `frontend/src/components/TerminalComponent.tsx`, `.continuity/PROGRESS.md`.
- Out of scope: migrating pre-existing flat artifact files on disk, `schema.sql` fresh-install dump, Judge0 placement change.
- Done when: `py_compile`, `npm run build`, and PR `#6` are green, ready for live browser AttackBox smoke test on the Fedora host.

## Last session

- Removed remaining `VITE_CONDUCTOR_URL` fallback from `TerminalComponent.tsx` (routes both `sessionId` and legacy `vmId` prop through `/api/nexus/sessions/{id}/terminal`).
- Updated `upload_challenge_artifact` and `import_artifact_from_github` in `backend/server.py` to store under `uploads/artifacts/<challenge_id>/` (with traversal check), and added `/var/lib/nexus/artifacts:/app/uploads/artifacts` to `docker-compose.yml`.
- Verified: `python3 -m py_compile backend/server.py` and `npm run build` pass; `grep` confirms zero Conductor references in `frontend/src/`.
- Untracked `inspire/` directory left untouched.

## Next up

1. Run `docker compose up -d --build` on the Fedora host and verify the full browser AttackBox flow (start from `ChallengeDetail` → shell echo → `/artifacts` mount → stop) against `nexus-vm`.
2. Merge `rlabz-ctf` PR `#6` and `nexus-framework` MR `!8` (`feat/attackbox-env-session`).
3. Egress default-deny + per-challenge `internet_allowed` verification and 3× peak load test once host specs are known.

## Open questions / blockers

- Real event host specs and Judge0 placement (same host vs. separate) are still open in `~/nexus-private/plan/nexus-euphoria-event-plan.md`.
- Note: `docker-compose.yml` still points `NEXUS_ENGINE_URL` and `VITE_NEXUS_URL` at `192.168.122.125:8081` (`nexus-vm`).

## Private share (not in git)

This repo has no runtime secrets. Deployment env, database dumps and the event
plan live in `~/nexus-private/` (chmod 700), referenced from there rather than
committed. On another machine, mount or symlink that directory before running
anything that needs credentials.
