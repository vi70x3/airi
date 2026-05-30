# Code Review Fixes — Design

## F1: Export `matchesDestinations` in match-expression.ts

**Current state:** `function matchesDestinations(...)` at line 124 — no `export` keyword.

**Change:** Add `export` keyword to make it a named export.

```ts
// Before (line 124)
function matchesDestinations(destinations: Array<string | RouteTargetExpression>, peer: AuthenticatedPeer) {

// After
export function matchesDestinations(destinations: Array<string | RouteTargetExpression>, peer: AuthenticatedPeer) {
```

**Impact analysis:**
- [`route.ts`](../packages/server-runtime/src/middlewares/route.ts:5) already imports `{ matchesDestinations }` — this import will now resolve correctly.
- [`route.ts`](../packages/server-runtime/src/middlewares/route.ts:152) re-exports `matchesDestinations` — this will now work.
- [`route.test.ts`](../packages/server-runtime/src/middlewares/route.test.ts:7) imports `matchesDestinations` from `./route` (the re-export) — no change needed.
- [`index.ts`](../packages/server-runtime/src/index.ts:36) imports `matchesDestinations` from `./middlewares` — no change needed.
- `matchesDestination` (singular) remains a private helper — no change needed.
- `AuthenticatedPeer` is imported as a type — no change needed.

**Validation:** `pnpm -F @proj-airi/server-runtime typecheck` + `pnpm -F @proj-airi/server-runtime exec vitest run`

---

## F2: Export symbols in mcp-config.ts

**Current state:** All three key symbols are unexported:
- `electronMcpStdioServerConfigSchema` (line 30) — `const` without `export`
- `parseElectronMcpConfig` (line 91) — `function` without `export`
- `parseElectronMcpConfigText` (line 113) — `function` without `export`

**Change:** Add `export` to all three.

```ts
// Before (line 30)
const electronMcpStdioServerConfigSchema = z.object({...

// After
export const electronMcpStdioServerConfigSchema = z.object({...

// Before (line 91)
function parseElectronMcpConfig(value: unknown): ElectronMcpStdioConfigFile {

// After
export function parseElectronMcpConfig(value: unknown): ElectronMcpStdioConfigFile {

// Before (line 113)
function parseElectronMcpConfigText(text: string): ElectronMcpStdioConfigFile {

// After
export function parseElectronMcpConfigText(text: string): ElectronMcpStdioConfigFile {
```

**Impact analysis:**
- [`mcp-servers/index.ts`](../apps/stage-tamagotchi/src/main/services/airi/mcp-servers/index.ts:36) imports `parseElectronMcpConfigText` — will now resolve.
- [`mcp-config.test.ts`](../apps/stage-tamagotchi/src/renderer/pages/settings/modules/mcp-config.test.ts:4) imports `parseElectronMcpConfigText` — will now resolve.
- `stringifyError` and `formatElectronMcpConfigIssues` remain private helpers — no change needed.
- `electronMcpConfigSchema` (line 52) is only used internally by `parseElectronMcpConfig` — keep private unless a consumer requests it.

**Validation:** `pnpm -F @proj-airi/stage-tamagotchi typecheck` + `pnpm -F @proj-airi/stage-tamagotchi exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/modules/mcp-config.test.ts`

---

## F5+F6: Catalog `@unocss/reset`

**Current state:**
- `pnpm-workspace.yaml` catalog has `unocss: ^66.6.8` but no `@unocss/reset` entry.
- `packages/stage-ui/package.json` line 160: `"@unocss/reset": "^66.6.8"` (pinned)
- `packages/ui-transitions/package.json` line 35: `"@unocss/reset": "^66.6.8"` (pinned)

**Change:** Two steps:

1. Add `@unocss/reset` to the `catalog` section in `pnpm-workspace.yaml` (alphabetically near `unocss`):

```yaml
# Before (around line 66)
  unocss: ^66.6.8

# After
  '@unocss/reset': ^66.6.8
  unocss: ^66.6.8
```

2. Update both package.json files:

```json
// packages/stage-ui/package.json — Before
"@unocss/reset": "^66.6.8"

// After
"@unocss/reset": "catalog:"
```

```json
// packages/ui-transitions/package.json — Before
"@unocss/reset": "^66.6.8"

// After
"@unocss/reset": "catalog:"
```

**Impact analysis:**
- Both packages already use `"unocss": "catalog:"` — adding `@unocss/reset` to the catalog ensures the reset plugin version stays synchronized with the core UnoCSS version.
- `pnpm install` will resolve `@unocss/reset` from the catalog just like `unocss`.

**Validation:** `pnpm install` resolves without errors. No other packages reference `@unocss/reset` with a pinned version (verified via search).

---

## Dependency graph

```mermaid
graph TD
    F1[F1: export matchesDestinations] --> RT[route.ts import resolves]
    F1 --> TEST1[route.test.ts passes]
    F2[F2: export mcp-config symbols] --> MCP[mcp-servers/index.ts import resolves]
    F2 --> TEST2[mcp-config.test.ts passes]
    F5[F5: add @unocss/reset to catalog] --> F6[F6: update ui-transitions package.json]
    F5 --> SU[stage-ui package.json updated]
    F6 --> INSTALL[pnpm install resolves]