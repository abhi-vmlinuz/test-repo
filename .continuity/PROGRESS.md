# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-23: grading is verified against a live Judge0 (23 checks, branch
`fix/attackbox-terminal-proxy`), and the backend terminal proxy exists with
tests. Nothing merged yet from this session. `nexus-framework` has the engine
half of the AttackBox on `main` (`87cccdb`, env-role label + hostPath volumes)
and `CreateEnv` on an unmerged branch.

## Current task

- Goal: make the AttackBox usable end to end: browser → backend proxy → engine
  PTY, with ownership enforced, and a verified grading path underneath it.
- In scope (files/dirs): `backend/server.py`, `backend/judge_service.py`,
  `backend/tests/`, `frontend/src/components/TerminalComponent.tsx`,
  `frontend/src/pages/ChallengeDetail.tsx`, `frontend/src/pages/TerminalPage.tsx`,
  `frontend/default.conf.template`.
- Done this session: `/api/attackbox/start` and
  `/api/attackbox/sessions/{id}` in `server.py`; the AttackBox modal now calls
  them. `py_compile`-clean. Frontend build status: see Last session.
- Out of scope: the slim Kali image, the artifact mount wiring in the web app,
  removing `ChallengeDetail`'s Conductor calls, egress policy.
- Done when: the proxy is merged, nginx forwards upgrades, and grading passes
  against a real Judge0 on a cgroup v2 host.

## Last session

- Done: attackbox endpoints — POST /api/attackbox/start (reuse-or-spawn),
  DELETE /api/attackbox/sessions/{id} (owner-checked), GET
  /api/attackbox/sessions/current; frontend modal now calls them.
- Done: live grading verification found a real defect — Judge0 1.13.1 cannot
  run on a cgroup v2 host, so every submission returned Internal Error and would
  have been presented as a wrong answer. Fixed by sending the per-process flags
  that make the runner skip `--cg` (D-006). Added `tests/live_judge0_check.py`
  (23 checks, all pass) and a unit test that pins the flags. Converted three
  async tests to `asyncio.run` so they run in the backend image, which has no
  pytest-asyncio. Added the authenticated terminal proxy (D-005) with 5 tests,
  and taught nginx to forward WebSocket upgrades on `/api/`.
- Half-finished (files touched, what's missing): `ChallengeDetail.tsx` still
  talks to Conductor for the AttackBox; the web app has no endpoint that calls
  the engine's new `POST /api/v1/sessions/env`; the slim Kali image does not
  exist; artifacts are not mounted in real deployments yet.

## Next up

1. Merge both branches: `nexus-framework` `feat/attackbox-env-session` and this
   repo's `fix/attackbox-terminal-proxy`.
2. Backend endpoint `POST /api/attackbox/start` → engine
   `POST /api/v1/sessions/env`, returning `session_id`; `DELETE` to terminate.
   Then replace the Conductor modal in `ChallengeDetail.tsx` with it.
3. Slim Kali image (no systemd, no sshd, no code-server) and point
   `NEXUS_ENV_IMAGE` at it.
4. Artifact directories on the host plus `NEXUS_ARTIFACT_ROOT`, so an env pod
   gets `/artifacts` at spawn instead of fetching a URL list from the browser.
5. Egress default-deny with DNS allow, and a per-challenge `internet_allowed`.
6. Load test at 3× peak once host specs are known.

## Private share (not in git)

This repo has no runtime secrets. Deployment env, database dumps and the event
plan live in `~/nexus-private/` (chmod 700), referenced from there rather than
committed. On another machine, mount or symlink that directory before running
anything that needs credentials.
