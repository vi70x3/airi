# Knip Cleanup — Public API Export Retention — Requirements

## Overview

This spec addresses the false-positive Knip flags on public SDK workspaces. Packages like `plugin-sdk` and `core-agent` export types and functions as part of their public API surface — these are intended for external consumers (plugins, agents, downstream packages) even if no current monorepo workspace imports them. Knip flags these as "unused" because it only traces usage within the monorepo.

**Prerequisite context:** This spec continues the work from [`knip-cleanup`](.roo/specs/knip-cleanup/) and [`knip-cleanup-extended`](.roo/specs/knip-cleanup-extended/). Those specs deferred T3.9–T3.10 (public API export retention) because the focus was on removing genuinely unused items. This spec handles the retention side: marking public API exports so Knip no longer flags them.

---

## R1: Add `ignoreExports` Configuration to knip.json for Public SDK Workspaces

Two workspaces in [`knip.json`](knip.json) define `project` patterns but lack `ignoreExports` entries. Their exported symbols form a public API contract for downstream consumers outside the monorepo's direct import graph.

### R1.1: packages/plugin-sdk

[`packages/plugin-sdk`](packages/plugin-sdk/package.json) exports a plugin development API via two entry points:
- `.` — main SDK index ([`src/index.ts`](packages/plugin-sdk/src/index.ts))
- `./plugin-host` — host runtime ([`src/plugin-host/index.ts`](packages/plugin-sdk/src/plugin-host/index.ts))

Knip currently scans all `.ts` files under `src/` and flags exports that no monorepo workspace imports. But these exports are the public contract for plugin authors.

**Requirement:** Add `ignoreExports` to the `packages/plugin-sdk` workspace configuration in [`knip.json`](knip.json) covering all source files:

```json
"ignoreExports": ["src/**/*.ts"]
```

This tells Knip to skip flagging any export from `plugin-sdk` as unused, since the entire package is a public API surface.

### R1.2: packages/core-agent

[`packages/core-agent`](packages/core-agent/package.json) exports an agent runtime orchestration API via two entry points:
- `.` — main index ([`src/index.ts`](packages/core-agent/src/index.ts))
- `./agents/spark-notify` — Spark Notify agent ([`src/agents/spark-notify/index.ts`](packages/core-agent/src/agents/spark-notify/index.ts))

Like `plugin-sdk`, its exports are a public contract for agent developers and downstream orchestrators.

**Requirement:** Add `ignoreExports` to the `packages/core-agent` workspace configuration in [`knip.json`](knip.json) covering all source files:

```json
"ignoreExports": ["src/**/*.ts"]
```

---

## R2: Evaluate `@public` JSDoc Tag Alternative

Instead of blanket `ignoreExports` globs, individual exports could be annotated with `/** @public */` JSDoc tags. Knip recognizes `@public` as a marker that the export is intentionally part of the public API.

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| `ignoreExports` globs | Single config change; covers all current and future exports; no source file modifications | Suppresses flags on genuinely orphaned exports too; less granular |
| `@public` JSDoc tags | Granular per-export control; only marks intentionally public items; orphaned items still flagged for cleanup | Requires modifying many source files; ongoing maintenance burden for new exports; tedious for 116+ types |

**Requirement:** Evaluate both approaches. Prefer `ignoreExports` globs for `plugin-sdk` and `core-agent` since these packages are entirely public API surfaces — every export is intentionally public. If a workspace has a mix of public and internal exports, `@public` tags would be more appropriate, but neither `plugin-sdk` nor `core-agent` has that pattern.

---

## R3: Verify Knip Report Improvement

After adding `ignoreExports` configuration:

**Requirement:** Run `pnpm knip` and verify:
- The "unused exported types" count drops significantly (many of the 116 flagged types belong to `plugin-sdk` and `core-agent`)
- No new false positives introduced
- Remaining flagged types are genuinely orphaned and not part of a public API contract

---

## Out of Scope

- **Pruning genuinely orphaned types** — After this spec reduces the flagged count, a follow-up spec ([`knip-cleanup-types`](.roo/specs/knip-cleanup-types/)) will analyze and remove the remaining truly unused types.
- **Other workspaces** — Only `plugin-sdk` and `core-agent` are fully public API surfaces. Other flagged workspaces (`stage-ui`, `stage-ui-three`, etc.) have mixed public/internal exports and need per-export analysis, not blanket `ignoreExports`.

## Verification Requirements

1. `pnpm install` — ensure lockfile consistency (no changes expected)
2. `pnpm -F @proj-airi/plugin-sdk typecheck` — confirm no type errors
3. `pnpm -F @proj-airi/core-agent typecheck` — confirm no type errors
4. `pnpm knip` — verify reduced "unused exported types" count
5. `pnpm lint` — confirm no lint issues