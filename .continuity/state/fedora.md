# Auto state (machine-written; do not edit)
- host: fedora
- time: 2026-11-27T18:58:40Z
- branch: feat/fresh-install-deploy
- head: b461bc1 Merge pull request #6 from abhi-vmlinuz/fix/attackbox-terminal-proxy
## Changed files (staged or unstaged)
M  backend/server.py
A  deploy/.env.example
A  deploy/e2e-verify.sh
A  deploy/schema.sql
M  docker-compose.yml
?? inspire/
## Recent commits
b461bc1 Merge pull request #6 from abhi-vmlinuz/fix/attackbox-terminal-proxy
d600de9 fix(attackbox): ungate terminal card from firecracker_terminal beta and fix artifact download UUID cast
d3b74af feat(attackbox): remove Conductor fallback and wire per-challenge artifact mounts
1cf5396 docs(continuity): sync PROGRESS.md with HEAD and PR #5/#6 state
7011306 feat(attackbox): web app starts and stops the browser attackbox
4ac5ac8 fix(terminal): point the direct-link page at a nexus session, not a VM
9482d3b fix(grading): make Judge0 work on cgroup v2, plus the terminal proxy
62ce3fb Merge pull request #5 from abhi-vmlinuz/chore/refresh-progress
