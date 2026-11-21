# Progress

_Rewrite this file each session. Don't let it grow forever._

## Last known state

2026-11-21: PR #2 (`fix/coding-grading-integrity`) is open and mergeable on
GitHub; grading is Judge0-only on that branch. `main` still has the old
pod-exec submit path until the PR is merged.

## Current task

- Goal: land grading integrity on `main`, then start AttackBox on Nexus.
- In scope (files/dirs): `backend/judge_service.py`, `backend/server.py`,
  `backend/tests/`, `frontend/src/components/CodingArenaView.tsx`.
- Out of scope: anything in `nexus-framework`; artifact mounts and egress
  policy (they need engine changes first).
- Done when: a wrong submission returns per-case fail with no hidden data, a
  correct one returns the flag, and stopping Judge0 returns 503 "retry"
  rather than a failure.

## Last session

- Done: merged the coding arena onto `main` (PR #1, fast-forward). Fixed
  hidden-test leakage, Judge0-only submit, pending instead of failed, scaled
  poll budget, explicit Judge0 `COUNT=4`, backend semaphore, `false` →
  `False` bug, arena compile-error message. Added 8 tests in
  `backend/tests/test_judge_service.py`.
- Half-finished (files touched, what's missing): PR #2 is unmerged. Nothing
  else is partially edited.

## Next up

1. Merge PR #2, then verify against the live Judge0 on the VM
   (`curl -s http://127.0.0.1:2358/about`).
2. AttackBox on Nexus: backend WebSocket proxy with JWT + ownership check,
   `nexus-role=env` sessions, then remove the Conductor path
   (`VITE_CONDUCTOR_URL`, `TerminalComponent.tsx`).
3. Per-challenge artifact directories plus a bind mount, so env pods get
   `/artifacts` at spawn.

## Private share (not in git)

`~/nexus-private/` is one directory, mounted or symlinked on every machine so
the path stays stable. It holds what must not be committed:

- `plan/nexus-euphoria-event-plan.md` — the December event strategy, decisions
  and P0-P3 schedule. Read this before starting event work.
- `db/ctf_platform-schema.sql`, `db/ctf_platform-full.dump` — the live schema
  and a full backup, since this repo has no migrations.
- `env/rlabz-ctf-backend.env` — the backend env file.

If it is missing, say so instead of inventing values: the plan and the schema
are the two things the code cannot tell you.

## Open questions / blockers

- No schema-creation path for a fresh install: no `migrations/`, no `.sql`
  dump in the repo, and the backend image has no Node so `prisma db push`
  cannot run in the container. The arena columns exist only because they were
  added to the live database by hand. A schema and full dump now exist in
  `~/nexus-private/db/` as a stopgap; committing a `schema.sql` plus an init
  step is still open, and is needed before a second college can self-host.
- `docker-compose.yml` hardcodes `192.168.122.125` (test VM) in three places,
  and `server.py` defaults `NEXUS_ENGINE_URL` to an old cloud host.
- Judge0 worker count is set to 4 without measuring the real event host.

## Noticed, not touched

- `docs/README.md`, `docs/FEATURES.md`, `docs/IMPLEMENTATION_SUMMARY.md` and
  the `.docx`/`.pdf` briefs are outdated. They describe a courses/LMS product
  with modules, lessons and enrollment codes that the backend does not
  implement: there are no exam, course or cert routes, and the tables are CTF
  challenges, progress, categories, artifacts, sessions and usage. Do not
  derive the product from them.
- `TerminalComponent.tsx` falls back to `http://localhost:8080` while the
  engine listens on `8081`.
- `loadtest.png`, `assets/*.png` and `challenge-zips/*.zip` are committed
  build/asset state.
- Conductor calls in the frontend pass `user_id` from the browser with no
  authentication.

## Don't redo

- Do not route authoritative grading back through the student's pod. `ps aux`
  exposes hidden inputs and the compiler can be shadowed.
- Do not reintroduce `_fallback_evaluation`-style "everything failed" results
  for judge timeouts.
- Do not commit environment-specific IPs into `.env`; deployments supply them.
- Do not adopt the Firecracker/Conductor prototype; pods replace it.
