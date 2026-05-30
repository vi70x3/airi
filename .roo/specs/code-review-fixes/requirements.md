# Code Review Fixes — Requirements

## Overview

Four verified code-review findings require minimal fixes across the monorepo. Two additional findings (knip-cleanup docs) are skipped because the target files do not exist.

## Verified Findings

### F1: `matchesDestinations` missing export

**File:** `packages/server-runtime/src/middlewares/route/match-expression.ts` (line 124)

**Problem:** `matchesDestinations` is declared as a plain `function` (no `export` keyword), but [`route.ts`](../packages/server-runtime/src/middlewares/route.ts:5) imports it as a named import `{ matchesDestinations }` and re-exports it at line 152. This causes a compile-time or runtime import failure.

**Requirement:** Add `export` keyword to `matchesDestinations` in `match-expression.ts` so the named import in `route.ts` resolves correctly. Verify that peer symbols (`matchesDestination`, `AuthenticatedPeer`) remain internally referenced and that existing tests compile.

### F2: `mcp-config.ts` exports nothing

**File:** `apps/stage-tamagotchi/src/shared/mcp-config.ts`

**Problem:** All symbols — `electronMcpStdioServerConfigSchema`, `parseElectronMcpConfig`, `parseElectronMcpConfigText` — are declared without `export`, yet two consumers import `parseElectronMcpConfigText`:
- [`mcp-servers/index.ts`](../apps/stage-tamagotchi/src/main/services/airi/mcp-servers/index.ts:36)
- [`mcp-config.test.ts`](../apps/stage-tamagotchi/src/renderer/pages/settings/modules/mcp-config.test.ts:4)

**Requirement:** Export `electronMcpStdioServerConfigSchema` and `parseElectronMcpConfigText` (the two symbols with external consumers). Also export `parseElectronMcpConfig` since it is the public validation entrypoint called by `parseElectronMcpConfigText`. Verify imports in both consumer files still resolve and tests pass.

### F5: `@unocss/reset` pinned version in `stage-ui`

**File:** `packages/stage-ui/package.json` (line 160)

**Problem:** `"@unocss/reset": "^66.6.8"` is a pinned semver range while `"unocss": "catalog:"` uses the pnpm catalog. `@unocss/reset` is not listed in the pnpm catalog (`pnpm-workspace.yaml`), so it cannot yet use `catalog:`.

**Requirement:** Add `@unocss/reset` to the `catalog` section of `pnpm-workspace.yaml` with the same version (`^66.6.8`) as `unocss`, then update the dependency in `packages/stage-ui/package.json` from `"^66.6.8"` to `"catalog:"`.

### F6: `@unocss/reset` pinned version in `ui-transitions`

**File:** `packages/ui-transitions/package.json` (line 35)

**Problem:** Same as F5 — `"@unocss/reset": "^66.6.8"` pinned while `"unocss": "catalog:"`.

**Requirement:** After adding `@unocss/reset` to the catalog (F5), update `packages/ui-transitions/package.json` from `"^66.6.8"` to `"catalog:"`.

## Skipped Findings

| # | Description | Reason |
|---|---|---|
| F3 | `docs/specs/knip-cleanup/design.md` MD040 — missing language identifier on fenced code block | Target file does not exist (`ENOENT`). No content to fix. |
| F4 | `docs/specs/knip-cleanup/requirements.md` — contradictory Knip entry pattern for `packages/stage-ui` | Target file does not exist (`ENOENT`). No content to fix. |

## Acceptance Criteria

- `pnpm -F @proj-airi/server-runtime typecheck` passes after F1 fix.
- `pnpm -F @proj-airi/stage-tamagotchi typecheck` passes after F2 fix.
- `pnpm -F @proj-airi/stage-tamagotchi exec vitest run` passes (mcp-config tests) after F2 fix.
- `pnpm -F @proj-airi/server-runtime exec vitest run` passes (route tests) after F1 fix.
- `pnpm install` resolves cleanly after F5/F6 catalog changes.
- No pinned `@unocss/reset` versions remain in `stage-ui` or `ui-transitions` `package.json`.