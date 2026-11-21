# Decisions

Append-only. Newest at the bottom. Don't edit old entries; supersede them with a new one.

## D-001: Judge0 is the only authoritative grader
- Date: 2026-11-21
- Chose: `coding-submit` calls Judge0 unconditionally and never `evaluate_in_nexus_pod`.
- Over: grading inside the participant's pod, which was the original implementation and the faster path when a pod was already running.
- Because: the participant has a shell in that pod. `ps aux` shows the exec command line with hidden inputs base64-encoded, and `gcc`/`python3`/`base64` can be shadowed on `PATH` to fabricate output. Pod exec is fine for "run samples" on visible cases only.
- Revisit if: we ever run challenges in an environment the participant cannot reach.

## D-002: A missing verdict is pending, never failed
- Date: 2026-11-21
- Chose: return HTTP 503 and record no submission when Judge0 is unreachable or slow.
- Over: scoring the submission as all-cases-failed, which is what `_fallback_evaluation` did.
- Because: a queue spike during an event would otherwise turn into a mass false negative and consume real attempts.
- Revisit if: Judge0 gains a synchronous mode we can trust to return in bounded time.

## D-003: Hidden test output is masked even when the case passes
- Date: 2026-11-21
- Chose: always mask `stdout`, `input` and `expected` for hidden cases.
- Over: revealing `stdout` on a passing case so students can see what matched.
- Because: a passing case means `stdout == expected`, so showing it hands over the answer for that case.
- Revisit if: we move to a model where hidden cases are not reused across attempts.

## D-004: One install per college, no multi-tenancy
- Date: 2026-11-21
- Chose: no `college_id`, no central control plane, no shared billing.
- Over: a hosted multi-tenant deployment.
- Because: each college runs its own Nexus and this platform on its own hardware; tenancy adds a schema and authorization burden with no user for it.
- Revisit if: more than a handful of colleges want a managed offering.
