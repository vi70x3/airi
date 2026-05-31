# AIRI Card System — Tasks

## Phase 1: Type System & Data Model

- [ ] **T1.1**: Add new config type interfaces to [`airi-card.ts`](packages/stage-ui/src/stores/modules/airi-card.ts)
  - `HeartbeatConfig` (enabled, intervalMinutes, prompt, injectIntoPrompt, useAsLocalGate, contextOptions, schedule, respectSchedule)
  - `DreamStateConfig` (enabled, strictAfkGating, journalingThreshold, maxSessionsPerDay, sessionTimeoutMinutes, afkThresholdMinutes, minConversationTurns, lastProcessedAt, dailyRunDate, dailyRunCount)
  - `ShortTermMemoryConfig` (enabled, maxEntries, retentionMinutes, importanceThreshold)
  - `ActingConfig` (modelExpressionPrompt, speechExpressionPrompt, speechMannerismPrompt, idleAnimations)
  - `AiriOutfit` (id, name, type, expressions, backgroundId, artistry, manifestation)
  - `CharacterGenerationConfig` (enabled, provider, model, known, advanced, compaction, importedPresetMeta)
- [ ] **T1.2**: Expand `AiriExtension` interface with all new fields from fork (acting, heartbeats, dreamState, shortTermMemory, generation, outfits, imageJournal, visual_assets, eternal_record, proactivity_metrics, active_concepts, active_state, groundingEnabled)
- [ ] **T1.3**: Expand `modules` within `AiriExtension` — add `consciousness.moduleConfigs`, `speech.pitch/rate/ssml/language`, `vrm` object, `live2d` object with activeExpressions/modelParameters, `active_expressions`, `selectedModelId` legacy key, make `activeBackgroundId` nullable
- [ ] **T1.4**: Move `artistry` from `modules.artistry` to top-level `AiriExtension.artistry` — add `autonomousMonitorEnabled`, `autonomousHistoryDepth`, `options`; preserve `LegacyArtistrySettings` type for reading old data
- [ ] **T1.5**: Verify [`Card`](packages/ccc/src/define/card.ts:113) type in `packages/ccc` is compatible with fork (no changes needed if identical)

## Phase 2: Store Logic

- [x] **T2.1**: Add `mapEntriesSerializer` for `useLocalStorageManualReset` — handles Map JSON round-tripping
- [x] **T2.2**: Switch `cards` persistence to use `mapEntriesSerializer` with `useLocalStorageManualReset`
- [x] **T2.3**: Make `addCard` async — import embedded background data via `backgroundStore.addBackground()` before storing; use `compactCard()` for storage
- [x] **T2.4**: Switch `removeCard` and `updateCard` to immutable Map pattern (`new Map(cards.value)` instead of direct mutation)
- [x] **T2.5**: Add `toggleGrounding(id)` function
- [x] **T2.6**: Add `setAutonomousArtistry(id, enabled)` function
- [x] **T2.7**: Add `isModelSyncPrevented` localStorage flag
- [x] **T2.8**: Implement `syncCardState(card, force)` — syncs card extension data to consciousness, speech, stage model, display model, Live2D, VRM, and background stores
- [x] **T2.9**: Update `activateCard(id)` to call `syncCardState()` after setting active card ID
- [x] **T2.10**: Expand `resolveAiriExtension()` to provide defaults for all new fields (~261 lines matching fork scope)
- [x] **T2.11**: Update `newAiriCard()` to handle all new fields with normalization
- [x] **T2.12**: Add `stripEmbeddedBackgroundData(extension)` — strips background data URLs before storage
- [x] **T2.13**: Add `compactCard(card)` — strips large embedded data for storage efficiency
- [x] **T2.14**: Add `compactAllCardsMap(source)` — runs on initialization to clean existing stored data
- [x] **T2.15**: Add `buildSystemPrompt(card)` — constructs system prompt from card data combining all relevant fields
- [x] **T2.16**: Add `seedDefaults(selectedId)` — async function for initial card seeding with background resolution
- [x] **T2.17**: Update `initialize()` to call `compactAllCardsMap()` and `seedDefaults()`
- [x] **T2.18**: Update store return object to expose all new functions and computed properties

## Phase 3: Import/Export Logic

- [ ] **T3.1**: Add `base64ToUtf8(input)` utility function to card index page
- [ ] **T3.2**: Add `utf8ToBase64(input)` utility function to card index page
- [ ] **T3.3**: Add `parsePngCharaPayload(buffer)` — extracts `chara` text chunk from PNG, base64-decodes, parses as `ccv3.CharacterCardV3` or `Card`
- [ ] **T3.4**: Add `parseImportedCard(content)` — parses JSON string as `Card` type
- [ ] **T3.5**: Add `parseStMessageExamples(exampleStr)` — converts ST message examples format to our greeting format
- [ ] **T3.6**: Add `getImportedCardName(card)` and `withImportedCardName(card, name)` — name extraction/mutation helpers
- [ ] **T3.7**: Add `getUniqueImportedCardName(baseName)` — ensures imported card names are unique
- [ ] **T3.8**: Add `addCardPreviewNormalize(card)` — normalizes imported card data with defaults
- [ ] **T3.9**: Add `exportCard(cardId)` — AIRI-native JSON export with full extension data and embedded backgrounds
- [ ] **T3.10**: Add `buildCharaCardV2(card)` — maps AIRI card to chara_card_v2 format with AIRI extensions under `data.extensions.airi`
- [ ] **T3.11**: Add `getCardWithExportedBackground(cardId)` — resolves background ID to data URL for export embedding
- [ ] **T3.12**: Add PNG chunk utilities: `createCrc32Table()`, `crc32()`, `concatUint8Arrays()`, `uint32ToBytes()`, `createPngTextChunk()`, `injectPngTextChunk()`
- [ ] **T3.13**: Add `loadImageElement(src)` — loads image for PNG composition
- [ ] **T3.14**: Add `composeCardExportPng(previewImage)` — composes framed PNG for export
- [ ] **T3.15**: Add `exportCardPng(cardId)` — full SillyTavern PNG export pipeline (load image → compose → build chara_card_v2 → inject chunk → download)
- [ ] **T3.16**: Add import wizard state to index page: `activeBrowserSource`, `isImportWizardOpen`, `importedCardData`
- [ ] **T3.17**: Add `isElectron` computed and `handleCharaCardDownloaded()` for Electron IPC card download handling
- [ ] **T3.18**: Add file input handling for JSON and PNG import (triggers parse → wizard flow)
- [ ] **T3.19**: Add search/sort state: `searchQuery`, `sortOption`, `filteredCards`, `sortedFilteredCards`
- [ ] **T3.20**: Add `CardItem` interface and `ImportedCardPayload` type to index page
- [ ] **T3.21**: Wire `@export-json` and `@export-png` events from CardListItem to `exportCard()` and `exportCardPng()`

## Phase 4: UI Components — CardImportWizard

- [ ] **T4.1**: Create [`CardImportWizard.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardImportWizard.vue) — multi-step wizard component
- [ ] **T4.2**: Implement Step 1: Name + display model selection
- [ ] **T4.3**: Implement Step 2: Consciousness provider/model selection
- [ ] **T4.4**: Implement Step 3: Speech provider/model/voice selection
- [ ] **T4.5**: Implement Step 4: Toggle defaults (artistry autonomous, dream state, proactivity)
- [ ] **T4.6**: Implement `finalizeImport()` — builds complete AiriCard from imported data + wizard selections, emits `@import`
- [ ] **T4.7**: Implement step navigation (next/prev) and validation per step
- [ ] **T4.8**: Add `hasUserPattern` computed for detecting user name patterns in imported data

## Phase 5: UI Components — CardCreationDialog Expansion

- [x] **T5.1**: Add Acting tab section to [`CardCreationDialog.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardCreationDialog.vue)
  - `selectedActingModelExpressionPrompt`, `selectedActingSpeechExpressionPrompt`, `selectedActingSpeechMannerismPrompt` refs
  - `selectedActingIdleAnimations` ref
  - `actingSpeechCapabilities` and `actingSpeechCapabilitiesLoading` refs
- [x] **T5.2**: Add Modules tab expansion — consciousness moduleConfigs, speech pitch/rate/ssml/language, VRM/Live2D model refs, background selection, display model
- [x] **T5.3**: Add Artistry tab at top-level — moved from modules, add autonomousMonitorEnabled, autonomousHistoryDepth, config JSON editor
- [x] **T5.4**: Add Proactivity tab — heartbeats config (all HeartbeatConfig fields), dreamState toggle, grounding toggle
- [x] **T5.5**: Add Generation tab — provider, model, known limits (maxTokens, temperature, topP, contextWidth), reasoningFallback, compaction strategy, advanced JSON
- [x] **T5.6**: Implement `loadActingSpeechCapabilities(providerId)` — fetches expression tags and mannerisms from speech provider
- [x] **T5.7**: Implement acting expression/mannerism insertion helpers: `insertModelExpression()`, `insertSpeechTag()`, `insertSpeechMannerism()`, `appendUniqueLine()`
- [x] **T5.8**: Add `actingModelExpressionOptions`, `actingIdleAnimationOptions`, `actingExpressionTags`, `actingGroupedExpressionTags`, `actingMannerismOptions` computed properties
- [x] **T5.9**: Update `saveCard()` to persist all new tab fields into the card's `extensions.airi`
- [x] **T5.10**: Update `initializeCard()` to load all new fields from existing card in edit mode
- [x] **T5.11**: Update tab definitions (`Tab` interface, `tabs` array, `activeTab` computed) to include all 6 tabs
- [x] **T5.12**: Add generation provider/model options computed properties and normalization helpers (`normalizeOptionalNumber`)

## Phase 6: UI Components — CardDetailDialog Expansion

- [x] **T6.1**: Expand [`CardDetailDialog.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardDetailDialog.vue) tabs to match CardCreationDialog tabs (Description, Acting, Modules, Artistry, Proactivity, Generation)
- [x] **T6.2**: Add read-only display of acting config, heartbeat config, dream state config, generation config in detail view
- [x] **T6.3**: Add `initialTab` prop support so index page can open detail dialog to a specific tab

## Phase 7: UI Components — CardListItem & Helper Modals

- [x] **T7.1**: Update [`CardListItem.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardListItem.vue) to emit `@export-json` and `@export-png` events
- [x] **T7.2**: Add hover preview image to CardListItem
- [x] **T7.3**: Create [`ConceptBuilderModal.vue`](packages/stage-pages/src/pages/settings/airi-card/components/ConceptBuilderModal.vue) — concept building/editing modal
- [x] **T7.4**: Create [`FieldAiGeneratorModal.vue`](packages/stage-pages/src/pages/settings/airi-card/components/FieldAiGeneratorModal.vue) — AI-assisted field generation modal
- [x] **T7.5**: Add sparkle generator integration in CardCreationDialog: `openSparkleGenerator()`, `handleGeneratorSave()`, `generatorCardContext`, `generatorActingContext`

## Phase 8: Card Index Page Template Updates

- [x] **T8.1**: Update [`index.vue`](packages/stage-pages/src/pages/settings/airi-card/index.vue) template to include CardImportWizard component
- [x] **T8.2**: Add import file input UI (drag-drop zone + file picker for JSON/PNG)
- [x] **T8.3**: Add export action buttons/context menu on card list items
- [x] **T8.4**: Add search bar and sort dropdown to card list header
- [x] **T8.5**: Add import compatibility info section (SillyTavern/chara_card_v2 explanation)
- [x] **T8.6**: Add card source browser drawer (placeholder for future external source browsing)

## Phase 9: i18n

- [x] **T9.1**: Add all new i18n keys to [`packages/i18n/src/locales/en/settings.yaml`](packages/i18n/src/locales/en/settings.yaml) under `pages.card` and `pages.modules` namespaces
- [x] **T9.2**: Add fallback English keys to all other locale files (zh-Hans, zh-Hant, ja, ko, ru, es, fr, vi)

## Phase 10: Electron IPC Integration

- [ ] **T10.1**: Register `handleCharaCardDownloaded` IPC handler in [`apps/stage-tamagotchi`](apps/stage-tamagotchi) Electron main process
- [ ] **T10.2**: Add Eventa contract for card download events in [`apps/stage-tamagotchi/src/shared`](apps/stage-tamagotchi/src/shared)

## Phase 11: Testing & Validation

- [x] **T11.1**: Add unit tests for `parsePngCharaPayload()` — test with valid/invalid PNG data
- [x] **T11.2**: Add unit tests for `buildCharaCardV2()` — verify AIRI extensions are correctly nested
- [x] **T11.3**: Add unit tests for `compactCard()` and `stripEmbeddedBackgroundData()` — verify data stripping
- [x] **T11.4**: Add unit tests for `resolveAiriExtension()` — verify defaults for all new fields
- [x] **T11.5**: Add unit tests for PNG chunk utilities (CRC32, text chunk creation/injection)
- [x] **T11.6**: Add unit tests for `mapEntriesSerializer` — verify Map JSON round-tripping
- [x] **T11.7**: Add unit tests for `buildSystemPrompt()` — verify prompt assembly from card fields
- [x] **T11.8**: Run `pnpm typecheck` across affected packages (`@proj-airi/stage-ui`, `@proj-airi/stage-pages`, `@proj-airi/stage-tamagotchi`, `@proj-airi/stage-web`)
- [x] **T11.9**: Run `pnpm format:check` and fix any formatting issues
- [x] **T11.10**: Manual smoke test: create card with all tabs, export as JSON, re-import, export as PNG, verify SillyTavern compatibility
