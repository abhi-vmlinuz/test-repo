# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-27:
- **PR `#6`** (`fix/attackbox-terminal-proxy` → `main`) is **MERGED** (`b461bc1`).
- Current branch `feat/terminal-dark-theme-and-vpn-ux` (pushed to `origin`, PR open) adds:
  - Dark theme (`#09090b`) and ASCII status prefixes in `TerminalComponent.tsx`
  - WireGuard QR code modal/panel (`qrcode` package) and live handshake status badge in `VPNAccess.tsx`
  - `GET /api/vpn/test-connection` proxy in `backend/server.py` reading `connected` from `nexus-engine`'s `GET /api/v1/vpn/status`
- `nexus-vm` (`:8081`) is running `NEXUS_ENV_IMAGE=nexus-kali-slim:latest` (`cb39b8a84702`), verified live (`Kali GNU/Linux Rolling`, `nmap`/`sqlmap`/`gobuster`/`python3`, `/artifacts/readme.txt`).

## Current task

- Goal: polish AttackBox UX (dark terminal) and VPN UX (QR code + real handshake status), then merge PR to `main`.
- In scope (files/dirs): `frontend/src/components/TerminalComponent.tsx`, `frontend/src/pages/VPNAccess.tsx`, `frontend/package.json`, `frontend/package-lock.json`, `backend/server.py`, `.continuity/`.
- Out of scope: `addition-spec.md` (`frozen`), `schema.sql` fresh-install dump, Judge0 placement change.
- Done when: dark terminal + VPN QR/handshake status are verified in browser and PR is merged to `main`.

## Last session

- Implemented `GET /api/vpn/test-connection` in `backend/server.py` and QR code + `HANDSHAKE ACTIVE` badge in `VPNAccess.tsx`.
- Verified `py_compile backend/server.py`, `npm run build` (`11.75s`), `rlabz-backend` container rebuild/restart, and live `nexus-kali-slim:latest` AttackBox pod on `nexus-vm`.

## Next up

1. Verify dark terminal + `nexus-kali-slim:latest` + VPN QR code in browser at `http://127.0.0.1:3000`.
2. Merge `rlabz-ctf` PR (`feat/terminal-dark-theme-and-vpn-ux`) and `nexus-framework` MR (`feat/kali-slim-and-egress`).
3. Clean up hardcoded VM IPs (`§4.15`), commit `schema.sql` (`§4.14`), and run 3× peak load test once host specs are known.

## Open questions / blockers

- `docker-compose.yml` still points `NEXUS_ENGINE_URL` and `VITE_NEXUS_URL` at `192.168.122.125:8081` (`nexus-vm`).
- Real event host specs and Judge0 placement (same host vs. separate) are still open in `~/nexus-private/plan/nexus-euphoria-event-plan.md`.

## Noticed, not touched

- Untracked `inspire/` directory in repo root.

## Don't redo

- Do not re-add `VITE_CONDUCTOR_URL` or Conductor VM calls.
- Do not bypass `backend/judge_service.py` for grading; Judge0 is the sole grading authority.
