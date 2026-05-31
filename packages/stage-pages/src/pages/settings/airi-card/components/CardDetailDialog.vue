<script setup lang="ts">
import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'

import DOMPurify from 'dompurify'

import { useArtistryStore } from '@proj-airi/stage-ui/stores/modules/artistry'
import { useBackgroundStore } from '@proj-airi/stage-ui/stores/background'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useSpeechStore } from '@proj-airi/stage-ui/stores/modules/speech'
import { Button, Select } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import DeleteCardDialog from './DeleteCardDialog.vue'

interface Props {
  modelValue: boolean
  cardId: string
  initialTab?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const cardStore = useAiriCardStore()
const consciousnessStore = useConsciousnessStore()
const speechStore = useSpeechStore()
const backgroundStore = useBackgroundStore()
const artistryStore = useArtistryStore()

const { removeCard } = cardStore
const { activeCardId } = storeToRefs(cardStore)
const { activeProvider: consciousnessProvider, activeModel: defaultConsciousnessModel } =
  storeToRefs(consciousnessStore)
const {
  activeSpeechProvider: speechProvider,
  activeSpeechModel: defaultSpeechModel,
  activeSpeechVoiceId: defaultVoiceId,
} = storeToRefs(speechStore)
const { activeProvider: defaultArtistryProvider } = storeToRefs(artistryStore)

const isRefreshingGallery = ref(false)

// Get selected card data
const selectedCard = computed<AiriCard | undefined>(() => {
  if (!props.cardId) return undefined
  return cardStore.getCard(props.cardId)
})

// Journal entries for this card
const journalEntries = computed(() => {
  return backgroundStore.getCharacterJournalEntries(props.cardId)
})

// Get module settings
const moduleSettings = computed(() => {
  if (!selectedCard.value || !selectedCard.value.extensions?.airi?.modules) {
    return {
      consciousnessProvider: '',
      consciousness: '',
      speechProvider: '',
      speech: '',
      voice: '',
    }
  }

  const airiExt = selectedCard.value.extensions.airi.modules
  return {
    consciousnessProvider: airiExt.consciousness?.provider || '',
    consciousness: airiExt.consciousness?.model || '',
    speechProvider: airiExt.speech?.provider || '',
    speech: airiExt.speech?.model || '',
    voice: airiExt.speech?.voice_id || '',
  }
})

// Get character settings
const characterSettings = computed(() => {
  if (!selectedCard.value) return {}

  return {
    personality: selectedCard.value.personality,
    scenario: selectedCard.value.scenario,
    systemPrompt: selectedCard.value.systemPrompt,
    postHistoryInstructions: selectedCard.value.postHistoryInstructions,
  }
})

// Get acting settings
const actingSettings = computed(() => {
  if (!selectedCard.value || !selectedCard.value.extensions?.airi?.acting) {
    return {
      modelExpressionPrompt: '',
      speechExpressionPrompt: '',
      speechMannerismPrompt: '',
      idleAnimations: [] as string[],
    }
  }

  const acting = selectedCard.value.extensions.airi.acting
  return {
    modelExpressionPrompt: acting.modelExpressionPrompt || '',
    speechExpressionPrompt: acting.speechExpressionPrompt || '',
    speechMannerismPrompt: acting.speechMannerismPrompt || '',
    idleAnimations: acting.idleAnimations || [],
  }
})

// Get artistry settings
const artistrySettings = computed(() => {
  if (!selectedCard.value || !selectedCard.value.extensions?.airi?.artistry) {
    return {
      provider: '',
      model: '',
      promptPrefix: '',
      widgetInstruction: '',
      spawnMode: '',
      autonomousEnabled: false,
      autonomousThreshold: 0,
      autonomousTarget: '',
      autonomousMonitorEnabled: false,
      autonomousHistoryDepth: 0,
      options: '',
    }
  }

  const artistry = selectedCard.value.extensions.airi.artistry
  return {
    provider: artistry.provider || '',
    model: artistry.model || '',
    promptPrefix: artistry.promptPrefix || '',
    widgetInstruction: artistry.widgetInstruction || '',
    spawnMode: artistry.spawnMode || '',
    autonomousEnabled: artistry.autonomousEnabled ?? false,
    autonomousThreshold: artistry.autonomousThreshold ?? 0,
    autonomousTarget: artistry.autonomousTarget || '',
    autonomousMonitorEnabled: artistry.autonomousMonitorEnabled ?? false,
    autonomousHistoryDepth: artistry.autonomousHistoryDepth ?? 0,
    options: artistry.options ? JSON.stringify(artistry.options) : '',
  }
})

// Get proactivity settings (heartbeats, dream state, grounding)
const proactivitySettings = computed(() => {
  const airiExt = selectedCard.value?.extensions?.airi
  return {
    heartbeatsEnabled: airiExt?.heartbeats?.enabled ?? false,
    heartbeatsIntervalMinutes: airiExt?.heartbeats?.intervalMinutes ?? 0,
    heartbeatsPrompt: airiExt?.heartbeats?.prompt ?? '',
    heartbeatsInjectIntoPrompt: airiExt?.heartbeats?.injectIntoPrompt ?? false,
    heartbeatsUseAsLocalGate: airiExt?.heartbeats?.useAsLocalGate ?? false,
    heartbeatsScheduleStart: airiExt?.heartbeats?.schedule?.start ?? '',
    heartbeatsScheduleEnd: airiExt?.heartbeats?.schedule?.end ?? '',
    heartbeatsContextWindowHistory: airiExt?.heartbeats?.contextOptions?.windowHistory ?? false,
    heartbeatsContextSystemLoad: airiExt?.heartbeats?.contextOptions?.systemLoad ?? false,
    heartbeatsContextUsageMetrics: airiExt?.heartbeats?.contextOptions?.usageMetrics ?? false,
    heartbeatsRespectSchedule: airiExt?.heartbeats?.respectSchedule ?? false,
    dreamStateEnabled: airiExt?.dreamState?.enabled ?? false,
    dreamStateStrictAfkGating: airiExt?.dreamState?.strictAfkGating ?? false,
    dreamStateJournalingThreshold: airiExt?.dreamState?.journalingThreshold ?? '',
    dreamStateMaxSessionsPerDay: airiExt?.dreamState?.maxSessionsPerDay ?? 0,
    dreamStateSessionTimeoutMinutes: airiExt?.dreamState?.sessionTimeoutMinutes ?? 0,
    groundingEnabled: airiExt?.groundingEnabled ?? false,
  }
})

// Get generation settings
const generationSettings = computed(() => {
  if (!selectedCard.value || !selectedCard.value.extensions?.airi?.generation) {
    return {
      enabled: false,
      provider: '',
      model: '',
      maxTokens: undefined as number | undefined,
      temperature: undefined as number | undefined,
      topP: undefined as number | undefined,
      contextWidth: undefined as number | undefined,
      reasoningFallback: false,
      advanced: '',
      compactionStrategy: '',
      compactionMinKeepTurns: undefined as number | undefined,
    }
  }

  const gen = selectedCard.value.extensions.airi.generation
  return {
    enabled: gen.enabled ?? false,
    provider: gen.provider || '',
    model: gen.model || '',
    maxTokens: gen.known?.maxTokens,
    temperature: gen.known?.temperature,
    topP: gen.known?.topP,
    contextWidth: gen.known?.contextWidth,
    reasoningFallback: gen.known?.reasoningFallback ?? false,
    advanced: gen.advanced ? JSON.stringify(gen.advanced) : '',
    compactionStrategy: gen.compaction?.strategy || '',
    compactionMinKeepTurns: gen.compaction?.minKeepTurns,
  }
})

// Check if card is active
const isActive = computed(() => props.cardId === activeCardId.value)

// Animation control for card activation
const isActivating = ref(false)

function handleActivate() {
  isActivating.value = true
  setTimeout(() => {
    activeCardId.value = props.cardId
    isActivating.value = false
  }, 300)
}

function highlightTagToHtml(text: string) {
  return DOMPurify.sanitize(
    text?.replace(/\{\{(.*?)\}\}/g, '<span class="bg-primary-500/20 inline-block">{{ $1 }}</span>').trim(),
  )
}

// Delete confirmation
const showDeleteConfirm = ref(false)

function handleDeleteConfirm() {
  if (selectedCard.value) {
    removeCard(props.cardId)
    emit('update:modelValue', false)
  }
  showDeleteConfirm.value = false
}

// Background options including journal entries
const backgroundOptions = computed(() => {
  const backgrounds = backgroundStore.getCharacterBackgrounds(props.cardId)
  return [
    { value: 'none', label: t('settings.pages.card.creation.none') },
    ...backgrounds.map((bg) => ({
      value: bg.id,
      label: bg.type === 'journal' ? `Journal: ${bg.title}` : bg.title,
    })),
  ]
})

const activeBackgroundId = computed({
  get: () => selectedCard.value?.extensions?.airi?.modules?.activeBackgroundId || 'none',
  set: async (val: string) => {
    if (!selectedCard.value) return
    const extension = JSON.parse(JSON.stringify(selectedCard.value.extensions))
    if (!extension.airi.modules) extension.airi.modules = {}

    extension.airi.modules.activeBackgroundId = val

    cardStore.updateCard(props.cardId, {
      ...selectedCard.value,
      extensions: extension,
    })
  },
})

// Tab type definition
interface Tab {
  id: string
  label: string
  icon: string
}

// Active tab ID state
const activeTabId = ref('')

// Tabs for card details
const tabs = computed<Tab[]>(() => {
  const availableTabs: Tab[] = []

  // Description tab - always show if there's description
  if (selectedCard.value?.description) {
    availableTabs.push({
      id: 'description',
      label: t('settings.pages.card.description_label'),
      icon: 'i-solar:document-text-linear',
    })
  }

  // Notes tab - only show if there are creator notes
  if (selectedCard.value?.notes) {
    availableTabs.push({
      id: 'notes',
      label: t('settings.pages.card.creator_notes'),
      icon: 'i-solar:notes-linear',
    })
  }

  // Character tab - only show if there are character settings
  if (Object.values(characterSettings.value).some((value) => !!value)) {
    availableTabs.push({
      id: 'character',
      label: t('settings.pages.card.character'),
      icon: 'i-solar:user-rounded-linear',
    })
  }

  // Modules tab - always show
  availableTabs.push({
    id: 'modules',
    label: t('settings.pages.card.modules'),
    icon: 'i-solar:tuning-square-linear',
  })

  // Gallery tab - always show
  availableTabs.push({
    id: 'gallery',
    label: 'Gallery',
    icon: 'i-solar:gallery-linear',
  })

  // Acting tab - show if card has acting config
  if (selectedCard.value?.extensions?.airi?.acting) {
    availableTabs.push({
      id: 'acting',
      label: 'Acting',
      icon: 'i-solar:mask-happly-bold-duotone',
    })
  }

  // Artistry tab - show if card has artistry config
  if (selectedCard.value?.extensions?.airi?.artistry) {
    availableTabs.push({
      id: 'artistry',
      label: 'Artistry',
      icon: 'i-solar:gallery-bold-duotone',
    })
  }

  // Proactivity tab - show if card has heartbeats, dream state, or grounding
  if (
    selectedCard.value?.extensions?.airi?.heartbeats ||
    selectedCard.value?.extensions?.airi?.dreamState ||
    selectedCard.value?.extensions?.airi?.groundingEnabled !== undefined
  ) {
    availableTabs.push({
      id: 'proactivity',
      label: 'Proactivity',
      icon: 'i-solar:heart-pulse-bold-duotone',
    })
  }

  // Generation tab - show if card has generation config
  if (selectedCard.value?.extensions?.airi?.generation) {
    availableTabs.push({
      id: 'generation',
      label: 'Generation',
      icon: 'i-solar:tuning-square-bold-duotone',
    })
  }

  return availableTabs
})

async function handleSetAsBackground(entry: any) {
  activeBackgroundId.value = entry.id
}

async function handleDeleteEntry(id: string) {
  if (confirm('Are you sure you want to delete this image from the journal?')) {
    await backgroundStore.removeBackground(id)
  }
}

async function handleRefreshGallery() {
  isRefreshingGallery.value = true
  try {
    await backgroundStore.initializeStore()
  } finally {
    isRefreshingGallery.value = false
  }
}

async function handleDownloadEntry(id: string, title: string) {
  const url = backgroundStore.getBackgroundUrl(id)
  if (!url) return

  const link = document.createElement('a')
  link.href = url
  link.download = `${title || 'image'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Active tab state - set to first available tab by default
const activeTab = computed({
  get: () => {
    // If current active tab is not in available tabs, reset to first tab
    if (!tabs.value.some((tab) => tab.id === activeTabId.value)) {
      if (props.initialTab && tabs.value.some((tab) => tab.id === props.initialTab)) return props.initialTab
      return tabs.value[0]?.id || ''
    }
    return activeTabId.value
  },
  set: (value: string) => {
    activeTabId.value = value
  },
})

// Reset active tab when dialog opens
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.initialTab && tabs.value.some((tab) => tab.id === props.initialTab))
        activeTabId.value = props.initialTab
      else activeTabId.value = '' // Let computed handle default
    }
  },
)

// Helper function to generate placeholder text for default values
function getDefaultPlaceholder(defaultValue: string | undefined): string {
  return defaultValue
    ? `${t('settings.pages.card.creation.use_default')} (${defaultValue})`
    : t('settings.pages.card.creation.use_default_not_configured')
}

// Helper function to get display value for module settings
function getModuleDisplayValue(value: string | undefined, defaultValue: string | undefined): string {
  return value || getDefaultPlaceholder(defaultValue)
}
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-100 m-0 max-h-[90vh] max-w-6xl w-[92vw] flex flex-col overflow-auto border border-neutral-200 rounded-xl bg-white p-5 shadow-xl 2xl:w-[60vw] lg:w-[80vw] md:w-[85vw] xl:w-[70vw] -translate-x-1/2 -translate-y-1/2 data-[state=closed]:animate-contentHide data-[state=open]:animate-contentShow dark:border-neutral-700 dark:bg-neutral-800 sm:p-6"
        @interact-outside.prevent
      >
        <div v-if="selectedCard" class="w-full flex flex-col gap-5">
          <!-- Header with status indicator -->
          <div flex="~ col" gap-3>
            <div flex="~ row" items-center justify-between>
              <div>
                <div flex="~ row" items-center gap-2>
                  <DialogTitle
                    text-2xl
                    font-normal
                    class="from-primary-500 to-primary-400 bg-gradient-to-r bg-clip-text text-transparent"
                  >
                    {{ selectedCard.name }}
                  </DialogTitle>
                  <div
                    v-if="isActive"
                    class="flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600 font-medium dark:bg-primary-900/40 dark:text-primary-400"
                  >
                    <div i-solar:check-circle-bold-duotone text-xs />
                    {{ t('settings.pages.card.active_badge') }}
                  </div>
                </div>
                <div mt-1 text-sm text-neutral-500 dark:text-neutral-400>
                  v{{ selectedCard.version }}
                  <template v-if="selectedCard.creator">
                    · {{ t('settings.pages.card.created_by') }}
                    <span font-medium>{{ selectedCard.creator }}</span>
                  </template>
                </div>
              </div>

              <!-- Action buttons -->
              <div flex="~ row" gap-2>
                <!-- Activation button -->
                <Button
                  variant="primary"
                  :icon="isActive ? 'i-solar:check-circle-bold-duotone' : 'i-solar:play-circle-broken'"
                  :label="isActive ? t('settings.pages.card.active') : t('settings.pages.card.activate')"
                  :disabled="isActive"
                  :class="{ 'animate-pulse': isActivating }"
                  @click="handleActivate"
                />
                <Button
                  variant="secondary"
                  icon="i-solar:close-circle-bold-duotone"
                  :label="t('settings.pages.card.cancel')"
                  @click="emit('update:modelValue', false)"
                />
              </div>
            </div>

            <!-- Card content tabs -->
            <div class="mt-4">
              <div class="border-b border-neutral-200 dark:border-neutral-700">
                <div class="flex justify-center -mb-px sm:justify-start space-x-1">
                  <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="px-4 py-2 text-sm font-medium"
                    :class="[
                      activeTab === tab.id
                        ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
                    ]"
                    @click="activeTab = tab.id"
                  >
                    <div class="flex items-center gap-1">
                      <div :class="tab.icon" />
                      {{ tab.label }}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Creator notes -->
            <div v-if="activeTab === 'notes' && selectedCard.notes">
              <div
                bg="white/60 dark:black/30"
                border="~ neutral-200/50 dark:neutral-700/30"
                max-h-60
                overflow-auto
                whitespace-pre-line
                rounded-lg
                p-4
                text-neutral-700
                sm:max-h-80
                dark:text-neutral-300
                transition="all duration-200"
                hover="bg-white/80 dark:bg-black/40"
                v-html="highlightTagToHtml(selectedCard.notes)"
              />
            </div>

            <!-- Description section -->
            <div v-if="activeTab === 'description' && selectedCard.description">
              <div
                bg="white/60 dark:black/30"
                max-h-60
                overflow-auto
                whitespace-pre-line
                rounded-lg
                p-4
                sm:max-h-80
                text="neutral-600 dark:neutral-300"
                border="~ neutral-200/50 dark:neutral-700/30"
                v-html="highlightTagToHtml(selectedCard.description)"
              />
            </div>

            <!-- Character -->
            <div v-if="activeTab === 'character' && Object.values(characterSettings).some((value) => !!value)">
              <div flex="~ col" max-h-60 gap-4 overflow-auto pr-1 sm:max-h-80>
                <template v-for="(value, key) in characterSettings" :key="key">
                  <div v-if="value" flex="~ col" gap-2>
                    <h2 text-lg text-neutral-500 font-medium dark:text-neutral-400>
                      {{ t(`settings.pages.card.${key.toLowerCase()}`) }}
                    </h2>
                    <div
                      bg="white/60 dark:black/30"
                      border="~ neutral-200/50 dark:neutral-700/30"
                      transition="all duration-200"
                      hover="bg-white/80 dark:bg-black/40"
                      max-h-none
                      overflow-auto
                      whitespace-pre-line
                      rounded-lg
                      p-3
                      text-neutral-700
                      dark:text-neutral-300
                      v-html="highlightTagToHtml(value)"
                    />
                  </div>
                </template>
              </div>
            </div>

            <!-- Modules -->
            <div v-if="activeTab === 'modules'">
              <div grid="~ cols-1 sm:cols-2" gap-4>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  transition="all duration-200"
                  hover="bg-white/80 dark:bg-black/40"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:brain />
                    {{ t('settings.pages.card.chat.provider') }}
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(moduleSettings.consciousnessProvider, consciousnessProvider) }}
                  </div>
                </div>

                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  transition="all duration-200"
                  hover="bg-white/80 dark:bg-black/40"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:ghost />
                    {{ t('settings.pages.card.consciousness.model') }}
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(moduleSettings.consciousness, defaultConsciousnessModel) }}
                  </div>
                </div>

                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  transition="all duration-200"
                  hover="bg-white/80 dark:bg-black/40"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:radio />
                    {{ t('settings.pages.card.speech.provider') }}
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(moduleSettings.speechProvider, speechProvider) }}
                  </div>
                </div>

                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-2
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  transition="all duration-200"
                  hover="bg-white/80 dark:bg-black/40"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:mic />
                    {{ t('settings.pages.card.speech.model') }}
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(moduleSettings.speech, defaultSpeechModel) }}
                  </div>
                </div>

                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-2
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  transition="all duration-200"
                  hover="bg-white/80 dark:bg-black/40"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:music />
                    {{ t('settings.pages.card.speech.voice') }}
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(moduleSettings.voice, defaultVoiceId) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Gallery -->
            <div v-if="activeTab === 'gallery'">
              <!-- Gallery Header / Preferred Background Selection -->
              <div
                :class="[
                  'mb-6 flex flex-row items-center justify-between gap-4',
                  'border-b border-neutral-100 pb-4 dark:border-neutral-700/50',
                ]"
              >
                <div class="flex flex-row items-center gap-3">
                  <div class="flex flex-col gap-1">
                    <h3 text-sm font-medium>Pinned Background</h3>
                    <p text-xs text-neutral-500>Select the image to show when this character is active.</p>
                  </div>
                  <button
                    :class="[
                      'flex items-center justify-center size-7 rounded-md',
                      'bg-neutral-100 dark:bg-neutral-800 text-neutral-500',
                      'hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-300',
                      'transition-all duration-200 active:scale-90',
                    ]"
                    :disabled="isRefreshingGallery"
                    title="Refresh gallery"
                    @click="handleRefreshGallery"
                  >
                    <div class="i-lucide:refresh-cw text-sm" :class="{ 'animate-spin': isRefreshingGallery }" />
                  </button>
                </div>
                <div w-64>
                  <Select v-model="activeBackgroundId" :options="backgroundOptions" placeholder="Select background" />
                </div>
              </div>

              <div
                v-if="journalEntries.length === 0"
                :class="[
                  'flex flex-col items-center justify-center',
                  'border border-dashed border-neutral-200 rounded-xl',
                  'bg-neutral-50/50 py-12 dark:border-neutral-700/50 dark:bg-neutral-900/50',
                ]"
              >
                <div class="i-solar:gallery-wide-broken mb-3 text-5xl text-neutral-300 dark:text-neutral-600" />
                <p class="text-neutral-500 dark:text-neutral-400">No images in the journal yet.</p>
              </div>
              <div v-else class="grid grid-cols-2 max-h-120 gap-4 overflow-y-auto pr-2 lg:grid-cols-4 sm:grid-cols-3">
                <div
                  v-for="entry in journalEntries"
                  :key="entry.id"
                  class="group relative aspect-square overflow-hidden border border-neutral-200 rounded-lg bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900"
                  :class="{ 'ring-2 ring-primary-500 border-primary-500': activeBackgroundId === entry.id }"
                >
                  <img
                    :src="backgroundStore.getBackgroundUrl(entry.id) ?? undefined"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <!-- Overlay Actions -->
                  <div
                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    <button
                      class="flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] text-white font-bold backdrop-blur-md transition-all active:scale-95"
                      :class="
                        activeBackgroundId === entry.id
                          ? 'bg-primary-500 hover:bg-primary-600'
                          : 'bg-white/20 hover:bg-white/30'
                      "
                      @click="handleSetAsBackground(entry)"
                    >
                      <div :class="activeBackgroundId === entry.id ? 'i-solar:pin-bold' : 'i-solar:pin-linear'" />
                      {{ activeBackgroundId === entry.id ? 'ACTIVE BG' : 'SET AS BG' }}
                    </button>
                    <button
                      class="flex items-center gap-1 rounded-full bg-blue-500/80 px-3 py-1.5 text-[10px] text-white font-bold backdrop-blur-md transition-all active:scale-95 hover:bg-blue-500"
                      @click="handleDownloadEntry(entry.id, entry.title)"
                    >
                      <div class="i-solar:download-square-linear" />
                      DOWNLOAD
                    </button>
                    <button
                      class="flex items-center gap-1 rounded-full bg-red-500/80 px-3 py-1.5 text-[10px] text-white font-bold backdrop-blur-md transition-all active:scale-95 hover:bg-red-500"
                      @click="handleDeleteEntry(entry.id)"
                    >
                      <div class="i-solar:trash-bin-trash-linear" />
                      DELETE
                    </button>
                  </div>
                  <!-- Info Badge -->
                  <div
                    class="pointer-events-none absolute bottom-1 left-1 right-1 truncate rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/90 backdrop-blur-sm"
                  >
                    {{ entry.title }}
                  </div>
                  <!-- Active Indicator -->
                  <div
                    v-if="activeBackgroundId === entry.id"
                    class="absolute left-1 top-1 rounded bg-primary-500 p-1 text-white shadow-lg"
                  >
                    <div class="i-solar:pin-bold text-[10px]" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Acting -->
            <div v-if="activeTab === 'acting'">
              <div flex="~ col" gap-4>
                <div v-if="actingSettings.modelExpressionPrompt" flex="~ col" gap-2>
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-solar:mask-happly-bold-duotone />
                    Model Expression Prompt
                  </span>
                  <div
                    bg="white/60 dark:black/30"
                    border="~ neutral-200/50 dark:neutral-700/30"
                    max-h-40
                    overflow-auto
                    whitespace-pre-line
                    rounded-lg
                    p-3
                    text-sm
                    text-neutral-700
                    dark:text-neutral-300
                    v-html="highlightTagToHtml(actingSettings.modelExpressionPrompt)"
                  />
                </div>
                <div v-if="actingSettings.speechExpressionPrompt" flex="~ col" gap-2>
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:message-square />
                    Speech Expression Prompt
                  </span>
                  <div
                    bg="white/60 dark:black/30"
                    border="~ neutral-200/50 dark:neutral-700/30"
                    max-h-40
                    overflow-auto
                    whitespace-pre-line
                    rounded-lg
                    p-3
                    text-sm
                    text-neutral-700
                    dark:text-neutral-300
                    v-html="highlightTagToHtml(actingSettings.speechExpressionPrompt)"
                  />
                </div>
                <div v-if="actingSettings.speechMannerismPrompt" flex="~ col" gap-2>
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-solar:chat-round-line-bold-duotone />
                    Speech Mannerism Prompt
                  </span>
                  <div
                    bg="white/60 dark:black/30"
                    border="~ neutral-200/50 dark:neutral-700/30"
                    max-h-40
                    overflow-auto
                    whitespace-pre-line
                    rounded-lg
                    p-3
                    text-sm
                    text-neutral-700
                    dark:text-neutral-300
                    v-html="highlightTagToHtml(actingSettings.speechMannerismPrompt)"
                  />
                </div>
                <div v-if="actingSettings.idleAnimations.length > 0" flex="~ col" gap-2>
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-solar:play-circle-broken />
                    Idle Animations
                  </span>
                  <div flex="~ row" gap-2 flex-wrap>
                    <span
                      v-for="anim in actingSettings.idleAnimations"
                      :key="anim"
                      class="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium dark:bg-primary-900/40 dark:text-primary-300"
                    >
                      {{ anim }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="
                    !actingSettings.modelExpressionPrompt &&
                    !actingSettings.speechExpressionPrompt &&
                    !actingSettings.speechMannerismPrompt &&
                    actingSettings.idleAnimations.length === 0
                  "
                  class="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700/50 dark:bg-neutral-900/50 dark:text-neutral-400"
                >
                  No acting configuration set for this card.
                </div>
              </div>
            </div>

            <!-- Artistry -->
            <div v-if="activeTab === 'artistry'">
              <div grid="~ cols-1 sm:cols-2" gap-4>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:image />
                    Artistry Provider
                  </span>
                  <div truncate font-medium>
                    {{ getModuleDisplayValue(artistrySettings.provider, defaultArtistryProvider) }}
                  </div>
                </div>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:cpu />
                    Artistry Model
                  </span>
                  <div truncate font-medium>
                    {{ artistrySettings.model || 'None' }}
                  </div>
                </div>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  class="sm:col-span-2"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:type />
                    Prompt Prefix
                  </span>
                  <div font-medium>
                    {{ artistrySettings.promptPrefix || 'None' }}
                  </div>
                </div>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-solar:widget-4-bold-duotone />
                    Spawn Mode
                  </span>
                  <div truncate font-medium>
                    {{ artistrySettings.spawnMode || 'None' }}
                  </div>
                </div>
                <div
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-solar:eye-bold-duotone />
                    Autonomous
                  </span>
                  <div truncate font-medium>
                    {{ artistrySettings.autonomousEnabled ? 'Enabled' : 'Disabled' }}
                    <template v-if="artistrySettings.autonomousEnabled">
                      (Threshold: {{ artistrySettings.autonomousThreshold }}, Target:
                      {{ artistrySettings.autonomousTarget }})
                    </template>
                  </div>
                </div>
                <div
                  v-if="artistrySettings.options"
                  flex="~ col"
                  bg="white/60 dark:black/30"
                  gap-1
                  rounded-lg
                  p-3
                  border="~ neutral-200/50 dark:neutral-700/30"
                  class="sm:col-span-2"
                >
                  <span flex="~ row" items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400>
                    <div i-lucide:braces />
                    Provider Options (JSON)
                  </span>
                  <pre class="whitespace-pre-wrap break-all text-sm font-mono text-neutral-700 dark:text-neutral-300">{{
                    artistrySettings.options
                  }}</pre>
                </div>
              </div>
            </div>

            <!-- Proactivity -->
            <div v-if="activeTab === 'proactivity'">
              <div flex="~ col" gap-4>
                <!-- Heartbeats -->
                <div bg="white/60 dark:black/30" border="~ neutral-200/50 dark:neutral-700/30" rounded-lg p-4>
                  <div flex="~ row" items-center gap-2 mb-3>
                    <div i-solar:heart-pulse-bold-duotone />
                    <h3 text-sm font-medium>Heartbeats</h3>
                    <span
                      class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="
                        proactivitySettings.heartbeatsEnabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      "
                    >
                      {{ proactivitySettings.heartbeatsEnabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <div v-if="proactivitySettings.heartbeatsEnabled" grid="~ cols-1 sm:cols-2" gap-3 text-sm>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Interval:</span>
                      <span class="ml-1 font-medium">{{ proactivitySettings.heartbeatsIntervalMinutes }} min</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Schedule:</span>
                      <span class="ml-1 font-medium">
                        {{ proactivitySettings.heartbeatsScheduleStart }} -
                        {{ proactivitySettings.heartbeatsScheduleEnd }}
                      </span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Inject into prompt:</span>
                      <span class="ml-1 font-medium">
                        {{ proactivitySettings.heartbeatsInjectIntoPrompt ? 'Yes' : 'No' }}
                      </span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Use as local gate:</span>
                      <span class="ml-1 font-medium">
                        {{ proactivitySettings.heartbeatsUseAsLocalGate ? 'Yes' : 'No' }}
                      </span>
                    </div>
                    <div class="sm:col-span-2">
                      <span class="text-neutral-500 dark:text-neutral-400">Context:</span>
                      <span class="ml-1 font-medium">
                        <template v-if="proactivitySettings.heartbeatsContextWindowHistory">History</template>
                        <template v-if="proactivitySettings.heartbeatsContextSystemLoad">, System Load</template>
                        <template v-if="proactivitySettings.heartbeatsContextUsageMetrics">, Usage Metrics</template>
                        <template
                          v-if="
                            !proactivitySettings.heartbeatsContextWindowHistory &&
                            !proactivitySettings.heartbeatsContextSystemLoad &&
                            !proactivitySettings.heartbeatsContextUsageMetrics
                          "
                        >
                          None
                        </template>
                      </span>
                    </div>
                    <div v-if="proactivitySettings.heartbeatsPrompt" class="sm:col-span-2 flex flex-col gap-1">
                      <span class="text-neutral-500 dark:text-neutral-400">Prompt:</span>
                      <div
                        class="max-h-24 overflow-auto whitespace-pre-line rounded bg-neutral-50 p-2 text-xs text-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300"
                        v-html="highlightTagToHtml(proactivitySettings.heartbeatsPrompt)"
                      />
                    </div>
                  </div>
                  <div v-else class="text-sm text-neutral-500 dark:text-neutral-400">
                    Heartbeats are not enabled for this card.
                  </div>
                </div>

                <!-- Dream State -->
                <div bg="white/60 dark:black/30" border="~ neutral-200/50 dark:neutral-700/30" rounded-lg p-4>
                  <div flex="~ row" items-center gap-2 mb-3>
                    <div i-solar:sleeping-circle-bold-duotone />
                    <h3 text-sm font-medium>Dream State</h3>
                    <span
                      class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="
                        proactivitySettings.dreamStateEnabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      "
                    >
                      {{ proactivitySettings.dreamStateEnabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <div v-if="proactivitySettings.dreamStateEnabled" grid="~ cols-1 sm:cols-2" gap-3 text-sm>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Strict AFK gating:</span>
                      <span class="ml-1 font-medium">
                        {{ proactivitySettings.dreamStateStrictAfkGating ? 'Yes' : 'No' }}
                      </span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Journaling threshold:</span>
                      <span class="ml-1 font-medium">{{ proactivitySettings.dreamStateJournalingThreshold }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Max sessions/day:</span>
                      <span class="ml-1 font-medium">{{ proactivitySettings.dreamStateMaxSessionsPerDay }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Session timeout:</span>
                      <span class="ml-1 font-medium">
                        {{ proactivitySettings.dreamStateSessionTimeoutMinutes }} min
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-neutral-500 dark:text-neutral-400">
                    Dream state is not enabled for this card.
                  </div>
                </div>

                <!-- Grounding -->
                <div bg="white/60 dark:black/30" border="~ neutral-200/50 dark:neutral-700/30" rounded-lg p-4>
                  <div flex="~ row" items-center gap-2>
                    <div i-solar:shield-check-bold-duotone />
                    <h3 text-sm font-medium>Grounding</h3>
                    <span
                      class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="
                        proactivitySettings.groundingEnabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      "
                    >
                      {{ proactivitySettings.groundingEnabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Generation -->
            <div v-if="activeTab === 'generation'">
              <div flex="~ col" gap-4>
                <div bg="white/60 dark:black/30" border="~ neutral-200/50 dark:neutral-700/30" rounded-lg p-4>
                  <div flex="~ row" items-center gap-2 mb-3>
                    <div i-solar:tuning-square-bold-duotone />
                    <h3 text-sm font-medium>Card Generation</h3>
                    <span
                      class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="
                        generationSettings.enabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      "
                    >
                      {{ generationSettings.enabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <div v-if="generationSettings.enabled" grid="~ cols-1 sm:cols-2" gap-3 text-sm>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Provider:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.provider || 'None' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Model:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.model || 'None' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Max tokens:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.maxTokens ?? 'Default' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Temperature:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.temperature ?? 'Default' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Top P:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.topP ?? 'Default' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Context width:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.contextWidth ?? 'Default' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Reasoning fallback:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.reasoningFallback ? 'Yes' : 'No' }}</span>
                    </div>
                    <div>
                      <span class="text-neutral-500 dark:text-neutral-400">Compaction:</span>
                      <span class="ml-1 font-medium">{{ generationSettings.compactionStrategy || 'None' }}</span>
                      <template
                        v-if="generationSettings.compactionStrategy && generationSettings.compactionStrategy !== 'none'"
                      >
                        <span class="text-neutral-400">
                          (keep {{ generationSettings.compactionMinKeepTurns ?? 15 }} turns)
                        </span>
                      </template>
                    </div>
                    <div v-if="generationSettings.advanced" class="sm:col-span-2 flex flex-col gap-1">
                      <span class="text-neutral-500 dark:text-neutral-400">Advanced (JSON):</span>
                      <pre
                        class="whitespace-pre-wrap break-all text-xs font-mono text-neutral-700 dark:text-neutral-300"
                        >{{ generationSettings.advanced }}</pre
                      >
                    </div>
                  </div>
                  <div v-else class="text-sm text-neutral-500 dark:text-neutral-400">
                    Card generation is not enabled.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          bg="neutral-50/50 dark:neutral-900/50"
          rounded-xl
          p-8
          text-center
          border="~ neutral-200/50 dark:neutral-700/30"
          shadow="sm"
        >
          <div i-solar:card-search-broken mx-auto mb-3 text-6xl text-neutral-400 />
          {{ t('settings.pages.card.card_not_found') }}
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- Delete confirmation dialog -->
  <DeleteCardDialog
    v-model="showDeleteConfirm"
    :card-name="selectedCard?.name"
    @confirm="handleDeleteConfirm"
    @cancel="showDeleteConfirm = false"
  />
</template>
