# New-session kickoff prompt

Copy the block below verbatim into a fresh Claude Code session (or paste
into any Claude chat with the repo checked out). It is self-contained
and assumes zero prior context.

---

I am continuing work on FURLOW, a declarative YAML Discord bot framework
in this repo. The next phase is a parity-and-hardening pass against
YAGPDB and Kite. All decisions, scope, evidence, and milestones are
captured in `docs/PARITY_PLAN.md`. Read that file in full before doing
anything else.

## Ground rules (non-negotiable)

The full list lives in `CLAUDE.md` at repo root. The ones that trip up
most new sessions:

- Never author or co-author any commit as Claude, Assistant, or any AI.
  The human developer is the sole author. Do not add
  `Co-Authored-By: Claude`, `Generated with Claude Code`, or any
  similar trailer to commits, PR bodies, CHANGELOG entries, issues, or
  comments. Use the configured `git config user.name` /
  `user.email`; do not override it.
- No emojis in code, comments, commit messages, docs, YAML examples,
  or console output. Emojis inside functional bot content (reactions,
  canvas labels, example command output that sends an emoji) are fine.
- No em-dashes, en-dashes, or double-dash `--` used as punctuation in
  prose. CLI flags like `--help` are fine (they are code).
- Before running an external/visible action (push to main, npm
  publish, gh pr create), confirm with me first unless I explicitly
  authorized it for this task.

## Workspace

- Primary working directory: `/Users/obsidian/Projects/ossuary-dev/discord-furlow`
- Monorepo with pnpm workspaces and Turborepo.
- Packages: `@furlow/schema`, `@furlow/storage`, `@furlow/core`,
  `@furlow/discord`, `@furlow/pipes`, `@furlow/builtins`,
  `@furlow/testing`, `@furlow/cli`; apps: `apps/dashboard`, `apps/site`.
- Current test totals: 2829 tests across 8 packages, all green
  (plus 50 storage tests skipped under testcontainers).
- Recent versions: `@furlow/core@1.0.13`, `@furlow/discord@1.0.8`,
  `@furlow/builtins@1.0.9`, `@furlow/testing@1.0.7`,
  `@furlow/cli@1.0.16`, `@furlow/schema@1.0.6`,
  `@furlow/dashboard@1.0.5`. Confirm current versions against each
  `package.json` before bumping; memory can drift.
- The persistent memory index lives at
  `/Users/obsidian/.claude/projects/-Users-obsidian-Projects-ossuary-dev-discord-furlow/memory/MEMORY.md`.
  Check it for any additional user-specific guidance.

## Commands

```
pnpm install                          # once
pnpm build                            # all packages
pnpm typecheck
pnpm test                             # root runs with --concurrency=1 to avoid OOM
pnpm --filter @furlow/core test       # single package
```

## Workflow for each milestone

The parity plan defines nine milestones (M1 through M9). Pick one per
session. Do not interleave.

For each milestone:

1. Read `docs/PARITY_PLAN.md` and the relevant milestone section.
2. Create a short task list (the harness will prompt for this if
   helpful, but do not force it).
3. Explore the affected files first. Use Read, Grep, Glob directly for
   known targets; use the Explore or general-purpose agent for broad
   searches.
4. Implement. Keep changes tight. No refactors beyond what the task
   needs. No hypothetical future-proofing. Trust internal code; only
   validate at system boundaries.
5. Run `pnpm build` and `pnpm typecheck` and `pnpm test` in the
   affected packages (and in any downstream package that consumes
   them). Fix anything that breaks before moving on.
6. Update `CHANGELOG.md` under a new date-stamped heading
   (`## YYYY-MM-DD <short title>`). Leave older entries untouched.
7. Bump the patch version of each changed package in its
   `package.json`.
8. Stage explicit paths (no `git add -A`). Commit with a Conventional
   Commits message: `feat(core): ...`, `fix(storage): ...`, etc. No
   AI trailer. No emoji.
9. Ask before pushing to `main` and before `npm publish`. Do not
   assume continuing authorization across milestones.

## Start here

Begin with **M1: per-handler execution quotas** as defined in
`docs/PARITY_PLAN.md` section 1.1. The rationale, the competitor code
paths (`kite-service/pkg/flow/context.go` and
`yagpdb/common/templates/context.go`), the implementation sketch, and
the acceptance tests are already written out.

Before writing code, give me a short plan for how you will structure
the `FlowQuota` object and which files you will touch, so we can align.
After I confirm, proceed.

---

End of prompt.
