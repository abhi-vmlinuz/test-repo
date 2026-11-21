// opencode adapter for project-continuity. Thin on purpose: all logic is in .continuity/continuity.sh,
// so the git hook + AGENTS.md still protect you if this plugin fails to load or the plugin API changes.
const WRITE_TOOLS = new Set(["edit", "write", "patch", "multiedit"])

export const Continuity = async ({ $, directory, worktree }) => {
  const root = worktree || directory
  const script = `${root}/.continuity/continuity.sh`

  return {
    // Block edits to frozen / human-owned paths BEFORE the agent writes them.
    "tool.execute.before": async (input, output) => {
      if (!WRITE_TOOLS.has(input.tool)) return
      const target = output.args?.filePath ?? output.args?.path
      if (!target) return
      const r = await $`${script} check-path ${target}`.quiet().nothrow()
      if (r.exitCode === 2) {
        throw new Error(r.stderr.toString().trim() || `Blocked by .continuity/PROTECTED.md: ${target}`)
      }
    },

    // Keep vision, scope fence and protected paths alive through context compaction.
    "experimental.session.compacting": async (input, output) => {
      const r = await $`${script} start --brief`.quiet().nothrow()
      const brief = r.stdout.toString().trim()
      if (brief) output.context.push(`## Project continuity (preserve through compaction)\n${brief}`)
    },
  }
}
