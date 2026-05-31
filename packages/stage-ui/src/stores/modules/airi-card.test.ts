import type { Card, ccv3 } from '@proj-airi/ccc'
import type { AiriCard, AiriExtension } from './airi-card'

import { describe, expect, it, vi } from 'vitest'

// Mock stores that import browser-only APIs (AudioWorkletNode, etc.)
vi.mock('@proj-airi/stage-ui-three', () => ({
  useModelStore: vi.fn(() => ({
    shouldUpdateView: vi.fn(),
  })),
}))

vi.mock('../background', () => ({
  useBackgroundStore: vi.fn(() => ({
    entries: new Map(),
    addBackground: vi.fn(),
  })),
}))

vi.mock('../display-models', () => ({
  DisplayModelFormat: { VRM: 'vrm' },
  useDisplayModelsStore: vi.fn(() => ({
    getDisplayModel: vi.fn(),
    loadDisplayModelsFromIndexedDB: vi.fn(),
  })),
}))

vi.mock('../settings/stage-model', () => ({
  useSettingsStageModel: vi.fn(() => ({
    stageModelSelected: 'default',
    updateStageModel: vi.fn(),
  })),
}))

vi.mock('./consciousness', () => ({
  useConsciousnessStore: vi.fn(() => ({
    activeProvider: { value: '' },
    activeModel: { value: '' },
  })),
}))

vi.mock('./speech', () => ({
  useSpeechStore: vi.fn(() => ({
    activeSpeechProvider: { value: '' },
    activeSpeechVoiceId: { value: '' },
    activeSpeechModel: { value: '' },
  })),
}))

vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key),
  })),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id'),
}))

import { buildSystemPrompt, mapEntriesSerializer, resolveAiriExtension, stripEmbeddedBackgroundData } from './airi-card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: 'Test Card',
    version: '1.0.0',
    description: 'A test description',
    personality: 'Friendly and helpful',
    scenario: 'In a test environment',
    systemPrompt: 'You are a test character.',
    postHistoryInstructions: 'Stay in character.',
    greetings: ['Hello!'],
    messageExample: [],
    ...overrides,
  }
}

function makeAiriCard(overrides: Partial<AiriCard> = {}): AiriCard {
  return {
    ...makeCard(),
    extensions: {
      airi: {
        modules: {
          consciousness: { provider: 'openai', model: 'gpt-4o' },
          speech: { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voice_id: 'alloy' },
          displayModelId: 'preset-live2d-1',
          activeBackgroundId: 'none',
        },
        acting: {
          modelExpressionPrompt: '',
          speechExpressionPrompt: '',
          speechMannerismPrompt: '',
          idleAnimations: [],
        },
        agents: {},
        heartbeats: {
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
          schedule: { start: '09:00', end: '22:00' },
          respectSchedule: true,
        },
        dreamState: {
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
        },
        shortTermMemory: {
          windowSize: 3,
          tokenBudgetPerDay: 1000,
        },
        artistry: {
          widgetInstruction: 'Spawn art with [ART: description]',
          spawnMode: 'bg_widget',
          autonomousEnabled: false,
          autonomousThreshold: 70,
          autonomousTarget: 'user',
          autonomousMonitorEnabled: true,
          autonomousHistoryDepth: 3,
        },
        generation: {
          enabled: false,
          provider: 'openai',
          model: 'gpt-4o',
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
        },
        groundingEnabled: false,
        visual_assets: {},
        active_concepts: [],
        eternal_record: { relational_milestones: [], lore_bits: [] },
        imageJournal: { selfie: false },
      },
    },
    ...overrides,
  } as AiriCard
}

function makeCcv3(overrides: Partial<ccv3.CharacterCardV3['data']> = {}): ccv3.CharacterCardV3 {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Test Card',
      description: 'A test description',
      personality: 'Friendly',
      scenario: 'In a test',
      first_mes: 'Hello!',
      mes_example: '',
      creator_notes: '',
      system_prompt: 'Be helpful.',
      post_history_instructions: 'Stay in character.',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '1.0.0',
      extensions: {},
      ...overrides,
    } as ccv3.CharacterCardV3['data'],
  }
}

// ===========================================================================
// T11.4: resolveAiriExtension()
// ===========================================================================

describe('resolveAiriExtension', () => {
  /**
   * @example
   * Empty card → all defaults are populated
   */
  it('provides all defaults when card has no airi extension', () => {
    const card = makeCard()
    const ext = resolveAiriExtension(card)

    expect(ext.modules.consciousness.provider).toBe('')
    expect(ext.modules.consciousness.model).toBe('')
    expect(ext.modules.speech.provider).toBe('')
    expect(ext.modules.speech.model).toBe('')
    expect(ext.modules.speech.voice_id).toBe('')
    expect(ext.modules.activeBackgroundId).toBe('none')
    expect(ext.groundingEnabled).toBe(false)
    expect(ext.acting!.modelExpressionPrompt).toBe('')
    expect(ext.acting!.speechExpressionPrompt).toBe('')
    expect(ext.acting!.speechMannerismPrompt).toBe('')
    expect(ext.acting!.idleAnimations).toEqual([])
    expect(ext.heartbeats!.enabled).toBe(false)
    expect(ext.heartbeats!.intervalMinutes).toBe(5)
    expect(ext.dreamState!.enabled).toBe(false)
    expect(ext.dreamState!.journalingThreshold).toBe('balanced')
    expect(ext.shortTermMemory!.windowSize).toBe(3)
    expect(ext.shortTermMemory!.tokenBudgetPerDay).toBe(1000)
    expect(ext.artistry!.spawnMode).toBe('bg_widget')
    expect(ext.artistry!.autonomousEnabled).toBe(false)
    expect(ext.artistry!.autonomousMonitorEnabled).toBe(true)
    expect(ext.artistry!.autonomousHistoryDepth).toBe(3)
    expect(ext.generation!.enabled).toBe(false)
    expect(ext.generation!.compaction!.strategy).toBe('none')
    expect(ext.generation!.compaction!.minKeepTurns).toBe(15)
    expect(ext.visual_assets).toEqual({})
    expect(ext.active_concepts).toEqual([])
    expect(ext.eternal_record).toEqual({ relational_milestones: [], lore_bits: [] })
    expect(ext.imageJournal).toEqual({ selfie: false })
    expect(ext.proactivity_metrics!.ttsCount).toBe(0)
    expect(ext.proactivity_metrics!.sttCount).toBe(0)
    expect(ext.proactivity_metrics!.chatCount).toBe(0)
    expect(ext.proactivity_metrics!.totalTurns).toBe(0)
  })

  /**
   * @example
   * Existing data is preserved when present
   */
  it('preserves existing extension data when present', () => {
    const card = makeAiriCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'anthropic', model: 'claude-3' },
            speech: { provider: 'openai', model: 'tts-1', voice_id: 'nova' },
            displayModelId: 'custom-model-1',
            activeBackgroundId: 'bg-123',
          },
          acting: {
            modelExpressionPrompt: 'Use expressions',
            speechExpressionPrompt: 'Use speech tags',
            speechMannerismPrompt: 'Use mannerisms',
            idleAnimations: ['idle1', 'idle2'],
          },
          agents: {},
          heartbeats: {
            enabled: true,
            intervalMinutes: 10,
            prompt: 'Check in',
            injectIntoPrompt: false,
            useAsLocalGate: false,
            contextOptions: {
              windowHistory: false,
              systemLoad: false,
              usageMetrics: false,
            },
            schedule: { start: '08:00', end: '20:00' },
            respectSchedule: false,
          },
          dreamState: {
            enabled: true,
            strictAfkGating: false,
            journalingThreshold: 'lush',
            maxSessionsPerDay: 8,
            sessionTimeoutMinutes: 30,
            afkThresholdMinutes: 10,
            minConversationTurns: 2,
            lastProcessedAt: 1000,
            dailyRunDate: '2024-01-01',
            dailyRunCount: 3,
          },
          shortTermMemory: {
            windowSize: 5,
            tokenBudgetPerDay: 2000,
          },
          artistry: {
            provider: 'openai',
            model: 'dall-e-3',
            widgetInstruction: 'Custom instruction',
            spawnMode: 'widget',
            autonomousEnabled: true,
            autonomousThreshold: 80,
            autonomousTarget: 'assistant',
            autonomousMonitorEnabled: false,
            autonomousHistoryDepth: 5,
          },
          generation: {
            enabled: true,
            provider: 'anthropic',
            model: 'claude-3-opus',
            known: {
              maxTokens: 4096,
              temperature: 0.7,
              topP: 0.9,
              contextWidth: 128000,
              reasoningFallback: false,
            },
            advanced: { custom: true },
            compaction: {
              strategy: 'summarize',
              minKeepTurns: 20,
            },
            importedPresetMeta: {
              source: 'sillytavern',
              originalKeys: ['key1'],
              importedAt: '2024-01-01',
            },
          },
          groundingEnabled: true,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: true },
          proactivity_metrics: {
            ttsCount: 10,
            sttCount: 20,
            chatCount: 30,
            totalTurns: 40,
          },
        },
      },
    })
    const ext = resolveAiriExtension(card)

    expect(ext.modules.consciousness.provider).toBe('anthropic')
    expect(ext.modules.consciousness.model).toBe('claude-3')
    expect(ext.modules.speech.voice_id).toBe('nova')
    expect(ext.modules.displayModelId).toBe('custom-model-1')
    expect(ext.modules.activeBackgroundId).toBe('bg-123')
    expect(ext.groundingEnabled).toBe(true)
    expect(ext.acting!.modelExpressionPrompt).toBe('Use expressions')
    expect(ext.acting!.idleAnimations).toEqual(['idle1', 'idle2'])
    expect(ext.heartbeats!.enabled).toBe(true)
    expect(ext.heartbeats!.intervalMinutes).toBe(10)
    expect(ext.dreamState!.enabled).toBe(true)
    expect(ext.dreamState!.journalingThreshold).toBe('lush')
    expect(ext.shortTermMemory!.windowSize).toBe(5)
    expect(ext.artistry!.autonomousEnabled).toBe(true)
    expect(ext.artistry!.autonomousMonitorEnabled).toBe(false)
    expect(ext.generation!.enabled).toBe(true)
    expect(ext.generation!.known!.maxTokens).toBe(4096)
    expect(ext.generation!.compaction!.strategy).toBe('summarize')
    expect(ext.proactivity_metrics!.ttsCount).toBe(10)
    expect(ext.proactivity_metrics!.totalTurns).toBe(40)
  })

  /**
   * @example
   * Migration: selectedModelId → displayModelId
   */
  it('migrates selectedModelId to displayModelId', () => {
    const card = makeCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: '', model: '' },
            speech: { provider: '', model: '', voice_id: '' },
            selectedModelId: 'legacy-model-123',
          },
        },
      } as any,
    })
    const ext = resolveAiriExtension(card)

    expect(ext.modules.displayModelId).toBe('legacy-model-123')
  })

  /**
   * @example
   * Migration: preferredBackgroundId → activeBackgroundId
   */
  it('migrates preferredBackgroundId to activeBackgroundId', () => {
    const card = makeCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: '', model: '' },
            speech: { provider: '', model: '', voice_id: '' },
            preferredBackgroundId: 'legacy-bg-456',
          },
        },
      } as any,
    })
    const ext = resolveAiriExtension(card)

    expect(ext.modules.activeBackgroundId).toBe('legacy-bg-456')
  })

  /**
   * @example
   * displayModelId takes precedence over selectedModelId
   */
  it('prefers displayModelId over selectedModelId', () => {
    const card = makeCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: '', model: '' },
            speech: { provider: '', model: '', voice_id: '' },
            displayModelId: 'new-model',
            selectedModelId: 'old-model',
          },
        },
      } as any,
    })
    const ext = resolveAiriExtension(card)

    expect(ext.modules.displayModelId).toBe('new-model')
  })

  /**
   * @example
   * Works with ccv3 cards (data wrapper)
   */
  it('resolves extension from ccv3 card data', () => {
    const card = makeCcv3({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'echo' },
          },
        },
      },
    })
    const ext = resolveAiriExtension(card)

    expect(ext.modules.consciousness.model).toBe('gpt-4')
    expect(ext.modules.speech.voice_id).toBe('echo')
  })
})

// ===========================================================================
// T11.3: stripEmbeddedBackgroundData()
// ===========================================================================

describe('stripEmbeddedBackgroundData', () => {
  /**
   * @example
   * Removes preferredBackgroundDataUrl and preferredBackgroundName
   */
  it('strips preferredBackgroundDataUrl and preferredBackgroundName', () => {
    const ext: AiriExtension = {
      modules: {
        consciousness: { provider: 'openai', model: 'gpt-4o' },
        speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
        activeBackgroundId: 'bg-123',
        preferredBackgroundDataUrl: 'data:image/png;base64,abc123',
        preferredBackgroundName: 'My Background',
      },
      acting: {
        modelExpressionPrompt: '',
        speechExpressionPrompt: '',
        speechMannerismPrompt: '',
        idleAnimations: [],
      },
      agents: {},
      heartbeats: {
        enabled: false,
        intervalMinutes: 5,
        prompt: '',
        injectIntoPrompt: true,
        useAsLocalGate: true,
        contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
        schedule: { start: '09:00', end: '22:00' },
        respectSchedule: true,
      },
      dreamState: {
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
      },
      shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
      artistry: {
        widgetInstruction: 'test',
        spawnMode: 'bg_widget',
        autonomousEnabled: false,
        autonomousThreshold: 70,
        autonomousTarget: 'user',
        autonomousMonitorEnabled: true,
        autonomousHistoryDepth: 3,
      },
      generation: {
        enabled: false,
        provider: 'openai',
        model: 'gpt-4o',
        known: { contextWidth: undefined, reasoningFallback: true },
        advanced: undefined,
        compaction: { strategy: 'none', minKeepTurns: 15 },
        importedPresetMeta: undefined,
      },
      groundingEnabled: false,
      visual_assets: {},
      active_concepts: [],
      eternal_record: { relational_milestones: [], lore_bits: [] },
      imageJournal: { selfie: false },
      proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
    }

    const stripped = stripEmbeddedBackgroundData(ext)

    expect(stripped.modules.preferredBackgroundDataUrl).toBeUndefined()
    expect(stripped.modules.preferredBackgroundName).toBeUndefined()
    expect(stripped.modules.activeBackgroundId).toBe('bg-123')
    expect(stripped.modules.consciousness.model).toBe('gpt-4o')
  })

  /**
   * @example
   * Preserves all non-embedded data
   */
  it('preserves all non-embedded module data', () => {
    const ext: AiriExtension = {
      modules: {
        consciousness: { provider: 'anthropic', model: 'claude-3' },
        speech: {
          provider: 'openai',
          model: 'tts-1',
          voice_id: 'nova',
          pitch: 1.2,
          rate: 0.9,
          ssml: true,
          language: 'en',
        },
        displayModelId: 'model-1',
        activeBackgroundId: 'bg-456',
        vrm: { source: 'file', file: 'model.vrm' },
        live2d: { source: 'url', url: 'https://example.com/model.json' },
        preferredBackgroundDataUrl: 'data:image/png;base64,xyz',
        preferredBackgroundName: 'BG',
      },
      acting: {
        modelExpressionPrompt: 'expr',
        speechExpressionPrompt: 'speech',
        speechMannerismPrompt: 'mann',
        idleAnimations: ['idle1'],
      },
      agents: {},
      heartbeats: {
        enabled: false,
        intervalMinutes: 5,
        prompt: '',
        injectIntoPrompt: true,
        useAsLocalGate: true,
        contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
        schedule: { start: '09:00', end: '22:00' },
        respectSchedule: true,
      },
      dreamState: {
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
      },
      shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
      artistry: {
        widgetInstruction: 'test',
        spawnMode: 'bg_widget',
        autonomousEnabled: false,
        autonomousThreshold: 70,
        autonomousTarget: 'user',
        autonomousMonitorEnabled: true,
        autonomousHistoryDepth: 3,
      },
      generation: {
        enabled: false,
        provider: 'openai',
        model: 'gpt-4o',
        known: { contextWidth: undefined, reasoningFallback: true },
        advanced: undefined,
        compaction: { strategy: 'none', minKeepTurns: 15 },
        importedPresetMeta: undefined,
      },
      groundingEnabled: false,
      visual_assets: {},
      active_concepts: [],
      eternal_record: { relational_milestones: [], lore_bits: [] },
      imageJournal: { selfie: false },
      proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
    }

    const stripped = stripEmbeddedBackgroundData(ext)

    expect(stripped.modules.consciousness.model).toBe('claude-3')
    expect(stripped.modules.speech.pitch).toBe(1.2)
    expect(stripped.modules.speech.ssml).toBe(true)
    expect(stripped.modules.vrm).toEqual({ source: 'file', file: 'model.vrm' })
    expect(stripped.modules.live2d).toEqual({ source: 'url', url: 'https://example.com/model.json' })
    expect(stripped.modules.preferredBackgroundDataUrl).toBeUndefined()
    expect(stripped.modules.preferredBackgroundName).toBeUndefined()
  })
})

// ===========================================================================
// T11.7: buildSystemPrompt()
// ===========================================================================

describe('buildSystemPrompt', () => {
  /**
   * @example
   * Returns empty string for undefined card
   */
  it('returns empty string for undefined card', () => {
    expect(buildSystemPrompt(undefined)).toBe('')
  })

  /**
   * @example
   * Includes all non-empty card fields
   */
  it('includes all non-empty card fields in the prompt', () => {
    const card = makeAiriCard({
      name: 'Test',
      nickname: 'T',
      description: 'Desc',
      personality: 'Pers',
      scenario: 'Scen',
      systemPrompt: 'SysPrompt',
      greetings: ['Hi!', 'Hello!'],
      postHistoryInstructions: 'PostHist',
    })
    const prompt = buildSystemPrompt(card)

    expect(prompt).toContain('SysPrompt')
    expect(prompt).toContain('Nickname: T')
    expect(prompt).toContain('Desc')
    expect(prompt).toContain('Pers')
    expect(prompt).toContain('Scen')
    expect(prompt).toContain('Greetings / Dialog Starters')
    expect(prompt).toContain('- Hi!')
    expect(prompt).toContain('- Hello!')
  })

  /**
   * @example
   * Skips empty fields
   */
  it('skips empty or falsy fields', () => {
    const card = makeAiriCard({
      nickname: '',
      description: '',
      personality: '',
      scenario: '',
      greetings: [],
    })
    const prompt = buildSystemPrompt(card)

    expect(prompt).toContain('You are a test character.')
    expect(prompt).not.toContain('Nickname:')
    expect(prompt).not.toContain('Greetings / Dialog Starters')
  })

  /**
   * @example
   * Includes acting prompts when present
   */
  it('includes acting prompts when non-empty', () => {
    const card = makeAiriCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
          },
          acting: {
            modelExpressionPrompt: 'Use ACT tokens',
            speechExpressionPrompt: 'Use speech tags',
            speechMannerismPrompt: 'Use mannerisms',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
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
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            widgetInstruction: 'Spawn art',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: false,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    })
    const prompt = buildSystemPrompt(card)

    expect(prompt).toContain('Use ACT tokens')
    expect(prompt).toContain('Use speech tags')
    expect(prompt).toContain('Use mannerisms')
  })

  /**
   * @example
   * Includes artistry widget instruction when provider is set and not autonomous
   */
  it('includes artistry widget instruction when provider is set and not autonomous', () => {
    const card = makeAiriCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
          },
          acting: {
            modelExpressionPrompt: '',
            speechExpressionPrompt: '',
            speechMannerismPrompt: '',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
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
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            provider: 'openai',
            widgetInstruction: 'Spawn with [ART: desc]',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: false,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    })
    const prompt = buildSystemPrompt(card)

    expect(prompt).toContain('Spawn with [ART: desc]')
  })

  /**
   * @example
   * Excludes artistry widget instruction when autonomous is enabled
   */
  it('excludes artistry widget instruction when autonomous is enabled', () => {
    const card = makeAiriCard({
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
          },
          acting: {
            modelExpressionPrompt: '',
            speechExpressionPrompt: '',
            speechMannerismPrompt: '',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
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
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            provider: 'openai',
            widgetInstruction: 'Spawn with [ART: desc]',
            spawnMode: 'bg_widget',
            autonomousEnabled: true,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: false,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    })
    const prompt = buildSystemPrompt(card)

    expect(prompt).not.toContain('Spawn with [ART: desc]')
  })

  /**
   * @example
   * Prompt order is consistent: systemPrompt → nickname → description → personality → scenario → greetings → acting → artistry
   */
  it('produces consistent prompt order', () => {
    const card = makeAiriCard({
      nickname: 'Nick',
      description: 'Desc',
      personality: 'Pers',
      scenario: 'Scen',
      greetings: ['Hi'],
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
          },
          acting: {
            modelExpressionPrompt: 'ActExpr',
            speechExpressionPrompt: 'SpeechExpr',
            speechMannerismPrompt: 'Mannerism',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
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
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            provider: 'openai',
            widgetInstruction: 'ArtWidget',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: false,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    })
    const prompt = buildSystemPrompt(card)

    const sysIdx = prompt.indexOf('You are a test character.')
    const nickIdx = prompt.indexOf('Nickname: Nick')
    const descIdx = prompt.indexOf('Desc')
    const persIdx = prompt.indexOf('Pers')
    const scenIdx = prompt.indexOf('Scen')
    const greetIdx = prompt.indexOf('Greetings / Dialog Starters')
    const actExprIdx = prompt.indexOf('ActExpr')
    const artIdx = prompt.indexOf('ArtWidget')

    expect(sysIdx).toBeLessThan(nickIdx)
    expect(nickIdx).toBeLessThan(descIdx)
    expect(descIdx).toBeLessThan(persIdx)
    expect(persIdx).toBeLessThan(scenIdx)
    expect(scenIdx).toBeLessThan(greetIdx)
    expect(greetIdx).toBeLessThan(actExprIdx)
    expect(actExprIdx).toBeLessThan(artIdx)
  })
})

// ===========================================================================
// T11.6: mapEntriesSerializer
// ===========================================================================

describe('mapEntriesSerializer', () => {
  /**
   * @example
   * Map → JSON serialization
   */
  it('serializes a Map to JSON string', () => {
    const map = new Map<string, AiriCard>([
      ['card-1', makeAiriCard({ name: 'Card 1' })],
      ['card-2', makeAiriCard({ name: 'Card 2' })],
    ])

    const json = mapEntriesSerializer.write(map)
    const parsed = JSON.parse(json)

    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(2)
    expect(parsed[0][0]).toBe('card-1')
    expect(parsed[0][1].name).toBe('Card 1')
    expect(parsed[1][0]).toBe('card-2')
    expect(parsed[1][1].name).toBe('Card 2')
  })

  /**
   * @example
   * JSON → Map deserialization
   */
  it('deserializes JSON string to Map', () => {
    const data: [string, AiriCard][] = [
      ['card-1', makeAiriCard({ name: 'Card 1' })],
      ['card-2', makeAiriCard({ name: 'Card 2' })],
    ]
    const json = JSON.stringify(data)

    const map = mapEntriesSerializer.read(json)

    expect(map).toBeInstanceOf(Map)
    expect(map.size).toBe(2)
    expect(map.get('card-1')?.name).toBe('Card 1')
    expect(map.get('card-2')?.name).toBe('Card 2')
  })

  /**
   * @example
   * Round-trip: Map → JSON → Map preserves all entries
   */
  it('preserves all entries through round-trip serialization', () => {
    const original = new Map<string, AiriCard>([
      ['id-1', makeAiriCard({ name: 'First', description: 'Desc 1' })],
      ['id-2', makeAiriCard({ name: 'Second', description: 'Desc 2' })],
      ['id-3', makeAiriCard({ name: 'Third', description: 'Desc 3' })],
    ])

    const json = mapEntriesSerializer.write(original)
    const restored = mapEntriesSerializer.read(json)

    expect(restored.size).toBe(original.size)
    for (const [key, value] of original.entries()) {
      expect(restored.has(key)).toBe(true)
      expect(restored.get(key)?.name).toBe(value.name)
      expect(restored.get(key)?.description).toBe(value.description)
    }
  })

  /**
   * @example
   * Empty Map round-trip
   */
  it('handles empty Map round-trip', () => {
    const empty = new Map<string, AiriCard>()
    const json = mapEntriesSerializer.write(empty)
    const restored = mapEntriesSerializer.read(json)

    expect(restored).toBeInstanceOf(Map)
    expect(restored.size).toBe(0)
  })

  /**
   * @example
   * Preserves card data through round-trip
   */
  it('preserves card extension data through round-trip', () => {
    const card = makeAiriCard({
      name: 'Test',
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
            displayModelId: 'model-1',
          },
          acting: {
            modelExpressionPrompt: 'expr',
            speechExpressionPrompt: 'speech',
            speechMannerismPrompt: 'mann',
            idleAnimations: ['idle1'],
          },
          agents: {},
          heartbeats: {
            enabled: true,
            intervalMinutes: 10,
            prompt: 'Check in',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
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
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            widgetInstruction: 'test',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: true,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    })

    const original = new Map([['test-id', card]])
    const json = mapEntriesSerializer.write(original)
    const restored = mapEntriesSerializer.read(json)

    const restoredCard = restored.get('test-id')
    expect(restoredCard?.extensions.airi.groundingEnabled).toBe(true)
    expect(restoredCard?.extensions.airi.modules.displayModelId).toBe('model-1')
    expect(restoredCard?.extensions.airi.acting!.idleAnimations).toEqual(['idle1'])
    expect(restoredCard?.extensions.airi.heartbeats!.enabled).toBe(true)
  })
})
