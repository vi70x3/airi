# Knip Cleanup — Unused Exported Types — Tasks

> **Prerequisite:** The [`knip-cleanup-public-api`](.roo/specs/knip-cleanup-public-api/) spec must be completed and merged before starting these tasks. The `ignoreExports` configuration added there will reduce the initial 116 flagged types to a smaller set of genuinely orphaned types.

## Phase 0: Capture Reduced Type List

- [ ] **T0.1** Run `pnpm knip` after public-api spec is merged — capture the full list of remaining unused exported types
- [ ] **T0.2** Group flagged types by workspace — create a per-workspace inventory table
- [ ] **T0.3** Estimate false-positive rate per workspace based on type naming patterns (e.g., `*Props`, `*State`, `*Options` are likely Vue SFC false positives)

---

## Phase 1: packages/stage-ui Batch

> Largest expected batch. High false-positive rate expected due to `.vue` component usage.

- [ ] **T1.0** Run `pnpm knip` and capture all flagged types in `packages/stage-ui`
- [ ] **T1.1–T1.N** For each flagged type in stage-ui:
  - Search `.ts` imports across monorepo
  - Search `.vue` usage across monorepo
  - Check implicit usage (package exports, schema inference, extends clauses)
  - Remove if genuinely orphaned; retain if any usage found
- [ ] **T1.V1** Run `pnpm -F @proj-airi/stage-ui typecheck` — confirm no type errors after removals
- [ ] **T1.V2** Run `pnpm knip` — verify reduced count for this workspace

---

## Phase 2: packages/stage-ui-three Batch

> Small batch. Verify against `.vue` component files.

- [ ] **T2.0** Run `pnpm knip` and capture all flagged types in `packages/stage-ui-three`
- [ ] **T2.1–T2.N** For each flagged type in stage-ui-three:
  - Search `.ts` imports across monorepo
  - Search `.vue` usage (especially `ThreeScene.vue`, `VRMModel.vue`, `SkyBox.vue`, `OrbitControls.vue`)
  - Check implicit usage
  - Remove if genuinely orphaned; retain if any usage found
- [ ] **T2.V1** Run `pnpm -F @proj-airi/stage-ui-three typecheck` — confirm no type errors after removals
- [ ] **T2.V2** Run `pnpm knip` — verify reduced count for this workspace

---

## Phase 3: packages/stage-layouts Batch

> Small batch. Verify against layout `.vue` files.

- [ ] **T3.0** Run `pnpm knip` and capture all flagged types in `packages/stage-layouts`
- [ ] **T3.1–T3.N** For each flagged type in stage-layouts:
  - Search `.ts` imports across monorepo
  - Search `.vue` usage across monorepo
  - Check implicit usage
  - Remove if genuinely orphaned; retain if any usage found
- [ ] **T3.V1** Run `pnpm -F @proj-airi/stage-layouts typecheck` — confirm no type errors after removals
- [ ] **T3.V2** Run `pnpm knip` — verify reduced count for this workspace

---

## Phase 4: apps/stage-tamagotchi Batch

> Medium batch. Verify across Electron main/renderer boundary and Eventa IPC contracts.

- [ ] **T4.0** Run `pnpm knip` and capture all flagged types in `apps/stage-tamagotchi`
- [ ] **T4.1–T4.N** For each flagged type in stage-tamagotchi:
  - Search `.ts` imports across `src/main/` and `src/renderer/`
  - Search `.vue` usage across renderer pages and layouts
  - Check Eventa IPC contract usage (types may cross main/renderer boundary)
  - Remove if genuinely orphaned; retain if any usage found
- [ ] **T4.V1** Run `pnpm -F @proj-airi/stage-tamagotchi typecheck` — confirm no type errors after removals
- [ ] **T4.V2** Run `pnpm knip` — verify reduced count for this workspace

---

## Phase 5: Other Workspaces Batch

> Scattered small batches across remaining workspaces.

- [ ] **T5.0** Run `pnpm knip` and capture all flagged types in remaining workspaces
- [ ] **T5.1–T5.N** For each flagged type in remaining workspaces:
  - Apply three-layer verification
  - Remove if genuinely orphaned; retain if any usage found
- [ ] **T5.V1** Run typecheck for each affected workspace — confirm no type errors
- [ ] **T5.V2** Run `pnpm knip` — verify reduced count

---

## Final Verification

- [ ] **T6.1** Run `pnpm install` — ensure lockfile consistency
- [ ] **T6.2** Run `pnpm -F @proj-airi/stage-ui typecheck` — confirm no type errors
- [ ] **T6.3** Run `pnpm -F @proj-airi/stage-ui-three typecheck` — confirm no type errors
- [ ] **T6.4** Run `pnpm -F @proj-airi/stage-tamagotchi typecheck` — confirm no type errors
- [ ] **T6.5** Run `pnpm -F @proj-airi/plugin-sdk typecheck` — confirm no type errors
- [ ] **T6.6** Run `pnpm -F @proj-airi/core-agent typecheck` — confirm no type errors
- [ ] **T6.7** Run `pnpm knip` — verify significantly reduced "unused exported types" count
- [ ] **T6.8** Run `pnpm lint` — confirm no lint issues

---

> **Note:** The exact task IDs (T1.1–T1.N, etc.) will be filled in during implementation when the actual type list is captured after the public-api spec is completed. The template above defines the process structure; individual type verification tasks will be expanded as needed.