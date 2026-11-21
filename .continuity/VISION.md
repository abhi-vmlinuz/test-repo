# Vision

## What this is

The web platform that runs a hacking event. It hosts CTF challenges, gives
each participant a real machine to attack, and runs LeetCode-style coding
competitions. It owns identity, challenge content, scoring, leaderboards,
artifact delivery and telemetry.

It is the front door to `nexus-framework`: when a participant needs an
environment, this backend asks `nexus-engine` to spawn a pod, delivers a
WireGuard config, and proxies terminal traffic. Coding submissions go to a
self-hosted Judge0; the platform renders per-case pass/fail and awards the
flag.

## Why it exists

A static challenge or a shared box is not a CTF. Nexus gives every participant
their own ephemeral Linux environment with its own VPN address, so challenges
can be interactive and everyone gets the same starting conditions. The coding
arena exists because a participant who controls their own machine cannot grade
themselves: judging has to happen outside their reach.

## Non-goals

- Not an orchestrator. Pod lifecycle, WireGuard peers, IP allocation and
  isolation belong to `nexus-engine`; this repo calls it and never duplicates
  it.
- Not a judge. Judge0 produces verdicts. This repo stores and displays them and
  never absorbs the verdict logic.
- No multi-tenancy. One install per college, no `college_id`, no central
  billing or control plane.
- No second orchestrator. The Conductor/Firecracker prototype is dead and must
  not come back.
- No public artifact host. Challenge files go to authenticated participants,
  not to a permanent `wget` URL.
- No LMS. Courses, modules and lessons are not part of this product.

## Principles

- **The participant's environment is untrusted.** Grading runs on Judge0, never
  by exec'ing inside their pod. Example: `coding-submit` does not call
  `evaluate_in_nexus_pod`; pod exec survives only for "run samples" against
  visible cases.
- **Hidden test data never leaves the server in a response.** Input, expected
  output and stdout stay masked for hidden cases even when the case passes,
  because a passing case's stdout *is* the expected answer.
- **Infrastructure failure is not a wrong answer.** If the judge does not
  answer, the submission is not recorded and the API returns 503. A queue
  spike must never look like a participant's mistake.
- **One source of truth per fact.** Identity and scoring here, orchestration
  in the engine, verdicts in Judge0. Nexus does not absorb web-app scores and
  this repo does not absorb verdicts.
- **Additive changes over rewrites.** The platform runs live events; a rewrite
  has to be the task, not a side effect of one.

## Architecture in brief

```
React frontend ──► FastAPI backend (server.py, asyncpg) ──► Postgres
                          │
                          ├──► nexus-engine :8081   (pods, terminal, VPN)
                          └──► Judge0 :2358         (authoritative grading)
```

- `backend/server.py` is one large FastAPI module: auth, challenges, progress,
  artifacts, admin authoring, Nexus proxying, telemetry.
- `backend/judge_service.py` is the Judge0 client and the grading authority.
- `frontend/src/components/CodingArenaView.tsx` is the 3-column arena;
  `TerminalComponent.tsx` is the xterm bridge.
- The arena contract is `addition-spec.md`; the visual system is `DESIGN.md`.

**`docs/README.md` and friends are out of date.** They describe a
courses-and-learning-portal product that the code does not implement. Trust
this file, the current task in `PROGRESS.md`, and the source. If you need to
know what the platform does, read the routes in `backend/server.py`.
