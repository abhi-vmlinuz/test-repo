# Protected paths

Levels:
- frozen: do not edit. Stop and ask the user. The pre-commit check blocks the commit.
- stable: editable only with a DECISIONS.md entry in the same commit.
Everything not listed is free to change inside the task's scope fence.

`.continuity/PROTECTED.md`, `.continuity/VISION.md` and `.continuity/continuity.sh` are human-owned and protected automatically; do not list them here.

frozen: addition-spec.md | Product and architecture contract for the coding arena. Changing it is a product decision, not an implementation detail.
stable: backend/judge_service.py | Grading authority. A silent change here scores students wrong, so it needs a DECISIONS entry and a test.
stable: docker-compose.judge0.yml | Judge isolation shape (privileged, loopback-only binding). Security-relevant.
