# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-27:
- **PR `#6`** (`fix/attackbox-terminal-proxy` → `main`) is **MERGED** (`b461bc1` on `origin/main`).
- Current branch `feat/terminal-dark-theme-and-vpn-ux` (`fcaef01`, pushed to `origin`, no PR yet) switches `TerminalComponent.tsx` to dark theme (`#09090b`) and removes all startup/disconnect emojis; `frontend/dist` is rebuilt and live on `:3000`.
- Fedora host compose stack is running all 8 containers (`rlabz-frontend` `:3000`, `rlabz-backend` `:4000`, `rlabz-postgres` `:5432`, `rlabz-judge0-*` `:2358`, `rlabz-registry-proxy` `:5000`), with dummy challenge `b16e16b9-fc80-479c-846b-00e1394165a4` + `readme.txt` artifact seeded for testing.

## Current task

- Goal: polish AttackBox UX (dark terminal) and VPN UX (QR code + real handshake status), then open PR for `feat/terminal-dark-theme-and-vpn-ux`.
- In scope (files/dirs): `frontend/src/components/TerminalComponent.tsx`, VPN Access page, `.continuity/`.
- Out of scope: `addition-spec.md` (`frozen`), `schema.sql` fresh-install dump, Judge0 placement change.
- Done when: dark terminal + VPN UX are verified in browser and PR is opened/merged to `main`.

## Last session

- Removed `BetaFeature("firecracker_terminal")` gate from `ChallengeDetail.tsx` and fixed `asyncpg` UUID-vs-str cast in `download_artifact` / `delete_challenge_artifact` (`server.py`).
- Verified live on Fedora host + `nexus-vm`: Judge0 (`23/23` live checks), backend unit tests (`14 passed` in container), artifact download (`200`), and full browser AttackBox flow (launch, PTY echo, `/artifacts/readme.txt`, `wget 10.42.0.9:8080`, `X` teardown).
- Merged **PR `#6`** (`b461bc1`), then switched `TerminalComponent.tsx` to dark theme + ASCII prefixes on `feat/terminal-dark-theme-and-vpn-ux` (`fcaef01`) and rebuilt `frontend/dist`.

## Next up

1. Verify dark terminal + `nexus-kali-slim:latest` in browser at `http://127.0.0.1:3000`.
2. Add VPN UX improvements (QR code on VPN Access page + real handshake `connected` status from `GET /api/v1/vpn/status`).
3. Open PR for `feat/terminal-dark-theme-and-vpn-ux` → `main`.

## Open questions / blockers

- `docker-compose.yml` still points `NEXUS_ENGINE_URL` and `VITE_NEXUS_URL` at `192.168.122.125:8081` (`nexus-vm`).
- Real event host specs and Judge0 placement (same host vs. separate) are still open in `~/nexus-private/plan/nexus-euphoria-event-plan.md`.

## Noticed, not touched

- Untracked `inspire/` directory in repo root.

## Don't redo

- Do not re-add `VITE_CONDUCTOR_URL` or Conductor VM calls.
- Do not bypass `backend/judge_service.py` for grading; Judge0 is the sole grading authority.
