Prepare a handoff now.
1. Rewrite `.continuity/PROGRESS.md` (replace, don't append): Last known state, Current task status, half-finished work with file names, Next up (1-3 steps), Open questions, Noticed-not-touched, Don't redo (what failed and why).
2. Add `.continuity/sessions/<YYYY-MM-DD-HHMM>-<host>.md` from `.continuity/prompts/session-log-template.md`.
3. Make sure every decision from this session is in `.continuity/DECISIONS.md`.
4. Commit. If anything is still uncommitted or unpushed, run `.continuity/continuity.sh sync`.
5. Reply with a one-line state of the project.
