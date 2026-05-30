# Code Review Fixes — Tasks

- [ ] **F1:** Add `export` keyword to [`matchesDestinations`](../packages/server-runtime/src/middlewares/route/match-expression.ts:124) in `match-expression.ts` (change `function matchesDestinations` → `export function matchesDestinations`)
- [ ] **F1 validate:** Run `pnpm -F @proj-airi/server-runtime typecheck` to confirm import resolves
- [ ] **F1 validate:** Run `pnpm -F @proj-airi/server-runtime exec vitest run` to confirm route tests pass
- [ ] **F2:** Add `export` keyword to [`electronMcpStdioServerConfigSchema`](../apps/stage-tamagotchi/src/shared/mcp-config.ts:30) (change `const` → `export const`)
- [ ] **F2:** Add `export` keyword to [`parseElectronMcpConfig`](../apps/stage-tamagotchi/src/shared/mcp-config.ts:91) (change `function` → `export function`)
- [ ] **F2:** Add `export` keyword to [`parseElectronMcpConfigText`](../apps/stage-tamagotchi/src/shared/mcp-config.ts:113) (change `function` → `export function`)
- [ ] **F2 validate:** Run `pnpm -F @proj-airi/stage-tamagotchi typecheck` to confirm imports resolve
- [ ] **F2 validate:** Run `pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/modules/mcp-config.test.ts` to confirm mcp-config tests pass
- [ ] **F5:** Add `'@unocss/reset': ^66.6.8` to the `catalog` section in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml:66) (alphabetically before `unocss`)
- [ ] **F5:** Update [`packages/stage-ui/package.json`](../packages/stage-ui/package.json:160) — change `"@unocss/reset": "^66.6.8"` → `"@unocss/reset": "catalog:"`
- [ ] **F6:** Update [`packages/ui-transitions/package.json`](../packages/ui-transitions/package.json:35) — change `"@unocss/reset": "^66.6.8"` → `"@unocss/reset": "catalog:"`
- [ ] **F5+F6 validate:** Run `pnpm install` to confirm catalog resolution works
- [ ] **Final validate:** Run `pnpm lint` to confirm no lint regressions