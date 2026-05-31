# AIRI Card System — Requirements Document

## Feature Description

Port the expanded AIRI card system from the [dasilva333/airi fork](https://github.com/dasilva333/airi) into our upstream codebase. The fork treats AIRI cards as a real character-management system with multi-tab configuration, import/export for AIRI-native JSON and SillyTavern chara_card_v2 PNG, and per-card driving of model/stage/presentation state. Our current implementation is a thin metadata form with minimal extension fields.

## Functional Requirements

### FR-1: Expanded AiriExtension Type System

**Priority**: P0 — Must have

The [`AiriExtension`](packages/stage-ui/src/stores/modules/airi-card.ts:19) interface must be expanded to include all new configuration domains from the fork:

- **Acting** (`ActingConfig`): Three-layer prompt system for model expressions, speech expression tags, and speech mannerisms. Includes idle animation selection.
- **Heartbeats** (`HeartbeatConfig`): Proactivity heartbeat system with interval, prompt, context injection options (window history, system load, usage metrics), schedule windows, and local gating.
- **Dream State** (`DreamStateConfig`): AFK processing with strict gating, journaling thresholds, session limits, and timeout configuration.
- **Short-Term Memory** (`ShortTermMemoryConfig`): Memory configuration.
- **Generation** (`CharacterGenerationConfig`): Per-card generation settings with provider, model, known limits (maxTokens, temperature, topP, contextWidth), reasoning fallback, compaction strategy, and advanced JSON config.
- **Outfits** (`AiriOutfit[]`): Visual state outfits with expressions, background, artistry, and manifestation per outfit.
- **Image Journal** (`{selfie: boolean}`): Toggle for selfie image journal entries.
- **Visual Assets** (`Record<string, VisualAsset>`): Named visual assets with description, prompt, artistry, and manifestation.
- **Eternal Record** (`{relational_milestones, lore_bits}`): Persistent character memory milestones and lore.
- **Proactivity Metrics** (`{ttsCount, sttCount, chatCount, totalTurns}`): Runtime proactivity statistics.
- **Active Concepts** (`string[]`): Active concept tracking.
- **Active State** (`{displayModelId, activeBackgroundId, active_expressions}`): Runtime visual state snapshot.
- **Grounding** (`groundingEnabled: boolean`): Toggle for grounding behavior.

**Acceptance Criteria**:

- All new config types are defined in [`airi-card.ts`](packages/stage-ui/src/stores/modules/airi-card.ts)
- `AiriExtension` includes all fields listed above
- Existing fields in `AiriExtension` are preserved (no breaking changes to current functionality)
- `resolveAiriExtension()` provides sensible defaults for every new field

### FR-2: Artistry Migration from modules to Top-Level

**Priority**: P0 — Must have

The `artistry` config must move from `modules.artistry` to a top-level `AiriExtension.artistry` field, matching the fork's architecture. New artistry fields:

- `autonomousMonitorEnabled`: Monitor context for autonomous triggers
- `autonomousHistoryDepth`: How many history turns to consider
- `options`: Provider-specific JSON config

The upstream `modules.artistry.workflowId` field must be handled as legacy — read from old data but not written to new cards.

**Acceptance Criteria**:

- `AiriExtension.artistry` exists as a top-level field with all fork fields
- `resolveAiriExtension()` migrates `modules.artistry.workflowId` → top-level if present in old data
- `LegacyArtistrySettings` type is preserved for reading old data
- New cards are created with top-level artistry only

### FR-3: Modules Expansion

**Priority**: P0 — Must have

The `modules` field within `AiriExtension` must be expanded:

- `consciousness.moduleConfigs`: Per-model config overrides (`Record<string, any>`)
- `speech.pitch`, `speech.rate`, `speech.ssml`, `speech.language`: Speech tuning parameters
- `vrm`: `{source?, file?, url?}` — VRM model reference
- `live2d`: `{source?, file?, url?, activeExpressions?, modelParameters?}` — Live2D model reference with expression/parameter maps
- `active_expressions`: Unified expression map (`Record<string, number>`)
- `selectedModelId`: Legacy migration key (read-only)
- `activeBackgroundId` becomes `string | null` (nullable)

**Acceptance Criteria**:

- All new module fields are present in the type definition
- `resolveAiriExtension()` provides defaults for new module fields
- Existing module fields remain unchanged

### FR-4: Multi-Tab Card Creation Dialog

**Priority**: P0 — Must have

[`CardCreationDialog.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardCreationDialog.vue) must be expanded from a simple form to a multi-tab editor with these tabs:

1. **Description** — name, description, personality, systemPrompt, postHistoryInstructions, scenario, greetings, messageExamples (existing fields, no change)
2. **Acting** — modelExpressionPrompt, speechExpressionPrompt, speechMannerismPrompt, idleAnimations, speech capabilities loading (NEW)
3. **Modules** — consciousness provider/model, speech provider/model/voice, display model, background, VRM/Live2D model refs (expanded)
4. **Artistry** — provider, model, promptPrefix, widgetInstruction, spawnMode, autonomous settings, config JSON (expanded, moved from modules)
5. **Proactivity** — heartbeats config, dreamState, grounding (NEW)
6. **Generation** — provider, model, known limits, reasoning fallback, compaction, advanced JSON (NEW)

**Acceptance Criteria**:

- All 6 tabs are present and navigable
- Each tab has its own section with appropriate form fields
- Tab state persists across dialog open/close cycles
- Edit mode loads existing card data into all tabs correctly
- Create mode initializes all fields with defaults

### FR-5: Acting Tab — Speech Capabilities Integration

**Priority**: P1 — Should have

The Acting tab must integrate with the speech provider system to load expression tags and mannerisms dynamically:

- When a speech provider is selected (in Modules tab), the Acting tab loads available expression tags and mannerisms from that provider
- Expression tags are grouped by category for easy selection
- Clicking an expression tag inserts it into the appropriate prompt field
- Mannerism selection inserts mannerism markers into the speechMannerismPrompt field
- Model expression options come from the active VRM/Live2D model's expression list

**Acceptance Criteria**:

- `loadActingSpeechCapabilities()` fetches tags from the selected speech provider
- Expression tags are displayed in grouped categories
- Click-to-insert works for expressions, speech tags, and mannerisms
- Idle animation selection shows available animations from the active model

### FR-6: Card Import Wizard

**Priority**: P0 — Must have

A new [`CardImportWizard.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardImportWizard.vue) component must be created as a multi-step wizard:

1. **Step 1**: Name + display model selection
2. **Step 2**: Consciousness provider/model selection
3. **Step 3**: Speech provider/model/voice selection
4. **Step 4**: Toggle defaults — artistry autonomous, dream state, proactivity
5. **Finalize**: Build card from imported data + wizard selections, emit `@import`

The wizard is opened from the card index page when a user imports a card (JSON or PNG).

**Acceptance Criteria**:

- Wizard opens when user imports a card file
- Each step shows appropriate options from current provider/model stores
- Step navigation (next/prev) works correctly
- Finalize step builds a complete `AiriCard` from imported data + wizard selections
- Imported card name uniqueness is enforced
- Wizard can be cancelled at any step

### FR-7: AIRI JSON Export

**Priority**: P0 — Must have

Per-card AIRI-native JSON export must be implemented:

- `exportCard(cardId)` produces a downloadable JSON file
- The JSON preserves all `Card` base fields and full `AiriExtension` including thumbnails, preferred backgrounds, acting metadata, and custom extensions
- Embedded background data URLs are included for portability
- The export format is self-contained and re-importable

**Acceptance Criteria**:

- Export produces a valid JSON file that can be re-imported
- All AIRI-specific extension data is preserved in the export
- Background data is embedded as data URLs in the export
- File download triggers automatically on export

### FR-8: SillyTavern PNG Export

**Priority**: P0 — Must have

Per-card SillyTavern chara_card_v2-compatible PNG export must be implemented:

- `exportCardPng(cardId)` produces a downloadable PNG file
- The PNG contains the card's preview image as the visual layer
- Card data is encoded as chara_card_v2 JSON, base64-encoded, and injected as a `tEXt` PNG chunk with keyword `chara`
- AIRI-specific data is preserved under `data.extensions.airi` in the chara_card_v2 structure
- The PNG is framed/composed for visual presentation (not just raw image dump)

**Acceptance Criteria**:

- Export produces a valid PNG that SillyTavern can import
- `tEXt` chunk with keyword `chara` contains valid base64-encoded chara_card_v2 JSON
- AIRI extensions are nested under `data.extensions.airi`
- CRC32 checksums are correctly computed for PNG chunk integrity
- The composed PNG includes a visual frame around the card image
- Download triggers automatically on export

### FR-9: PNG Import (chara_card_v2)

**Priority**: P0 — Must have

Importing SillyTavern chara_card_v2 PNG files must be supported:

- `parsePngCharaPayload(buffer)` extracts the `chara` text chunk from a PNG
- The extracted data is base64-decoded and parsed as either `ccv3.CharacterCardV3` or our `Card` type
- AIRI-specific extensions under `data.extensions.airi` are preserved
- Standard chara_card_v2 fields (name, description, personality, scenario, greetings, message_examples) are mapped to our `Card` fields
- ST message examples format is parsed and normalized

**Acceptance Criteria**:

- PNG files with `chara` text chunks are correctly parsed
- Both v2 and v3 character card formats are handled
- AIRI extensions are preserved when present
- Missing AIRI extensions get sensible defaults via `resolveAiriExtension()`
- ST message examples are converted to our greeting format

### FR-10: AIRI JSON Import

**Priority**: P0 — Must have

Importing AIRI-native JSON card files must be supported:

- `parseImportedCard(content)` parses JSON as our `Card` type
- Imported card names are made unique via `getUniqueImportedCardName()`
- Card data is normalized via `addCardPreviewNormalize()`
- The import flow opens the CardImportWizard for provider/model configuration

**Acceptance Criteria**:

- JSON files exported by AIRI are correctly parsed
- Duplicate names are handled with unique suffixes
- Normalization fills in missing fields with defaults
- Import wizard opens after file parsing for provider/model selection

### FR-11: Card Activation Drives Presentation

**Priority**: P1 — Should have

When a card is activated, it must drive the whole stage presentation, not just the text persona:

- `syncCardState(card)` syncs card extension data to consciousness, speech, stage model, display model, Live2D, VRM, and background stores
- `activateCard(id)` calls `syncCardState()` after setting the active card ID
- `isModelSyncPrevented` flag allows users to opt out of automatic model switching
- Switching characters switches: chat model, speech provider/model/voice, VRM/Live2D avatar, preferred background, display model

**Acceptance Criteria**:

- Activating a card updates all connected stores
- `isModelSyncPrevented` flag prevents automatic model sync when set
- Background is set to the card's preferred background
- Display model switches to the card's configured model
- Consciousness provider/model switches to card's configuration

### FR-12: Card Hover Preview

**Priority**: P2 — Nice to have

Hovering a card in the list surfaces its picture:

- [`CardListItem.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardListItem.vue) shows a preview image on hover
- The preview uses the card's configured display model or thumbnail
- Hover preview is visually framed and non-intrusive

**Acceptance Criteria**:

- Hovering over a card item shows a preview image
- Preview disappears when hover ends
- Preview does not obstruct card list navigation

### FR-13: Per-Card Export Actions on CardListItem

**Priority**: P0 — Must have

[`CardListItem.vue`](packages/stage-pages/src/pages/settings/airi-card/components/CardListItem.vue) must emit export events:

- `@export-json` event triggers AIRI JSON export
- `@export-png` event triggers SillyTavern PNG export
- Export actions are accessible from the card list item context menu or action buttons

**Acceptance Criteria**:

- CardListItem emits `@export-json` and `@export-png` events
- Index page handles these events by calling `exportCard()` and `exportCardPng()`
- Export actions are clearly labeled and accessible

### FR-14: Store Persistence Improvements

**Priority**: P0 — Must have

The card store must use improved persistence patterns:

- Immutable Map updates (`new Map(cards.value)` pattern) instead of direct mutation
- Custom `mapEntriesSerializer` for `useLocalStorageManualReset` to handle Map JSON round-tripping
- `compactCard()` strips large embedded data before persistence
- `compactAllCardsMap()` runs on initialization to clean up existing stored data
- `stripEmbeddedBackgroundData()` removes background data URLs before storage

**Acceptance Criteria**:

- Card mutations use immutable Map pattern
- localStorage correctly serializes/deserializes Map entries
- Large embedded data is stripped before persistence
- Initialization compacts existing stored cards

### FR-15: Background Embedding in Exports

**Priority**: P1 — Should have

Card exports must embed background data for portability:

- `getCardWithExportedBackground(cardId)` resolves the card's `activeBackgroundId` to an actual data URL
- The data URL is embedded in the export under `modules.preferredBackgroundDataUrl`
- On import, `addCard()` extracts the embedded background and imports it into the background store
- The imported background ID replaces the data URL reference

**Acceptance Criteria**:

- Export includes background data URL when a background is configured
- Import extracts and saves the background to the background store
- After import, the card references the new background store ID instead of the data URL
- Background import failures are logged but do not block card import

### FR-16: Grounding Toggle

**Priority**: P1 — Should have

Per-card grounding toggle must be supported:

- `toggleGrounding(id)` toggles the `groundingEnabled` flag on a card
- The grounding state is persisted in the card's `extensions.airi.groundingEnabled`
- Grounding state is visible in the card detail/creation dialog

**Acceptance Criteria**:

- Grounding can be toggled per card
- State is persisted across sessions
- Toggle is accessible from the Proactivity tab

### FR-17: Autonomous Artistry Toggle

**Priority**: P1 — Should have

Per-card autonomous artistry toggle must be supported:

- `setAutonomousArtistry(id, enabled)` sets the `artistry.autonomousEnabled` flag
- The autonomous artistry state is persisted in the card's top-level `artistry` extension
- Autonomous artistry settings are visible in the Artistry tab

**Acceptance Criteria**:

- Autonomous artistry can be toggled per card
- State is persisted across sessions
- Toggle is accessible from the Artistry tab

### FR-18: Build System Prompt from Card

**Priority**: P1 — Should have

A `buildSystemPrompt()` function must construct the system prompt from card data:

- Combines: systemPrompt, description, personality, postHistoryInstructions, acting prompts, artistry widget instruction
- Each component is included only if non-empty
- Components are assembled in a defined order
- The result is used by the consciousness store when the card is active

**Acceptance Criteria**:

- System prompt is built from all relevant card fields
- Empty fields are skipped
- Prompt order is consistent and documented
- The consciousness store uses the built prompt when card is active

### FR-19: i18n Keys for All New UI

**Priority**: P0 — Must have

All new UI text must be internationalized through [`packages/i18n`](packages/i18n):

- Tab names: Acting, Modules, Artistry, Proactivity, Generation
- Acting field labels: model expression prompt, speech expression prompt, speech mannerism prompt, idle animations
- Heartbeat field labels: interval, prompt, context options, schedule, gating
- Dream state field labels: AFK gating, journaling threshold, session limits
- Generation field labels: provider, model, known limits, compaction, advanced
- Import wizard step labels and descriptions
- Export labels: JSON export, PNG export, compatibility notes
- Card not found message

**Acceptance Criteria**:

- All new UI strings have i18n keys
- English locale is complete
- Other locales have at least English fallbacks
- No hardcoded English strings in components

### FR-20: ConceptBuilderModal Component

**Priority**: P2 — Nice to have

A [`ConceptBuilderModal.vue`](packages/stage-pages/src/pages/settings/airi-card/components/ConceptBuilderModal.vue) component for building and editing card concepts:

- Allows users to define and organize character concepts
- Concepts feed into the `active_concepts` field on the card
- Modal is accessible from the card creation/detail dialog

**Acceptance Criteria**:

- Modal opens from card editor
- Concepts can be added, edited, and removed
- Concepts are persisted on the card

### FR-21: FieldAiGeneratorModal Component

**Priority**: P2 — Nice to have

A [`FieldAiGeneratorModal.vue`](packages/stage-pages/src/pages/settings/airi-card/components/FieldAiGeneratorModal.vue) component for AI-assisted field generation:

- Opens from any text field in the card editor
- Uses current card context to generate field content
- Supports acting context (expression tags, mannerisms) for acting field generation
- Generated content replaces or appends to the target field

**Acceptance Criteria**:

- Modal opens with field context
- AI generation uses card + acting context
- Result can replace or append to the field
- Generation failures show user-friendly errors

### FR-22: Electron IPC for Card Downloads

**Priority**: P1 — Should have

In the Electron app, card downloads from external sources must be handled:

- `handleCharaCardDownloaded()` processes downloaded card files (PNG/JSON)
- The handler receives `{base64Data, filename, ext}` from the Electron main process
- Downloaded cards are parsed and added via the standard import flow
- The import wizard opens for provider/model configuration

**Acceptance Criteria**:

- Electron IPC handler receives card download events
- Downloaded data is correctly parsed (PNG or JSON)
- Import wizard opens after download parsing
- Handler is registered in the Electron app's IPC setup

## Non-Requirements

The following are explicitly NOT part of this port:

- **ComfyUI integration**: The fork mentions ComfyUI as a future path; we are not implementing ComfyUI support now
- **Card browser/source drawer**: The fork has a `activeBrowserSource` state for browsing external card sources; this is not included
- **`proactivity_metrics` runtime tracking**: The type is defined but runtime metric collection is a separate feature
- **`eternal_record` runtime processing**: The type is defined but the journaling/lore system is a separate feature
- **`visual_assets` generation pipeline**: The type is defined but asset generation is a separate feature
