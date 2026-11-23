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

## D-005: Terminal traffic goes through the backend, never browser-to-engine
- Date: 2026-11-23
- Chose: `GET /api/nexus/sessions/{id}/terminal?token=<jwt>` proxies the PTY WebSocket to the engine, injecting `NEXUS_API_KEY` server-side and checking that the session belongs to the caller.
- Over: handing the browser an engine token, or leaving the browser pointed at the engine directly.
- Because: a browser cannot set an `Authorization` header on a WebSocket, so the key would have to go in the URL and end up in browser history and proxy logs. Separately, the engine attaches anyone who presents a valid session id, so without an ownership check a leaked id is a shell in another participant's environment. The backend also gets a place to say *why* a connection failed (close codes 4401/4403/4404/4502) instead of a bare disconnect.
- Cost: one extra hop, and long-lived connections mean nginx must forward upgrades and not buffer (see `frontend/default.conf.template`).
- Revisit if: the engine grows first-class session tokens that are scoped, short-lived and safe to hand to a browser.

## D-006: Per-process Judge0 flags are required on cgroup v2 hosts
- Date: 2026-11-23
- Chose: every submission sets `enable_per_process_and_thread_time_limit=true` and `enable_per_process_and_thread_memory_limit=true`.
- Over: pinning the event host to cgroup v1, or patching the Judge0 image.
- Because: Judge0 1.13.1 bundles isolate 1.8.1, which only manages cgroup v1. On a cgroup v2 host (Fedora 41+, any current distro) `isolate --cg` fails with `Failed to create control group /sys/fs/cgroup/memory/box-N` and every submission returns status 13 (Internal Error), which the platform would otherwise present as a wrong answer. Those two flags make Judge0's runner omit `--cg` and fall back to rlimits, enforcing the same total CPU and memory caps. Verified live: 23 checks pass against Judge0 on a cgroup2fs host.
- Trade-off: limits apply per process group rather than per process/thread, so a submission cannot be charged for a child process separately. Wall time is still capped by Judge0's `wall_time_limit`.
- Revisit if: Judge0 ships an isolate with cgroup v2 support, at which point the flags can go back to false.
