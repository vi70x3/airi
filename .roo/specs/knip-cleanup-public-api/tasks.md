# Knip Cleanup — Public API Export Retention — Tasks

## D1: Add `ignoreIssues` to plugin-sdk workspace

- [x] **T1.1** Edit [`knip.json`](knip.json) — add `"ignoreIssues": { "packages/plugin-sdk/**": ["exports", "types"] }` at root level
- [x] **T1.2** Edit [`knip.json`](knip.json) — remove redundant `entry` array from `packages/plugin-sdk` workspace (Knip flags it as redundant when `ignoreIssues` covers all exports/types)

---

## D2: Add `ignoreIssues` to core-agent workspace

- [x] **T2.1** Edit [`knip.json`](knip.json) — add `"ignoreIssues": { "packages/core-agent/**": ["exports", "types"] }` at root level
- [x] **T2.2** Edit [`knip.json`](knip.json) — remove redundant `entry` array from `packages/core-agent` workspace

> **Note:** Initial approach used `ignoreExports` at workspace level, but Knip v6.4.1 doesn't support that key. Investigation of `node_modules/knip/dist/schema/configuration.d.ts` revealed `ignoreIssues` at root level with picomatch path patterns is the correct approach. The `$schema` URL was also updated from `knip@5` to `knip@6`.

---

## Verification

- [x] **T3.1** Run `pnpm knip` — verified:
  - Unused exported types: **116 → 100** (16 types suppressed)
  - Unused exports: **7 → 6** (1 export suppressed: `sparkNotifyCommandSchema` from core-agent)
  - Configuration hints: **4 → 0` (redundant entry patterns removed)
- [x] **T3.2** Run `pnpm -F @proj-airi/plugin-sdk typecheck` — passes cleanly
- [x] **T3.3** Run `pnpm -F @proj-airi/core-agent typecheck` — passes cleanly
- [x] **T3.4** Run `pnpm lint` — 30 pre-existing warnings, 0 errors from our changes
- [x] **T3.5** Captured remaining **100 unused exported types** — see [`knip-cleanup-types` spec](.roo/specs/knip-cleanup-types/) for follow-up

---

## Summary

### Completed: 100% of tasks (all 9 items)

**Knip results after this spec:**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Unused dependencies | 43 | 43 | — |
| Unused exports | 7 | 6 | -1 |
| Unused exported types | 116 | 100 | -16 |
| Configuration hints | 0 | 0 | — |

**Key learning:** Knip v6 uses `ignoreIssues` with picomatch path patterns (not workspace names) at the root configuration level to suppress issue types for specific paths. The `ignoreExports` key used in Knip v5 was removed in v6.

**Branch:** `spec/knip-cleanup-public-api` — ready for commit and push.
