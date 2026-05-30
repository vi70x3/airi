# Knip Cleanup — Public API Export Retention — Design

## Overview

This design covers a single focused change: adding `ignoreExports` configuration to [`knip.json`](knip.json) for two public SDK workspaces (`plugin-sdk` and `core-agent`). This eliminates false-positive Knip flags on their exported types and functions, which are intentionally public API contracts for downstream consumers.

**Approach chosen:** `ignoreExports` globs over `@public` JSDoc tags. Both `plugin-sdk` and `core-agent` are entirely public API surfaces — every export is intentionally public. Using blanket `ignoreExports` is simpler, requires no source file modifications, and automatically covers future exports added to these packages.

---

## D1: Add `ignoreExports` to plugin-sdk Workspace

**Target file:** [`knip.json`](knip.json:45)

Current configuration:
```json
"packages/plugin-sdk": {
  "project": [
    "src/**/*.ts",
    "!src/**/testdata/**"
  ]
}
```

**Change:** Add `ignoreExports` array:
```json
"packages/plugin-sdk": {
  "entry": ["src/index.ts", "src/plugin-host/index.ts"],
  "project": [
    "src/**/*.ts",
    "!src/**/testdata/**"
  ],
  "ignoreExports": ["src/**/*.ts"]
}
```

**Rationale:** The `entry` arrays are also added here because `plugin-sdk` currently lacks them (identified as a carry-over task T0.3 from the original [`knip-cleanup`](.roo/specs/knip-cleanup/tasks.md) spec that was deferred). The `ignoreExports` glob covers all source files since the entire package is a public SDK.

---

## D2: Add `ignoreExports` to core-agent Workspace

**Target file:** [`knip.json`](knip.json:51)

Current configuration:
```json
"packages/core-agent": {
  "project": [
    "src/**/*.ts"
  ]
}
```

**Change:** Add `entry` and `ignoreExports` arrays:
```json
"packages/core-agent": {
  "entry": ["src/index.ts", "src/agents/spark-notify/index.ts"],
  "project": [
    "src/**/*.ts"
  ],
  "ignoreExports": ["src/**/*.ts"]
}
```

**Rationale:** The `entry` arrays are added because `core-agent` also lacks them (carry-over task T0.2 from [`knip-cleanup`](.roo/specs/knip-cleanup/tasks.md)). The `ignoreExports` glob covers all source files since the entire package is a public agent runtime API.

---

## D3: Verification

After both changes:

1. Run `pnpm knip` — verify the "unused exported types" count drops significantly
2. Run `pnpm -F @proj-airi/plugin-sdk typecheck` — confirm no type errors
3. Run `pnpm -F @proj-airi/core-agent typecheck` — confirm no type errors
4. Run `pnpm lint` — confirm no lint issues

**Expected outcome:** The 116 unused exported types count should drop to approximately 20–40, depending on how many flagged types belong to `plugin-sdk` and `core-agent`. The remaining flagged types belong to other workspaces (`stage-ui`, `stage-ui-three`, `stage-tamagotchi`, etc.) and will be addressed in the [`knip-cleanup-types`](.roo/specs/knip-cleanup-types/) spec.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Start] --> B[D1: Add ignoreExports + entry to plugin-sdk in knip.json]
    B --> C[D2: Add ignoreExports + entry to core-agent in knip.json]
    C --> D[Run pnpm knip]
    D --> E{Unused types count reduced?}
    E -->|Yes| F[Run typecheck on plugin-sdk + core-agent]
    E -->|No| G[Debug knip.json config]
    G --> B
    F --> H{Typechecks pass?}
    H -->|Yes| I[Run pnpm lint]
    H -->|No| J[Revert + fix entry/ignoreExports config]
    J --> B
    I --> K{Lint clean?}
    K -->|Yes| L[Done — proceed to knip-cleanup-types spec]
    K -->|No| M[Fix lint issues]
    M --> I