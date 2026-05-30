# Knip Cleanup — Tasks (Phase 2)

## Phase 1 Tasks (Completed)

- [x] **T1.1** Run `pnpm --filter @proj-airi/stage-tamagotchi add replicate @formkit/auto-animate`
- [x] **T2.1** Edit `knip.json` to add Vue page/layout entry patterns
- [x] **T2.2** Review other workspaces for similar missing entry patterns
- [x] **T3.1** Remove four confirmed unused packages
- [x] **T3.2** Check and remove `onnxruntime-web`
- [x] **T3.3** Check for @types packages to remove
- [x] **T4.1** Run `pnpm install`
- [x] **T4.2** Run typecheck
- [x] **T4.3** Run `pnpm knip` and review output
- [x] **T4.4** Document remaining genuine issues

## Phase 2 Tasks

### Phase 2A: Add Dynamic Entry Points (Category A)

- [ ] **T2A.1** Edit [`knip.json`](knip.json) to add `src/preload/beat-sync.ts` to the `apps/stage-tamagotchi` workspace `entry` array
- [ ] **T2A.2** Add a new `packages/stage-ui-live2d` workspace entry in [`knip.json`](knip.json) with `entry: ["src/utils/live2d-structure-report.ts"]` and `project: ["src/**/*.ts", "src/**/*.vue"]`

### Phase 2B: Exclude Test Data (Category B)

- [ ] **T2B.1** Edit [`knip.json`](knip.json) to add negation pattern `!src/**/testdata/**` to the `packages/plugin-sdk` workspace `project` array

### Phase 2C: Add Package Entry Points (Category C)

- [ ] **T2C.1** Add `"entry": ["src/index.ts"]` to the `packages/plugin-sdk` workspace in [`knip.json`](knip.json)
- [ ] **T2C.2** Add `"entry": ["src/index.ts"]` to the `packages/core-agent` workspace in [`knip.json`](knip.json)
- [ ] **T2C.3** Add `"entry": ["src/index.ts"]` to the `packages/stage-ui-three` workspace in [`knip.json`](knip.json)
- [ ] **T2C.4** Add `"entry": ["src/index.ts"]` to the `packages/ccc` workspace in [`knip.json`](knip.json)
- [ ] **T2C.5** Fix [`packages/ccc/src/define/index.ts`](packages/ccc/src/define/index.ts) — add `export { type Ext, defineExt } from './ext'` to the barrel file so `defineExt` and `Ext` are reachable from the package root

### Phase 2D: Delete Genuine Dead Code (Category D)

#### apps/stage-tamagotchi (9 files)

- [ ] **T2D.1** Delete [`src/main/services/electron/system-preferences.ts`](apps/stage-tamagotchi/src/main/services/electron/system-preferences.ts)
- [ ] **T2D.2** Delete entire [`src/main/windows/dashboard/`](apps/stage-tamagotchi/src/main/windows/dashboard/) directory (contains `index.ts` and `rpc/index.electron.ts`)
- [ ] **T2D.3** Delete [`src/main/windows/shared/persistence.ts`](apps/stage-tamagotchi/src/main/windows/shared/persistence.ts)
- [ ] **T2D.4** Delete [`src/renderer/components/IconAnimation.vue`](apps/stage-tamagotchi/src/renderer/components/IconAnimation.vue)
- [ ] **T2D.5** Delete [`src/renderer/components/stage-islands/resource-status-island/loading-component-detail.vue`](apps/stage-tamagotchi/src/renderer/components/stage-islands/resource-status-island/loading-component-detail.vue)
- [ ] **T2D.6** Delete [`src/renderer/composables/icon-animation.ts`](apps/stage-tamagotchi/src/renderer/composables/icon-animation.ts)
- [ ] **T2D.7** Delete [`src/renderer/stores/window.ts`](apps/stage-tamagotchi/src/renderer/stores/window.ts)
- [ ] **T2D.8** Delete [`src/renderer/utils/windows.ts`](apps/stage-tamagotchi/src/renderer/utils/windows.ts)

#### packages/plugin-sdk (4 files)

- [ ] **T2D.9** Delete [`src/plugin/local.ts`](packages/plugin-sdk/src/plugin/local.ts)
- [ ] **T2D.10** Delete [`src/plugin/local/index.ts`](packages/plugin-sdk/src/plugin/local/index.ts)
- [ ] **T2D.11** Delete [`src/plugin/remote.ts`](packages/plugin-sdk/src/plugin/remote.ts)
- [ ] **T2D.12** Delete [`src/plugin/remote/index.ts`](packages/plugin-sdk/src/plugin/remote/index.ts)

#### packages/stage-ui (3 files)

- [ ] **T2D.13** Delete [`src/components/animations/Replayable.vue`](packages/stage-ui/src/components/animations/Replayable.vue)
- [ ] **T2D.14** Check if [`src/components/animations/use-replayable.ts`](packages/stage-ui/src/components/animations/use-replayable.ts) becomes orphaned after Replayable.vue deletion — if so, delete it too
- [ ] **T2D.15** Delete [`src/utils/relative-time.ts`](packages/stage-ui/src/utils/relative-time.ts)
- [ ] **T2D.16** Delete [`src/utils/stream.ts`](packages/stage-ui/src/utils/stream.ts)

### Phase 2E: Verification

- [ ] **T2E.1** Run `pnpm install` to ensure lockfile consistency
- [ ] **T2E.2** Run `pnpm -F @proj-airi/stage-tamagotchi typecheck` to confirm no type errors from deletions
- [ ] **T2E.3** Run `pnpm knip` and verify:
  - Category A, B, C files no longer flagged
  - Category D files gone (deleted)
  - Unused exports count significantly reduced
- [ ] **T2E.4** Review remaining unused exports — remove unnecessary `export` keywords from internally-used-only functions
- [ ] **T2E.5** Run `pnpm lint` to confirm no lint issues from changes