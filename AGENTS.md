<!-- continuity:start -->
## Project continuity (read first)
Several agents on several machines and accounts work on this repo, so intent lives in files, not chat history.
1. At session start run `.continuity/continuity.sh start` and read everything it prints. Before touching code, summarize back to the user in at most 10 lines: what the project is for, the current task, and which protected paths are near it.
2. Stay inside the scope fence in `.continuity/PROGRESS.md`. Never edit `frozen` paths from `.continuity/PROTECTED.md` (ask the user). `stable` paths need an entry in `.continuity/DECISIONS.md` in the same commit. Never edit PROTECTED.md or VISION.md once committed; propose changes in chat.
3. Log non-obvious choices in `DECISIONS.md` as you make them, not at the end.
4. After each finished subtask update "Last known state" in `PROGRESS.md` and commit. Before ending a session follow `.continuity/prompts/handoff.md`.
<!-- continuity:end -->
