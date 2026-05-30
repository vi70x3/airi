# Knip Cleanup — Unused Exported Types — Requirements

## Overview

This spec targets the remaining 100 unused exported types flagged by Knip across the monorepo. The [`knip-cleanup-public-api`](.roo/specs/knip-cleanup-public-api/) spec was completed first, using `ignoreIssues` configuration to mark `plugin-sdk` and `core-agent` exports as public API (reducing the count from 116 to 100). The remaining 100 flagged types are candidates for removal — but each must be verified against both `.ts` and `.vue` source files to eliminate false positives.

**Prerequisite:** This spec depends on [`knip-cleanup-public-api`](.roo/specs/knip-cleanup-public-api/) being completed first. That spec reduced the count from 116 to 100 by suppressing `exports` and `types` issues for `plugin-sdk` and `core-agent` paths.

**Critical context:** Knip does not scan `.vue` file `<script setup>` imports by default. Some types may appear "unused" to Knip but are actually referenced in Vue SFC prop definitions, template type annotations, or `defineProps<T>()` calls. Every type must be verified against both `.ts` and `.vue` source files before removal.

**Baseline after public-api spec:** 100 unused exported types across the monorepo.

---

## R1: Capture the Reduced List of Flagged Types

After the public-api spec adds `ignoreIssues` to `plugin-sdk` and `core-agent`, the Knip report shows 100 remaining unused exported types.

**Requirement:** Run `pnpm knip` and capture the full list of remaining unused exported types. Group them by workspace for systematic analysis.

---

## R2: Verify Each Type Against All Source Files

For each remaining flagged type, perform a three-layer verification:

### R2.1: Direct import verification

Search all `.ts` files for explicit `import { TypeName }` or `import type { TypeName }` references across the monorepo.

**Requirement:** Use `search_files` to find all import references for each type. If any `.ts` file imports the type, it is NOT orphaned — retain it.

### R2.2: Vue SFC verification

Search all `.vue` files for the type name. Types can appear in:
- `defineProps<TypeName>()` or `defineProps<{ ... TypeName ... }>()`
- `defineEmits<TypeName>()`
- `<script setup lang="ts">` import statements
- Template type annotations
- Generic type parameters in composable calls

**Requirement:** Use `search_files` to find all `.vue` file references for each type. If any `.vue` file uses the type, it is NOT orphaned — retain it.

### R2.3: Implicit usage verification

Some types are used without explicit imports:
- Types referenced in `package.json` `exports` declarations (public API surface)
- Types used as generic parameters in other exported functions
- Types that appear in Valibot/Zod schema definitions (runtime type inference)

**Requirement:** Check each type for implicit usage patterns. If a type is referenced in any of these ways, it is NOT orphaned — retain it.

---

## R3: Remove Verified Orphaned Types

For types confirmed as genuinely unused across all three verification layers:

### R3.1: Remove the type declaration

**Requirement:** Remove the `export type` or `export interface` declaration from its source file. If the type is the only export in the file, consider deleting the entire file (see R3.2).

### R3.2: Remove empty files

If removing a type declaration leaves a file with no remaining exports:

**Requirement:** Delete the file entirely and remove it from any barrel `index.ts` re-export lists that reference it.

### R3.3: Update barrel files

If a removed type was re-exported from a barrel `index.ts`:

**Requirement:** Remove the re-export line from the barrel file. If the barrel becomes empty, delete it and update `package.json` exports if needed.

---

## R4: Workspace-Specific Analysis

The 100 flagged types are distributed across multiple workspaces. Each workspace needs its own analysis batch:

### R4.1: packages/stage-ui

The largest source of flagged types. Many stage-ui types define component prop interfaces, store state shapes, and composable return types. These are likely used in `.vue` files that Knip cannot trace.

**Requirement:** Analyze stage-ui types with extra scrutiny for Vue SFC usage. Expect most types to be retained as false positives.

### R4.2: packages/stage-ui-three

Three.js binding types may be used in component prop definitions within `.vue` files.

**Requirement:** Verify each type against `ThreeScene.vue`, `VRMModel.vue`, `SkyBox.vue`, `OrbitControls.vue` and other `.vue` files in the workspace.

### R4.3: apps/stage-tamagotchi

Desktop app types may be used across the Electron main/renderer process boundary via Eventa IPC contracts.

**Requirement:** Verify each type against both `src/main/` and `src/renderer/` source files, including `.vue` pages.

### R4.4: Other workspaces

Any remaining workspaces with flagged types need individual verification.

**Requirement:** Apply the same three-layer verification (R2.1–R2.3) to each workspace's flagged types.

---

## R5: Progressive Verification After Each Workspace Batch

To avoid accumulating breakage:

**Requirement:** After completing type removal for each workspace batch:
1. Run `pnpm -F <workspace> typecheck` — confirm no type errors
2. Run `pnpm knip` — verify the flagged count decreases as expected
3. Only proceed to the next workspace batch if typecheck passes

---

## Out of Scope

- **Public API types in plugin-sdk and core-agent** — Handled by [`knip-cleanup-public-api`](.roo/specs/knip-cleanup-public-api/) spec
- **Unused dependencies** — The 43 remaining unused dependencies are false positives from `.vue` usage; not part of this spec
- **Unused exports (functions/values)** — The 6 remaining unused exports were analyzed in previous specs and retained as false positives or intentional public API

## Verification Requirements

After completing all type removals:

1. `pnpm install` — ensure lockfile consistency
2. `pnpm -F @proj-airi/stage-ui typecheck` — confirm no type errors
3. `pnpm -F @proj-airi/stage-ui-three typecheck` — confirm no type errors
4. `pnpm -F @proj-airi/stage-tamagotchi typecheck` — confirm no type errors
5. `pnpm -F @proj-airi/plugin-sdk typecheck` — confirm no type errors
6. `pnpm -F @proj-airi/core-agent typecheck` — confirm no type errors
7. `pnpm knip` — verify significantly reduced "unused exported types" count
8. `pnpm lint` — confirm no lint issues