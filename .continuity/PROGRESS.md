# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-27: `main` is at `62ce3fb` (**PR #5** `chore/refresh-progress` merged).
Branch `fix/attackbox-terminal-proxy` (`7011306`, synced with `origin`) has:
- Judge0 cgroup v2 fix (`enable_per_process_and_thread_*` flags, D-006; verified live, 23 checks)
- Authenticated WebSocket terminal proxy `/api/nexus/sessions/{id}/terminal` + nginx WS upgrade (D-005)
- `/terminal/:vmId` routed through the Nexus backend proxy (`TerminalPage.tsx`)
- `/api/attackbox/start`, `/api/attackbox/sessions/{id}`, `/api/attackbox/sessions/current` wired to `ChallengeDetail.tsx` (calling engine `POST /api/v1/sessions/env` with `/artifacts`, D-007)

**PR status note:** GitHub **PR #6** (`fix/attackbox-terminal-proxy`) is **CLOSED (unmerged)** as of `2026-11-23T10:01:11Z`; commits `9482d3b`, `4ac5ac8`, and `7011306` are not on `main`.

## Current task

- Goal: sync continuity state across `rlabz-ctf` and `nexus-framework`, then align on the next December P0/AttackBox milestone.
- In scope (files/dirs): `.continuity/PROGRESS.md`.
- Out of scope: feature edits until plan/agenda is confirmed with user.
- Done when: `PROGRESS.md` matches `HEAD` (`7011306`) and actual PR `#5`/`#6` states.

## Last session

- Verified git log (`9482d3b`–`7011306`) and GitHub PR states (`#5` merged, `#6` closed unmerged).
- Note on local test env: host `python3` has no `pytest` installed (`backend` tests run inside the backend container image); `frontend/node_modules` is present.
- Untracked `inspire/` directory left untouched.

## Next up

1. Reopen PR `#6` (or open a fresh PR for `fix/attackbox-terminal-proxy` → `main`), run full browser-level AttackBox smoke test (including stopping from `TerminalPage`), and merge alongside `nexus-framework` MR `!8`.
2. Slim Kali image (no systemd, no sshd, no code-server) and point `NEXUS_ENV_IMAGE` at it.
3. Host artifact directories under `NEXUS_ARTIFACT_ROOT` so env pods receive `/artifacts` at spawn.
4. Egress default-deny + per-challenge `internet_allowed`, and 3× peak load test once host specs are known.

## Open questions / blockers

- Why was PR `#6` closed on 2026-11-23 without merging? Confirm whether to reopen `#6` or open a new PR from `fix/attackbox-terminal-proxy`.
- Real event host specs and Judge0 placement (same host vs. separate) are still open in `~/nexus-private/plan/nexus-euphoria-event-plan.md`.

## Private share (not in git)

This repo has no runtime secrets. Deployment env, database dumps and the event
plan live in `~/nexus-private/` (chmod 700), referenced from there rather than
committed. On another machine, mount or symlink that directory before running
anything that needs credentials.
