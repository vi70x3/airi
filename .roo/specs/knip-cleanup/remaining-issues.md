# Knip Cleanup — Remaining Issues (Phase 2)

## Summary of Phase 1 Changes

| Change | Status |
|--------|--------|
| Added `replicate` and `@formkit/auto-animate` to dependencies | Done |
| Added `src/renderer/pages/**/*.vue` and `src/renderer/layouts/**/*.vue` to knip.json entries | Done |
| Removed `@huggingface/transformers` | Done |
| Removed `@tresjs/cientos` | Done |
| Removed `chess.js` | Done |
| Removed `d3` | Done |
| Removed `onnxruntime-web` (not a peer dep, zero imports) | Done |

## Knip Results After Phase 1

| Metric | Before | After Phase 1 |
|--------|--------|----------------|
| Unused files | 109 | 29 |
| Unused exports | 62 | 58 |
| Unlisted dependencies | 2 | 0 |

The entry-point fix eliminated 80 false positives (Vue pages/layouts that Knip couldn't trace).

## Classification of 29 Remaining Unused Files

Each file has been investigated and classified into one of four categories:

### Category A: Dynamic Entry Points (add to knip.json)

These files are actively used at runtime but loaded via string paths that Knip cannot trace statically. They should be added to the `entry` array in [`knip.json`](knip.json) under the appropriate workspace.

| File | Workspace | Evidence |
|------|-----------|----------|
| `src/preload/beat-sync.ts` | apps/stage-tamagotchi | Referenced as string path `../preload/beat-sync.mjs` in [`src/main/windows/beat-sync/index.ts`](apps/stage-tamagotchi/src/main/windows/beat-sync/index.ts:13) |
| `src/utils/live2d-structure-report.ts` | packages/stage-ui-live2d | Standalone CLI script with command-line invocation guard at end of file |

### Category B: Test Data (exclude from knip project scan)

These files are only imported during testing via dynamic `join()` path construction that Knip cannot trace.

| File | Workspace | Evidence |
|------|-----------|----------|
| `src/plugin-host/testdata/test-error-plugin.ts` | packages/plugin-sdk | Imported via `join(import.meta.dirname, 'testdata', 'test-error-plugin.ts')` in [`core.test.ts`](packages/plugin-sdk/src/plugin-host/core.test.ts:104) |
| `src/plugin-host/testdata/test-injected-host-apis-plugin.ts` | packages/plugin-sdk | Imported via `join(import.meta.dirname, 'testdata', ...)` in [`core.test.ts`](packages/plugin-sdk/src/plugin-host/core.test.ts:791) |
| `src/plugin-host/testdata/test-no-connect-plugin.ts` | packages/plugin-sdk | Imported via `join(import.meta.dirname, 'testdata', ...)` in [`core.test.ts`](packages/plugin-sdk/src/plugin-host/core.test.ts:312) |
| `src/plugin-host/testdata/test-normal-plugin.ts` | packages/plugin-sdk | Imported via `join(import.meta.dirname, 'testdata', ...)` in [`core.test.ts`](packages/plugin-sdk/src/plugin-host/core.test.ts:65) |

### Category C: Missing Package Entry Points (add entry to knip.json)

These are barrel files or public API modules that Knip flags because the workspace configuration lacks an `entry` array, so Knip doesn't know which files are the package's public surface.

| File | Workspace | Root Cause |
|------|-----------|------------|
| `src/channels/index.ts` | packages/plugin-sdk | Workspace has no `entry` in knip.json; this barrel exports `channels`, `setActiveHostChannel`, `setActiveDataChannel` — public API not traced |
| `src/channels/local/event-target/index.ts` | packages/plugin-sdk | Local channel implementation barrel; no entry configured |
| `src/channels/remote/websocket/index.ts` | packages/plugin-sdk | Remote channel implementation barrel; no entry configured |
| `src/messages/index.ts` | packages/core-agent | Barrel re-exports from compaction/projection/render/types; workspace has no `entry` in knip.json |
| `src/composables/index.ts` | packages/stage-ui-three | Barrel re-exporting shader and vrm composables; workspace has no `entry` |
| `src/composables/shader/index.ts` | packages/stage-ui-three | Shader composable barrel; cascading from missing entry |
| `src/define/ext.ts` | packages/ccc | `defineExt` and `Ext` type not re-exported from `define/index.ts` barrel; workspace has no `entry` |

### Category D: Genuine Dead Code (delete)

These files have zero imports anywhere in the workspace and are not dynamically loaded. They should be deleted.

| File | Workspace | Notes |
|------|-----------|-------|
| `src/main/services/electron/system-preferences.ts` | apps/stage-tamagotchi | Export `createSystemPreferencesService` — no imports found |
| `src/main/windows/dashboard/index.ts` | apps/stage-tamagotchi | `setupDashboardWindow` not imported in [`src/main/index.ts`](apps/stage-tamagotchi/src/main/index.ts:41); dashboard window is dead |
| `src/main/windows/dashboard/rpc/index.electron.ts` | apps/stage-tamagotchi | Only imported by dead dashboard/index.ts — cascade delete |
| `src/main/windows/shared/persistence.ts` | apps/stage-tamagotchi | Re-export barrel from `../../libs/electron/persistence` — no imports found |
| `src/renderer/components/IconAnimation.vue` | apps/stage-tamagotchi | No imports found |
| `src/renderer/components/stage-islands/resource-status-island/loading-component-detail.vue` | apps/stage-tamagotchi | No imports found |
| `src/renderer/composables/icon-animation.ts` | apps/stage-tamagotchi | `useIconAnimation` — no imports from other files |
| `src/renderer/stores/window.ts` | apps/stage-tamagotchi | `useWindowStore` — no imports found |
| `src/renderer/utils/windows.ts` | apps/stage-tamagotchi | Stub `startClickThrough`/`stopClickThrough` — no imports found |
| `src/plugin/local.ts` | packages/plugin-sdk | Likely barrel re-exporting from local/index.ts — no imports found |
| `src/plugin/local/index.ts` | packages/plugin-sdk | Empty stub with TODO comment — no imports |
| `src/plugin/remote.ts` | packages/plugin-sdk | Likely barrel re-exporting from remote/index.ts — no imports found |
| `src/plugin/remote/index.ts` | packages/plugin-sdk | Empty stub with TODO comment — no imports |
| `src/components/animations/Replayable.vue` | packages/stage-ui | No imports from other files |
| `src/utils/relative-time.ts` | packages/stage-ui | `formatRelativeTime` — no imports found |
| `src/utils/stream.ts` | packages/stage-ui | `ControllableStream`/`createControllableStream` — no imports found |

## Unused Exports (58) — Classification

The 58 unused exports fall into three groups:

1. **Exports from dead files (Category D)** — Deleting the 16 dead files will eliminate their associated unused exports automatically.
2. **Unused barrel re-exports (Category C)** — Adding proper `entry` configurations will make Knip recognize these as public API, eliminating the false-positive unused export flags.
3. **Unused exports in otherwise-used files** — These are `export` keywords on functions/types that are only consumed internally within the same file. The `export` keyword can be removed without breaking anything. These require individual review (e.g., `fetchWeather` in weather.ts).

## Recommended Next Steps

1. **Add dynamic entry points** to [`knip.json`](knip.json) for Category A files
2. **Exclude test data** from knip project scan for Category B files
3. **Add package entry points** to [`knip.json`](knip.json) for Category C workspaces
4. **Delete genuine dead code** for Category D files
5. **Review and remove unused `export` keywords** in otherwise-used files for remaining unused exports
6. **Re-run Knip** and verify the report is clean