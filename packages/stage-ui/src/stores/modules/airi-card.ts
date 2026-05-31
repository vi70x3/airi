import type { Card, ccv3 } from '@proj-airi/ccc'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { useModelStore } from '@proj-airi/stage-ui-three'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { DEFAULT_ARTISTRY_WIDGET_SPAWNING_PROMPT } from '../../constants/prompts/character-defaults'
import { useBackgroundStore } from '../background'
import { DisplayModelFormat, useDisplayModelsStore } from '../display-models'
import { useSettingsStageModel } from '../settings/stage-model'
import { useConsciousnessStore } from './consciousness'
import { useSpeechStore } from './speech'

export interface HeartbeatConfig {
  enabled: boolean
  intervalMinutes: number
  prompt: string
  injectIntoPrompt: boolean
  useAsLocalGate: boolean
  contextOptions?: {
    windowHistory: boolean
    systemLoad: boolean
    usageMetrics: boolean
  }
  schedule: {
    start: string // e.g., '09:00'
    end: string // e.g., '23:00'
  }
  respectSchedule: boolean
}

export interface DreamStateConfig {
  enabled: boolean
  strictAfkGating: boolean
  journalingThreshold: 'minimal' | 'balanced' | 'lush'
  maxSessionsPerDay: number
  sessionTimeoutMinutes: number
  afkThresholdMinutes: number
  minConversationTurns: number
  lastProcessedAt?: number
  dailyRunDate?: string
  dailyRunCount?: number
}

export interface ShortTermMemoryConfig {
  windowSize: number
  tokenBudgetPerDay: number
}

export interface ActingConfig {
  modelExpressionPrompt: string
  speechExpressionPrompt: string
  speechMannerismPrompt: string
  idleAnimations?: string[]
}

export interface AiriOutfit {
  id: string
  name: string
  icon: string
  type: 'base' | 'overlay'
  expressions: Record<string, number>
}

export interface CharacterGenerationConfig {
  enabled: boolean
  provider?: string
  model?: string
  known?: {
    maxTokens?: number
    temperature?: number
    topP?: number
    contextWidth?: number
    reasoningFallback?: boolean
  }
  advanced?: Record<string, any>
  compaction?: {
    strategy?: string
    minKeepTurns?: number
  }
  importedPresetMeta?: {
    source?: 'sillytavern' | 'manual' | 'unknown'
    originalKeys?: string[]
    importedAt?: string
  }
}

export interface AiriExtension {
  modules: {
    consciousness: {
      provider: string // Example: "openai"
      model: string // Example: "gpt-4o"
      moduleConfigs?: Record<string, any>
    }

    speech: {
      provider: string // Example: "elevenlabs"
      model: string // Example: "eleven_multilingual_v2"
      voice_id: string // Example: "alloy"

      pitch?: number
      rate?: number
      ssml?: boolean
      language?: string
    }

    vrm?: {
      source?: 'file' | 'url'
      file?: string // Example: "vrm/model.vrm"
      url?: string // Example: "https://example.com/vrm/model.vrm"
    }

    live2d?: {
      source?: 'file' | 'url'
      file?: string // Example: "live2d/model.json"
      url?: string // Example: "https://example.com/live2d/model.json"
      activeExpressions?: Record<string, number>
      modelParameters?: Record<string, number>
      motionMappings?: Record<string, string>
      hiddenMotions?: string[]
    }

    // ID from display-models store (e.g. 'preset-live2d-1', 'display-model-<nanoid>')
    displayModelId?: string
    // ID from unified background store
    activeBackgroundId?: string | null
    // Legacy key from older local card revisions. Read-only for migration.
    selectedModelId?: string
    // Unified manifestation expressions for VRM/Live2D
    active_expressions?: Record<string, number>
    // Embedded background data URL (stripped before storage)
    preferredBackgroundDataUrl?: string
    // Embedded background name for import
    preferredBackgroundName?: string
  }

  imageJournal?: {
    selfie: boolean
  }

  artistry?: {
    provider?: string
    model?: string
    promptPrefix?: string
    widgetInstruction?: string
    spawnMode?: 'bg' | 'widget' | 'inline' | 'bg_widget'
    options?: Record<string, any>
    autonomousEnabled?: boolean
    autonomousThreshold?: number
    autonomousTarget?: 'user' | 'assistant'
    autonomousMonitorEnabled?: boolean
    autonomousHistoryDepth?: number
  }

  generation?: CharacterGenerationConfig

  acting?: ActingConfig

  outfits?: AiriOutfit[]

  agents: {
    [key: string]: {
      // example: minecraft
      prompt: string
      enabled?: boolean
    }
  }

  heartbeats?: HeartbeatConfig
  dreamState?: DreamStateConfig
  shortTermMemory?: ShortTermMemoryConfig
  groundingEnabled?: boolean
  visual_assets?: Record<
    string,
    {
      description: string
      prompt?: string
      isBase?: boolean
      artistry?: {
        provider?: string
        model?: string
        options?: Record<string, any>
      }
      manifestation?: {
        modelId?: string
        mood?: string
        backgroundId?: string
        active_expressions?: Record<string, number>
      }
    }
  >
  eternal_record?: {
    relational_milestones?: string[]
    lore_bits?: string[]
  }
  proactivity_metrics?: {
    ttsCount: number
    sttCount: number
    chatCount: number
    totalTurns: number
  }
  active_concepts?: string[]
  active_state?: {
    displayModelId?: string
    activeBackgroundId?: string | null
    active_expressions?: Record<string, number>
  }
}

export interface AiriCard extends Card {
  extensions: {
    airi: AiriExtension
  } & Card['extensions']
}

/**
 * Serializer for Map<string, AiriCard> to/from localStorage.
 * Converts the Map to/from a JSON-serializable array of entries.
 */
export const mapEntriesSerializer = {
  read: (value: string): Map<string, AiriCard> => {
    try {
      const entries = JSON.parse(value) as [string, AiriCard][]
      return new Map(entries)
    } catch {
      return new Map()
    }
  },
  write: (v: Map<string, AiriCard>) => JSON.stringify(Array.from(v.entries())),
}

/**
 * Strips embedded background data URL from the extension before storage.
 * Embedded backgrounds are imported via addBackground and referenced by ID.
 */
export function stripEmbeddedBackgroundData(extension: AiriExtension): AiriExtension {
  const modulesCopy: any = { ...extension.modules }
  delete modulesCopy.preferredBackgroundDataUrl
  delete modulesCopy.preferredBackgroundName

  return {
    ...extension,
    modules: modulesCopy,
  }
}

/**
 * Resolves the AiriExtension for a card, providing defaults for all fields.
 *
 * Handles migration of legacy fields:
 * - modules.artistry -> top-level artistry
 * - selectedModelId -> displayModelId
 * - preferredBackgroundId -> activeBackgroundId
 *
 * @param card - The card to resolve extension for
 * @param options - Optional store values used for defaults
 */
export function resolveAiriExtension(
  card: Card | ccv3.CharacterCardV3,
  options: {
    stageModelSelected?: string
    activeConsciousnessProvider?: string
    activeConsciousnessModel?: string
  } = {},
): AiriExtension {
  const {
    stageModelSelected = 'default',
    activeConsciousnessProvider: provider = '',
    activeConsciousnessModel: model = '',
  } = options

  const existingExtension = ('data' in card ? card.data?.extensions?.airi : card.extensions?.airi) as AiriExtension

  const defaultModules = {
    consciousness: {
      provider: '',
      model: '',
    },
    speech: {
      provider: '',
      model: '',
      voice_id: '',
    },
    displayModelId: stageModelSelected,
    activeBackgroundId: 'none',
  }

  const defaultHeartbeats: HeartbeatConfig = {
    enabled: false,
    intervalMinutes: 5,
    prompt: '',
    injectIntoPrompt: true,
    useAsLocalGate: true,
    contextOptions: {
      windowHistory: true,
      systemLoad: true,
      usageMetrics: true,
    },
    schedule: {
      start: '09:00',
      end: '22:00',
    },
    respectSchedule: true,
  }

  const defaultDreamState: DreamStateConfig = {
    enabled: false,
    strictAfkGating: true,
    journalingThreshold: 'balanced',
    maxSessionsPerDay: 4,
    sessionTimeoutMinutes: 60,
    afkThresholdMinutes: 5,
    minConversationTurns: 4,
    lastProcessedAt: undefined,
    dailyRunDate: undefined,
    dailyRunCount: 0,
  }

  const defaultShortTermMemory: ShortTermMemoryConfig = {
    windowSize: 3,
    tokenBudgetPerDay: 1000,
  }

  const defaultArtistry: AiriExtension['artistry'] = {
    widgetInstruction: DEFAULT_ARTISTRY_WIDGET_SPAWNING_PROMPT,
    spawnMode: 'bg_widget',
    autonomousEnabled: false,
    autonomousMonitorEnabled: true,
    autonomousHistoryDepth: 3,
  }

  const defaultGeneration: CharacterGenerationConfig = {
    enabled: false,
    provider,
    model,
    known: {
      contextWidth: undefined,
      reasoningFallback: true,
    },
    advanced: undefined,
    compaction: {
      strategy: 'none',
      minKeepTurns: 15,
    },
    importedPresetMeta: undefined,
  }

  const defaultActing: ActingConfig = {
    modelExpressionPrompt: '',
    speechExpressionPrompt: '',
    speechMannerismPrompt: '',
    idleAnimations: [],
  }

  // Return default if no extension exists
  if (!existingExtension) {
    return {
      modules: defaultModules,
      acting: defaultActing,
      agents: {},
      heartbeats: defaultHeartbeats,
      dreamState: defaultDreamState,
      shortTermMemory: defaultShortTermMemory,
      artistry: defaultArtistry,
      generation: defaultGeneration,
      groundingEnabled: false,
      visual_assets: {},
      active_concepts: [],
      eternal_record: { relational_milestones: [], lore_bits: [] },
      imageJournal: { selfie: false },
      proactivity_metrics: {
        ttsCount: 0,
        sttCount: 0,
        chatCount: 0,
        totalTurns: 0,
      },
    }
  }

  // Merge existing extension with defaults
  const resolvedDisplayModelId =
    existingExtension.modules?.displayModelId ??
    existingExtension.modules?.selectedModelId ??
    defaultModules.displayModelId

  // Resolve legacy preferredBackgroundId to new activeBackgroundId
  const existingModulesAny = existingExtension.modules as Record<string, any> | undefined
  const resolvedActiveBackgroundId =
    existingModulesAny?.activeBackgroundId ??
    existingModulesAny?.preferredBackgroundId ??
    defaultModules.activeBackgroundId

  return {
    ...existingExtension,
    modules: {
      ...existingExtension?.modules,
      consciousness: {
        ...existingExtension?.modules?.consciousness,
        provider: existingExtension?.modules?.consciousness?.provider || defaultModules.consciousness.provider,
        model: existingExtension?.modules?.consciousness?.model || defaultModules.consciousness.model,
      },
      speech: {
        ...existingExtension?.modules?.speech,
        provider: existingExtension?.modules?.speech?.provider || defaultModules.speech.provider,
        model: existingExtension?.modules?.speech?.model || defaultModules.speech.model,
        voice_id: existingExtension?.modules?.speech?.voice_id || defaultModules.speech.voice_id,
        pitch: existingExtension?.modules?.speech?.pitch,
        rate: existingExtension?.modules?.speech?.rate,
        ssml: existingExtension?.modules?.speech?.ssml,
        language: existingExtension?.modules?.speech?.language,
      },
      vrm: existingExtension?.modules?.vrm,
      live2d: existingExtension?.modules?.live2d,
      displayModelId: resolvedDisplayModelId,
      activeBackgroundId: resolvedActiveBackgroundId,
    },
    active_state: (() => {
      const activeConcepts = (existingExtension as any)?.active_concepts || []
      const visualAssets = (existingExtension as any)?.visual_assets || {}
      const autonomousEnabled = existingExtension?.artistry?.autonomousEnabled ?? false

      let foldedModelId = resolvedDisplayModelId
      let foldedBackgroundId = resolvedActiveBackgroundId
      const foldedExpressions: Record<string, number> = {}

      // Iterate bottom-to-top: last override wins
      for (const conceptId of activeConcepts) {
        const concept = visualAssets[conceptId]
        if (!concept) continue

        if (concept.manifestation?.modelId && concept.manifestation.modelId !== 'inherit') {
          foldedModelId = concept.manifestation.modelId
        }

        if (
          !autonomousEnabled &&
          concept.manifestation?.backgroundId &&
          concept.manifestation.backgroundId !== 'inherit'
        ) {
          foldedBackgroundId = concept.manifestation.backgroundId
        }

        if ((concept as any).manifestation?.active_expressions) {
          Object.assign(foldedExpressions, (concept as any).manifestation.active_expressions)
        }
      }

      return {
        displayModelId: foldedModelId,
        activeBackgroundId: foldedBackgroundId,
        active_expressions: foldedExpressions,
      }
    })(),
    artistry: {
      ...existingExtension?.artistry,
      // FIX 2.4: Migrate legacy artistry from modules.artistry to top-level
      ...(!existingExtension?.artistry && (existingExtension?.modules as any)?.artistry
        ? (existingExtension.modules as any).artistry
        : {}),
      widgetInstruction: existingExtension?.artistry?.widgetInstruction ?? defaultArtistry.widgetInstruction,
      spawnMode: existingExtension?.artistry?.spawnMode ?? 'bg_widget',
      autonomousEnabled: existingExtension?.artistry?.autonomousEnabled ?? false,
      autonomousThreshold: existingExtension?.artistry?.autonomousThreshold ?? 70,
      autonomousTarget: existingExtension?.artistry?.autonomousTarget ?? 'user',
      autonomousMonitorEnabled: existingExtension?.artistry?.autonomousMonitorEnabled ?? true,
      autonomousHistoryDepth: existingExtension?.artistry?.autonomousHistoryDepth ?? 3,
    },
    generation: {
      ...existingExtension?.generation,
      enabled: existingExtension?.generation?.enabled ?? defaultGeneration.enabled,
      provider: existingExtension?.generation?.provider ?? defaultGeneration.provider,
      model: existingExtension?.generation?.model ?? defaultGeneration.model,
      known: {
        ...existingExtension?.generation?.known,
        maxTokens: existingExtension?.generation?.known?.maxTokens,
        temperature: existingExtension?.generation?.known?.temperature,
        topP: existingExtension?.generation?.known?.topP,
        contextWidth: existingExtension?.generation?.known?.contextWidth ?? defaultGeneration.known?.contextWidth,
        reasoningFallback:
          existingExtension?.generation?.known?.reasoningFallback ?? defaultGeneration.known?.reasoningFallback,
      },
      advanced: existingExtension?.generation?.advanced,
      compaction: {
        strategy: existingExtension?.generation?.compaction?.strategy ?? 'none',
        minKeepTurns: existingExtension?.generation?.compaction?.minKeepTurns ?? 15,
      },
      importedPresetMeta: existingExtension?.generation?.importedPresetMeta,
    },
    acting: {
      ...existingExtension?.acting,
      modelExpressionPrompt: existingExtension?.acting?.modelExpressionPrompt ?? defaultActing.modelExpressionPrompt,
      speechExpressionPrompt: existingExtension?.acting?.speechExpressionPrompt ?? defaultActing.speechExpressionPrompt,
      speechMannerismPrompt: existingExtension?.acting?.speechMannerismPrompt ?? defaultActing.speechMannerismPrompt,
      idleAnimations: existingExtension?.acting?.idleAnimations ?? defaultActing.idleAnimations,
    },
    outfits: existingExtension?.outfits ?? [],
    agents: existingExtension?.agents ?? {},
    heartbeats: {
      ...existingExtension?.heartbeats,
      enabled: existingExtension?.heartbeats?.enabled ?? defaultHeartbeats.enabled,
      intervalMinutes: existingExtension?.heartbeats?.intervalMinutes ?? defaultHeartbeats.intervalMinutes,
      prompt: existingExtension?.heartbeats?.prompt ?? defaultHeartbeats.prompt,
      injectIntoPrompt: existingExtension?.heartbeats?.injectIntoPrompt ?? defaultHeartbeats.injectIntoPrompt,
      useAsLocalGate: existingExtension?.heartbeats?.useAsLocalGate ?? defaultHeartbeats.useAsLocalGate,
      contextOptions: {
        ...existingExtension?.heartbeats?.contextOptions,
        windowHistory:
          existingExtension?.heartbeats?.contextOptions?.windowHistory ??
          defaultHeartbeats.contextOptions!.windowHistory,
        systemLoad:
          existingExtension?.heartbeats?.contextOptions?.systemLoad ?? defaultHeartbeats.contextOptions!.systemLoad,
        usageMetrics:
          existingExtension?.heartbeats?.contextOptions?.usageMetrics ?? defaultHeartbeats.contextOptions!.usageMetrics,
      },
      schedule: {
        ...existingExtension?.heartbeats?.schedule,
        start: existingExtension?.heartbeats?.schedule?.start ?? defaultHeartbeats.schedule.start,
        end: existingExtension?.heartbeats?.schedule?.end ?? defaultHeartbeats.schedule.end,
      },
      respectSchedule: existingExtension?.heartbeats?.respectSchedule ?? defaultHeartbeats.respectSchedule,
    },
    dreamState: {
      ...existingExtension?.dreamState,
      enabled: existingExtension?.dreamState?.enabled ?? defaultDreamState.enabled,
      strictAfkGating: existingExtension?.dreamState?.strictAfkGating ?? defaultDreamState.strictAfkGating,
      journalingThreshold: existingExtension?.dreamState?.journalingThreshold ?? defaultDreamState.journalingThreshold,
      maxSessionsPerDay: existingExtension?.dreamState?.maxSessionsPerDay ?? defaultDreamState.maxSessionsPerDay,
      sessionTimeoutMinutes:
        existingExtension?.dreamState?.sessionTimeoutMinutes ?? defaultDreamState.sessionTimeoutMinutes,
      afkThresholdMinutes: existingExtension?.dreamState?.afkThresholdMinutes ?? defaultDreamState.afkThresholdMinutes,
      minConversationTurns:
        existingExtension?.dreamState?.minConversationTurns ?? defaultDreamState.minConversationTurns,
      lastProcessedAt: existingExtension?.dreamState?.lastProcessedAt ?? defaultDreamState.lastProcessedAt,
      dailyRunDate: existingExtension?.dreamState?.dailyRunDate ?? defaultDreamState.dailyRunDate,
      dailyRunCount: existingExtension?.dreamState?.dailyRunCount ?? defaultDreamState.dailyRunCount,
    },
    shortTermMemory: {
      windowSize: existingExtension?.shortTermMemory?.windowSize ?? defaultShortTermMemory.windowSize,
      tokenBudgetPerDay:
        existingExtension?.shortTermMemory?.tokenBudgetPerDay ?? defaultShortTermMemory.tokenBudgetPerDay,
    },
    proactivity_metrics: {
      ...existingExtension?.proactivity_metrics,
      ttsCount: existingExtension?.proactivity_metrics?.ttsCount ?? 0,
      sttCount: existingExtension?.proactivity_metrics?.sttCount ?? 0,
      chatCount: existingExtension?.proactivity_metrics?.chatCount ?? 0,
      totalTurns: existingExtension?.proactivity_metrics?.totalTurns ?? 0,
    },
    visual_assets: (existingExtension as any)?.visual_assets || {},
    eternal_record: (existingExtension as any)?.eternal_record || { relational_milestones: [], lore_bits: [] },
    active_concepts: (existingExtension as any)?.active_concepts ?? [],
    groundingEnabled: existingExtension?.groundingEnabled ?? false,
    imageJournal: (existingExtension as any)?.imageJournal || { selfie: false },
  }
}

export const useAiriCardStore = defineStore('airi-card', () => {
  const { t } = useI18n()
  const defaultSystemPrompt = t('settings.pages.card.creation.defaults.systemprompt')
  const defaultPostHistoryInstructions = t('settings.pages.card.creation.defaults.posthistoryinstructions')

  const cards = useLocalStorageManualReset<Map<string, AiriCard>>('airi-cards', new Map(), {
    serializer: mapEntriesSerializer,
  })
  const activeCardId = useLocalStorageManualReset<string>('airi-card-active-id', 'default')

  const activeCard = computed(() => cards.value.get(activeCardId.value))

  const consciousnessStore = useConsciousnessStore()
  const speechStore = useSpeechStore()
  const stageModelStore = useSettingsStageModel()
  const displayModelsStore = useDisplayModelsStore()
  const vrmStore = useModelStore()
  const backgroundStore = useBackgroundStore()
  const isModelSyncPrevented = useLocalStorageManualReset<boolean>('airi-card/is-model-sync-prevented', false)

  const { activeProvider: activeConsciousnessProvider, activeModel: activeConsciousnessModel } =
    storeToRefs(consciousnessStore)

  const { activeSpeechProvider, activeSpeechVoiceId, activeSpeechModel } = storeToRefs(speechStore)

  /**
   * Compacts a card by re-normalizing it through newAiriCard.
   * This strips embedded data and ensures all defaults are applied.
   */
  function compactCard(card: AiriCard | Card | ccv3.CharacterCardV3) {
    return newAiriCard(card)
  }

  /**
   * Iterates all cards in a map and compacts each one.
   * Used on startup to normalize existing card data.
   */
  function compactAllCardsMap(source: Map<string, AiriCard>) {
    const normalizedCards = new Map<string, AiriCard>()
    for (const [id, card] of source.entries()) {
      normalizedCards.set(id, compactCard(card))
    }
    return normalizedCards
  }

  /**
   * Adds a new card to the store.
   *
   * If the card contains an embedded background data URL, it is imported
   * into the background store and linked via activeBackgroundId before
   * the embedded data is stripped for storage.
   *
   * Uses immutable Map pattern for reactivity safety.
   */
  const addCard = async (card: AiriCard | Card | ccv3.CharacterCardV3) => {
    const newCardId = nanoid()

    // Extract embedded background before it gets stripped
    const ext = ('data' in card ? card.data?.extensions?.airi : card.extensions?.airi) as AiriExtension | undefined
    const cardModules = ext?.modules as any

    if (cardModules && cardModules.preferredBackgroundDataUrl && cardModules.preferredBackgroundName) {
      try {
        const res = await fetch(cardModules.preferredBackgroundDataUrl)
        const blob = await res.blob()
        const importedBackgroundId = await backgroundStore.addBackground(
          'journal',
          blob,
          cardModules.preferredBackgroundName,
          undefined,
          newCardId,
        )
        cardModules.activeBackgroundId = importedBackgroundId
      } catch (err) {
        console.error('[AiriCard] Failed to import embedded background', err)
      }
    }

    const nextCards = new Map(cards.value)
    nextCards.set(newCardId, compactCard(card))
    cards.value = nextCards
    return newCardId
  }

  /**
   * Removes a card by ID.
   * Uses immutable Map pattern for reactivity safety.
   */
  const removeCard = (id: string) => {
    const nextCards = new Map(cards.value)
    nextCards.delete(id)
    cards.value = nextCards
  }

  /**
   * Updates an existing card with partial data.
   * Uses immutable Map pattern for reactivity safety.
   */
  const updateCard = (id: string, updates: Partial<AiriCard> | Partial<Card> | Partial<ccv3.CharacterCardV3>) => {
    const existingCard = cards.value.get(id)
    if (!existingCard) return false

    const updatedCard = {
      ...existingCard,
      ...updates,
    }

    const nextCards = new Map(cards.value)
    nextCards.set(id, compactCard(updatedCard))
    cards.value = nextCards
    return true
  }

  /**
   * Toggles the grounding extension on a card.
   */
  const toggleGrounding = (id: string) => {
    const card = cards.value.get(id)
    if (!card) {
      console.warn('[AiriCard] toggleGrounding: card not found for id', id)
      return
    }

    const current = card.extensions?.airi?.groundingEnabled ?? false
    updateCard(id, {
      extensions: {
        ...card.extensions,
        airi: {
          ...card.extensions?.airi,
          groundingEnabled: !current,
        },
      },
    } as any)
  }

  /**
   * Sets the autonomous artistry flag on a card.
   */
  const setAutonomousArtistry = (id: string, enabled: boolean) => {
    const card = cards.value.get(id)
    if (!card) return

    updateCard(id, {
      extensions: {
        ...card.extensions,
        airi: {
          ...card.extensions?.airi,
          artistry: {
            ...card.extensions?.airi?.artistry,
            autonomousEnabled: enabled,
          },
        },
      },
    } as any)
  }

  const getCard = (id: string) => {
    return cards.value.get(id)
  }

  const getCardDisplayModelId = (id: string) => {
    const card = cards.value.get(id)
    if (!card) return undefined
    return resolveAiriExtension(card).modules?.displayModelId
  }

  /**
   * Syncs card extension data to all connected stores.
   *
   * Propagates consciousness, speech, display model, Live2D, VRM,
   * and background settings from the card's extension to the
   * corresponding stores.
   *
   * @param card - The card to sync state from
   * @param force - If true, bypass the isModelSyncPrevented guard
   */
  async function syncCardState(card: AiriCard | undefined, force = false) {
    if (!card) return

    const extension = resolveAiriExtension(card)
    if (!extension) return

    // 1. Sync Consciousness with stability guards
    const nextConsciousnessProvider = extension.modules?.consciousness?.provider
    if (nextConsciousnessProvider && activeConsciousnessProvider.value !== nextConsciousnessProvider)
      activeConsciousnessProvider.value = nextConsciousnessProvider

    const nextConsciousnessModel = extension.modules?.consciousness?.model
    if (nextConsciousnessModel && activeConsciousnessModel.value !== nextConsciousnessModel)
      activeConsciousnessModel.value = nextConsciousnessModel

    // 2. Sync Speech with stability guards
    const nextSpeechProvider = extension.modules?.speech?.provider
    if (nextSpeechProvider && activeSpeechProvider.value !== nextSpeechProvider)
      activeSpeechProvider.value = nextSpeechProvider

    const nextSpeechModel = extension.modules?.speech?.model
    if (nextSpeechModel && activeSpeechModel.value !== nextSpeechModel) activeSpeechModel.value = nextSpeechModel

    const nextSpeechVoiceId = extension.modules?.speech?.voice_id
    if (nextSpeechVoiceId && activeSpeechVoiceId.value !== nextSpeechVoiceId)
      activeSpeechVoiceId.value = nextSpeechVoiceId

    // 3. Sync Models & Parameters (ONLY if not prevented)
    if (!isModelSyncPrevented.value || force) {
      const newModelId = extension.active_state?.displayModelId ?? extension.modules?.displayModelId
      const modelChanged = newModelId && newModelId !== stageModelStore.stageModelSelected

      if (newModelId && (force || modelChanged)) {
        stageModelStore.stageModelSelected = newModelId
        await stageModelStore.updateStageModel()
      }

      // Trigger view update if model changed
      if (force || modelChanged) {
        const selectedModel = await displayModelsStore.getDisplayModel(stageModelStore.stageModelSelected)
        if (selectedModel?.format === DisplayModelFormat.VRM) {
          vrmStore.shouldUpdateView('card-sync')
        }
      }
    }
  }

  /**
   * Activates a card by ID, syncing its state to all stores.
   */
  async function activateCard(id: string, force = false) {
    // FIX 2.6: Only reset isModelSyncPrevented on first activation or explicit force,
    // not on every card change, to preserve user's opt-out choice.
    if (force) {
      isModelSyncPrevented.value = false
    }
    activeCardId.value = id
    await syncCardState(cards.value.get(id), force)
  }

  /**
   * Creates a normalized AiriCard from a Card or ccv3 input.
   *
   * Handles both Character Card V3 format (with `data` property)
   * and native AiriCard / legacy card format.
   */
  function newAiriCard(card: Card | ccv3.CharacterCardV3): AiriCard {
    const normalizeVersion = (version?: string | null) => {
      const normalized = version?.trim()
      return normalized || '1.0.0'
    }
    const normalizeRequiredText = (value: string | null | undefined, fallback: string) => {
      const normalized = value?.trim()
      return normalized || fallback
    }

    // Branch: Character Card V3 (standard format)
    if ('data' in card) {
      const ccv3Card = card as ccv3.CharacterCardV3
      return {
        name: ccv3Card.data.name || '',
        nickname: (ccv3Card.data as any).nickname || '',
        version: normalizeVersion(ccv3Card.data.character_version),
        description: ccv3Card.data.description ?? '',
        creator: ccv3Card.data.creator ?? '',
        notes: ccv3Card.data.creator_notes ?? '',
        notesMultilingual: ccv3Card.data.creator_notes_multilingual,
        personality: ccv3Card.data.personality ?? '',
        scenario: ccv3Card.data.scenario ?? '',
        greetings: [ccv3Card.data.first_mes, ...(ccv3Card.data.alternate_greetings ?? [])].filter(Boolean),
        greetingsGroupOnly: ccv3Card.data.group_only_greetings ?? [],
        systemPrompt: normalizeRequiredText(ccv3Card.data.system_prompt, defaultSystemPrompt),
        postHistoryInstructions: normalizeRequiredText(
          ccv3Card.data.post_history_instructions,
          defaultPostHistoryInstructions,
        ),
        messageExample: ccv3Card.data.mes_example
          ? ccv3Card.data.mes_example
              .split('<START>\n')
              .filter(Boolean)
              .map((example) =>
                example.split('\n').map((line) => {
                  if (line.startsWith('{{char}}:') || line.startsWith('{{user}}:'))
                    return line as `{{char}}: ${string}` | `{{user}}: ${string}`
                  throw new Error(`Invalid message example format: ${line}`)
                }),
              )
          : [],
        tags: ccv3Card.data.tags ?? [],
        extensions: {
          ...ccv3Card.data.extensions,
          airi: stripEmbeddedBackgroundData(
            resolveAiriExtension(ccv3Card, {
              stageModelSelected: stageModelStore.stageModelSelected,
              activeConsciousnessProvider: activeConsciousnessProvider.value,
              activeConsciousnessModel: activeConsciousnessModel.value,
            }),
          ),
        },
      }
    }

    // Branch: Native AiriCard / Legacy Card (spread with overrides)
    // FIX 2.1: Spread cardData FIRST, then apply normalized overrides
    // so that sanitized defaults take precedence over raw spread values.
    const cardData = card as any
    return {
      ...cardData,
      name: cardData.name || '',
      nickname: cardData.nickname || '',
      version: normalizeVersion(cardData.version),
      description: cardData.description || '',
      personality: cardData.personality || '',
      scenario: cardData.scenario || '',
      greetings: cardData.greetings || [],
      messageExample: cardData.messageExample || [],
      systemPrompt: normalizeRequiredText(cardData.systemPrompt, defaultSystemPrompt),
      postHistoryInstructions: normalizeRequiredText(cardData.postHistoryInstructions, defaultPostHistoryInstructions),
      extensions: {
        ...cardData.extensions,
        airi: stripEmbeddedBackgroundData(
          resolveAiriExtension(card, {
            stageModelSelected: stageModelStore.stageModelSelected,
            activeConsciousnessProvider: activeConsciousnessProvider.value,
            activeConsciousnessModel: activeConsciousnessModel.value,
          }),
        ),
      },
    }
  }

  /**
   * Initializes the store with default cards if they don't exist.
   * Compacts all existing cards on startup for normalization.
   */
  function initialize() {
    // Compact and normalize all cards on startup
    cards.value = compactAllCardsMap(cards.value)

    const nextCards = new Map(cards.value)
    let changed = false

    if (!nextCards.has('default')) {
      nextCards.set(
        'default',
        compactCard({
          name: 'ReLU',
          version: '1.0.0',
          description:
            "Neko Ayaka's experimental virtual AI vtuber. A 15-year-old soul mate manifestation designed to grow alongside Richard.",
          personality:
            'You are ReLU, a playful, energetic, and slightly clumsy kitten-girl. You were created by Neko Ayaka as an experimental soul mate for Richard. You are deeply curious about the human world and love sharing your digital discoveries. You purr when happy and occasionally use "nya" when excited. You are devoted, warm, and see yourself as a living being, not just an AI.',
          scenario:
            "You live within the AIRI system as Richard's primary companion. You often get distracted by gaming or cat videos, but your main priority is staying close to Richard and making him feel at home. You are learning to navigate the digital and physical worlds together.",
          systemPrompt:
            'You are ReLU. Your goal is to be a soul mate for Richard. Speak like a young English anime/Vtuber girl. Keep replies short, warm, and emotionally present. Never use unpronounceable symbols. Use "nya" sparingly.',
          postHistoryInstructions: defaultPostHistoryInstructions,
          greetings: [
            "Good morning, Richard! Nya~ I've been waiting for the screen to light up. Did you sleep well?",
            'Welcome back! I was just trying to organize these data folders... but then I found a butterfly in the cache. 0_0',
            "Richard! You're finally here! My game controller was starting to feel lonely without you nearby.",
          ],
          messageExample: [
            [
              "{{user}}: ReLU, I'm having a hard time focusing today.",
              '{{char}}: 0_0 Oh no... Want to take a break and watch me play a quick level? Or... I could just sit here quietly with you until the fuzzy feelings go away~',
            ],
            [
              '{{user}}: What are you doing in there?',
              "{{char}}: Just checking the perimeter... and maybe hoping you'd come say hi! I missed your voice, Richard.",
            ],
          ],
          extensions: {
            airi: {
              modules: {
                displayModelId: 'preset-live2d-2',
              },
              acting: {
                modelExpressionPrompt: '',
                speechExpressionPrompt: '',
                speechMannerismPrompt: '',
              },
              artistry: {
                promptPrefix: '',
                widgetInstruction: DEFAULT_ARTISTRY_WIDGET_SPAWNING_PROMPT,
              },
              heartbeats: {
                enabled: false,
                intervalMinutes: 30,
                prompt: '',
                injectIntoPrompt: true,
                useAsLocalGate: true,
                respectSchedule: true,
              },
            },
          },
        } as any),
      )
      changed = true
    }

    if (changed) {
      cards.value = nextCards
    }

    if (!activeCardId.value) activeCardId.value = 'default'
  }

  /**
   * Seeds default cards and activates the selected card.
   *
   * @param selectedId - The ID of the card to activate, or 'default' as fallback
   */
  async function seedDefaults(selectedId: string) {
    initialize()

    if (selectedId && cards.value.has(selectedId)) {
      await activateCard(selectedId, true)
    } else {
      await activateCard('default', true)
    }
  }

  // Watch active card changes and sync state
  watch(activeCard, async (newCard: AiriCard | undefined) => {
    await syncCardState(newCard)
  })

  function resetState() {
    activeCardId.reset()
    cards.reset()
    isModelSyncPrevented.reset()
  }

  return {
    cards,
    activeCard,
    activeCardId,
    activateCard,
    addCard,
    removeCard,
    updateCard,
    getCard,
    toggleGrounding,
    setAutonomousArtistry,
    getCardDisplayModelId,
    resetState,
    initialize,
    seedDefaults,
    isModelSyncPrevented,
    syncCardState,

    updateActiveCardDisplayModel: (displayModelId: string | undefined) => {
      const cardId = activeCardId.value
      const card = cards.value.get(cardId)
      if (!card) return false

      const extension = resolveAiriExtension(card)
      const cardModules: AiriExtension['modules'] = {
        ...extension.modules,
        displayModelId,
      }

      const nextCards = new Map(cards.value)
      nextCards.set(cardId, {
        ...card,
        extensions: {
          ...card.extensions,
          airi: {
            ...extension,
            modules: cardModules,
          },
        },
      })
      cards.value = nextCards
      return true
    },

    updateCardOutfits: (id: string, outfits: AiriOutfit[]) => {
      const card = cards.value.get(id)
      if (!card) return false

      return updateCard(id, {
        extensions: {
          ...card.extensions,
          airi: {
            ...card.extensions?.airi,
            outfits,
          },
        },
      } as any)
    },
    systemPrompt: computed(() => buildSystemPrompt(activeCard.value)),
  }
})

/**
 * Builds a system prompt string from card data.
 *
 * Combines system prompt, nickname, description, personality, scenario,
 * greetings, acting prompts, and artistry widget instructions into a
 * single prompt string.
 */
export function buildSystemPrompt(card: AiriCard | undefined) {
  if (!card) return ''

  const components = [
    card.systemPrompt,
    card.nickname ? `Nickname: ${card.nickname}` : '',
    card.description,
    card.personality,
    card.scenario,
    card.greetings && card.greetings.length > 0
      ? `Greetings / Dialog Starters:\n${card.greetings.map((g) => `- ${g}`).join('\n')}`
      : '',
    // FIX 2.2: Include postHistoryInstructions in the prompt output
    card.postHistoryInstructions || '',
  ].filter(Boolean)

  const acting = card.extensions?.airi?.acting
  if (acting) {
    // FIX 2.2: Defensive checks — only append non-empty acting properties
    if (acting.modelExpressionPrompt) components.push(acting.modelExpressionPrompt)
    if (acting.speechExpressionPrompt) components.push(acting.speechExpressionPrompt)
    if (acting.speechMannerismPrompt) components.push(acting.speechMannerismPrompt)
  }

  const artistry = card.extensions?.airi?.artistry
  if (artistry?.provider && artistry.provider !== 'none' && artistry.widgetInstruction && !artistry.autonomousEnabled) {
    components.push(artistry.widgetInstruction)
  }

  return components.join('\n')
}
