<script setup lang="ts">
import type { Card, ccv3 } from '@proj-airi/ccc'
import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'

import { Alert } from '@proj-airi/stage-ui/components'
import { useBackgroundStore } from '@proj-airi/stage-ui/stores/background'
import { useDisplayModelsStore } from '@proj-airi/stage-ui/stores/display-models'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useArtistryStore } from '@proj-airi/stage-ui/stores/modules/artistry'
import { Button, InputFile } from '@proj-airi/ui'
import { Select } from '@proj-airi/ui/components/form'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import cardExportFrameUrl from './card-export-frame.png?url'
import CardCreate from './components/CardCreate.vue'
import CardCreationDialog from './components/CardCreationDialog.vue'
import CardDetailDialog from './components/CardDetailDialog.vue'
import CardImportWizard from './components/CardImportWizard.vue'
import CardListItem from './components/CardListItem.vue'
import DeleteCardDialog from './components/DeleteCardDialog.vue'

import { buildCharaCardV2, injectPngTextChunk, parsePngCharaPayload, utf8ToBase64 } from './utils'

interface WindowWithElectron extends Window {
  electron?: {
    ipcRenderer?: {
      on: (channel: string, handler: (...args: unknown[]) => void) => void
      removeListener: (channel: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

interface CardSourceLink {
  readonly name: string
  readonly description: string
  readonly url: string
}

const { t } = useI18n()
const cardStore = useAiriCardStore()
const displayModelsStore = useDisplayModelsStore()
const { addCard, removeCard } = cardStore
const { cards, activeCardId } = storeToRefs(cardStore)
const backgroundStore = useBackgroundStore()

const route = useRoute()
const router = useRouter()

// Currently selected card ID (different from active card ID)
const selectedCardId = ref<string>('')
// Currently editing card ID
const editingCardId = ref<string>('')
// Dialog state
const isCardDialogOpen = ref(false)
const isCardCreationDialogOpen = ref(false)

// Card browser drawer & wizard states
const activeBrowserSource = ref<CardSourceLink | null>(null)
const isImportWizardOpen = ref(false)
const importedCardData = ref<Record<string, unknown> | null>(null)

// Check if running in Electron
const isElectron = computed(() => typeof window !== 'undefined' && Boolean((window as WindowWithElectron).electron))

// NOTICE: Placeholder for IPC listener cleanup function.
// Assigned a real cleanup function in onMounted when running in Electron.
// Remains empty noop in non-Electron environments where no listener is registered.
let removeIpcListener: () => void = () => {}

function handleCharaCardDownloaded(payload: { base64Data: string; filename: string; ext: string }) {
  try {
    const rawData = atob(payload.base64Data)
    const arrayBuffer = new ArrayBuffer(rawData.length)
    const view = new Uint8Array(arrayBuffer)
    for (let i = 0; i < rawData.length; i++) {
      view[i] = rawData.charCodeAt(i)
    }

    let importedCard: Record<string, unknown>

    if (payload.ext === 'png') {
      importedCard = parsePngCharaPayload(arrayBuffer)
    } else {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(arrayBuffer)
      importedCard = parseImportedCard(text)
    }

    const normalized = addCardPreviewNormalize(importedCard) as unknown as Record<string, unknown>
    importedCardData.value = normalized

    // Close webview drawer
    activeBrowserSource.value = null

    // Open import wizard modal
    isImportWizardOpen.value = true
  } catch (err) {
    console.error('[Settings:Cards] Failed to process intercepted card:', err)
    toast.error('Failed to parse intercepted card file')
  }
}

onMounted(() => {
  const win = window as WindowWithElectron
  if (typeof window !== 'undefined' && win.electron?.ipcRenderer) {
    const handler = (_event: unknown, payload: { base64Data: string; filename: string; ext: string }) => {
      handleCharaCardDownloaded(payload)
    }
    win.electron.ipcRenderer.on('chara-card-downloaded', handler as (...args: unknown[]) => void)
    removeIpcListener = () => {
      win.electron?.ipcRenderer?.removeListener('chara-card-downloaded', handler as (...args: unknown[]) => void)
    }
  }
})

onUnmounted(() => {
  removeIpcListener()
})

// Initial tab for the detail dialog
const initialTab = ref<string | undefined>(undefined)

// Watch for deep-linking query parameters
watch(
  () => route.query,
  (query) => {
    const cardId = query.cardId as string
    const tab = query.tab as string
    const edit = query.edit as string

    if (cardId && cards.value.has(cardId)) {
      if (edit === 'true') {
        editingCardId.value = cardId
        isCardCreationDialogOpen.value = true
      } else {
        selectedCardId.value = cardId
        initialTab.value = tab || undefined
        isCardDialogOpen.value = true
      }

      // Clear query params after handling
      router.replace({ query: {} })
    }
  },
  { immediate: true },
)

// Search query
const searchQuery = ref('')

// Sort option
const sortOption = ref('nameAsc')

const inputFiles = ref<File[]>([])

const cardSourceLinks = [
  {
    name: 'JannyAI',
    description: 'Character discovery and card sharing with SillyTavern-friendly exports in the ecosystem.',
    url: 'https://jannyai.com',
  },
  {
    name: 'JanitorAI',
    description:
      'Popular character platform. Look for exports or mirrors that provide SillyTavern / chara_card_v2 PNG or JSON.',
    url: 'https://janitorai.com',
  },
  {
    name: 'Chub AI',
    description: 'Large character-sharing ecosystem commonly used with third-party roleplay UIs.',
    url: 'https://chub.ai',
  },
  {
    name: 'Risu Realm',
    description: 'Community character hub tied to the Risu ecosystem, useful for portable card-style prompts.',
    url: 'https://realm.risuai.net',
  },
] as const

// Card list data structure
interface CardItem {
  id: string
  name: string
  description?: string
  deprecated?: boolean
  customizable?: boolean
}

type RawImportedCardPayload = Card | ccv3.CharacterCardV3

const CARD_EXPORT_FRAME = {
  width: 925,
  height: 1436,
  innerX: 65,
  innerY: 79,
  innerWidth: 831,
  innerHeight: 1295,
} as const

// T3.4: parseImportedCard — parse JSON string as Card type
function parseImportedCard(content: string): Record<string, unknown> {
  const parsed = JSON.parse(content) as Record<string, unknown>

  if (parsed?.format === 'airi-card' && parsed?.version === 1 && parsed?.card) {
    return parsed.card as Record<string, unknown>
  }

  return parsed
}

// T3.5: parseStMessageExamples — convert ST message examples format to greeting format
function parseStMessageExamples(exampleStr: string): string[][] {
  if (!exampleStr || typeof exampleStr !== 'string') return []

  const blocks = exampleStr
    .split(/<START>/i)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks
    .map((block) => {
      return block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          let normalized = line
          if (normalized.toLowerCase().startsWith('user:')) {
            normalized = `{{user}}:${normalized.slice(5)}`
          } else if (normalized.toLowerCase().startsWith('char:')) {
            normalized = `{{char}}:${normalized.slice(5)}`
          }
          if (/^\{\{(?:user|char)\}\}:\S/.test(normalized)) {
            normalized = normalized.replace(/^(\{\{(?:user|char)\}\}:)/, '$1 ')
          }

          return normalized
        })
        .filter((line) => /^\{\{(?:user|char)\}\}: /.test(line))
    })
    .filter((block) => block.length > 0)
}

// T3.6: getImportedCardName — extract name from imported card
function getImportedCardName(card: RawImportedCardPayload): string {
  if ('data' in card) return card.data?.name || 'Imported Card'

  return card.name || 'Imported Card'
}

// T3.7: withImportedCardName — return card with updated name
function withImportedCardName(card: RawImportedCardPayload, name: string): RawImportedCardPayload {
  if ('data' in card) {
    return {
      ...card,
      data: {
        ...card.data,
        name,
      },
    }
  }

  return {
    ...card,
    name,
  }
}

// T3.8: getUniqueImportedCardName — ensure imported card names are unique
function getUniqueImportedCardName(baseName: string): string {
  const existingNames = new Set(
    Array.from(cards.value.values())
      .map((card) => (card.name || '').trim().toLowerCase())
      .filter(Boolean),
  )

  const trimmedBase = baseName.trim() || 'Imported Card'
  if (!existingNames.has(trimmedBase.toLowerCase())) return trimmedBase

  let counter = 2
  while (existingNames.has(`${trimmedBase} (${counter})`.toLowerCase())) counter += 1

  return `${trimmedBase} (${counter})`
}

// T3.8: addCardPreviewNormalize — normalize imported card data with defaults
function addCardPreviewNormalize(card: Record<string, unknown>): RawImportedCardPayload {
  const data = (card.data as Record<string, unknown> | undefined) || card

  if (card.format === 'airi-card' || card.systemPrompt !== undefined) {
    return {
      ...card,
      version: (card.version as string | undefined) || '1.0.0',
      messageExample:
        typeof card.messageExample === 'string'
          ? parseStMessageExamples(card.messageExample as string)
          : card.messageExample,
    } as RawImportedCardPayload
  }

  return {
    name: (data.name as string | undefined) || 'Imported Card',
    version: (data.character_version as string | undefined) || '1.0.0',
    description: (data.description as string | undefined) ?? '',
    notes: (data.creator_notes as string | undefined) ?? '',
    personality: (data.personality as string | undefined) ?? '',
    scenario: (data.scenario as string | undefined) ?? '',
    systemPrompt: (data.system_prompt as string | undefined) ?? '',
    postHistoryInstructions: (data.post_history_instructions as string | undefined) ?? '',
    greetings: [
      data.first_mes as string | undefined,
      ...((data.alternate_greetings as string[] | undefined) ?? []),
    ].filter(Boolean) as string[],
    messageExample: parseStMessageExamples((data.mes_example as string | undefined) || ''),
    extensions: {
      airi: (data.extensions as Record<string, unknown> | undefined)?.airi,
      ...(data.extensions as Record<string, unknown> | undefined),
    },
  } as RawImportedCardPayload
}

// File input handling for JSON and PNG import
watch(inputFiles, async (newFiles) => {
  const file = newFiles[0]
  if (!file) return

  try {
    let importedCard: Record<string, unknown>

    if (file.name.toLowerCase().endsWith('.png')) {
      importedCard = parsePngCharaPayload(await file.arrayBuffer())
    } else {
      const content = await file.text()
      try {
        importedCard = parseImportedCard(content)
      } catch (e) {
        toast.error('Failed to parse card JSON: Malformed file')
        return
      }
    }

    const normalizedForValidation = addCardPreviewNormalize(importedCard)
    const uniqueName = getUniqueImportedCardName(getImportedCardName(normalizedForValidation))
    const renamedCard = withImportedCardName(normalizedForValidation, uniqueName)

    // Add card and select it
    selectedCardId.value = await addCard(renamedCard)
    isCardDialogOpen.value = true
    toast.success('Card imported successfully')
  } catch (error) {
    console.error('[AiriCard] Error processing card file:', error)
    toast.error('Error processing card file', {
      description: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Transform cards Map to array for display
const cardsArray = computed<CardItem[]>(() => {
  return Array.from(cards.value.entries()).map(([id, card]) => ({
    id,
    name: card.name || '',
    description: card.description || '',
  }))
})

// Filtered cards based on search query
const filteredCards = computed<CardItem[]>(() => {
  if (!searchQuery.value) return cardsArray.value

  const query = searchQuery.value.toLowerCase()
  return cardsArray.value.filter(
    (item) =>
      item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query)),
  )
})

// Sorted filtered cards based on sort option
const sortedFilteredCards = computed<CardItem[]>(() => {
  const sorted = [...filteredCards.value]

  if (sortOption.value === 'nameAsc') return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  else if (sortOption.value === 'nameDesc') return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
  else if (sortOption.value === 'recent') return sorted.sort((a, b) => (b.id || '').localeCompare(a.id || ''))
  else return sorted
})

// Delete confirmation
const showDeleteConfirm = ref(false)
const cardToDelete = ref<string | null>(null)

function handleDeleteConfirm() {
  if (cardToDelete.value) {
    removeCard(cardToDelete.value)
    cardToDelete.value = null
    showDeleteConfirm.value = false
  }
}

// Card deletion confirmation
function confirmDelete(id: string) {
  cardToDelete.value = id
  showDeleteConfirm.value = true
}

function handleSelectCard(cardId: string) {
  if (!cards.value.has(cardId)) {
    console.error(`Card with id ${cardId} not found`)
    return
  }
  selectedCardId.value = cardId
  isCardDialogOpen.value = true
}

function handleEditCard(cardId: string) {
  if (!cards.value.has(cardId)) {
    console.error(`Card with id ${cardId} not found`)
    return
  }
  editingCardId.value = cardId
  isCardCreationDialogOpen.value = true
}

function handleCardCreationDialog() {
  editingCardId.value = ''
  isCardCreationDialogOpen.value = true
}

/**
 * Export card as JSON file.
 *
 * Call stack:
 *
 * exportCard (index.vue)
 *   -> {@link getCardWithExportedBackground}
 *   -> {@link buildCharaCardV2}
 */
async function exportCard(cardId: string) {
  const card = await getCardWithExportedBackground(cardId)
  if (!card) {
    console.error(`Card with id ${cardId} not found`)
    return
  }

  const json = JSON.stringify(buildCharaCardV2(card))
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const safeName = (card.name || 'airi-card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  anchor.href = url
  anchor.download = `${safeName || 'airi-card'}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// T3.10: getCardWithExportedBackground — get card with background data URL for export
async function getCardWithExportedBackground(cardId: string): Promise<AiriCard | undefined> {
  const card = cards.value.get(cardId)
  if (!card) return

  const activeBackgroundId = card.extensions?.airi?.modules?.activeBackgroundId
  if (!activeBackgroundId || activeBackgroundId === 'none') return card

  const exportBackground = backgroundStore.entries.get(activeBackgroundId)
  if (!exportBackground) return card

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve({
        ...card,
        extensions: {
          ...card.extensions,
          airi: {
            ...card.extensions?.airi,
            modules: {
              ...card.extensions?.airi?.modules,
              activeBackgroundId,
              preferredBackgroundId: activeBackgroundId,
              preferredBackgroundName: exportBackground.title || exportBackground.id,
              preferredBackgroundDataUrl: e.target?.result as string,
            },
          },
        },
      } as AiriCard)
    }
    reader.onerror = () => resolve(card)
    if (!exportBackground?.blob) {
      resolve(card)
      return
    }
    reader.readAsDataURL(exportBackground.blob)
  })
}

// T3.14: composeCardExportPng — compose framed PNG canvas from card preview image
async function composeCardExportPng(previewImage: string): Promise<Uint8Array> {
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const [preview, frame] = await Promise.all([loadImageElement(previewImage), loadImageElement(cardExportFrameUrl)])

  const canvas = document.createElement('canvas')
  canvas.width = CARD_EXPORT_FRAME.width
  canvas.height = CARD_EXPORT_FRAME.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Failed to create export canvas')

  const scale = CARD_EXPORT_FRAME.innerWidth / preview.naturalWidth
  const drawWidth = CARD_EXPORT_FRAME.innerWidth
  const drawHeight = preview.naturalHeight * scale

  context.save()
  context.beginPath()
  context.rect(
    CARD_EXPORT_FRAME.innerX,
    CARD_EXPORT_FRAME.innerY,
    CARD_EXPORT_FRAME.innerWidth,
    CARD_EXPORT_FRAME.innerHeight,
  )
  context.clip()
  context.drawImage(preview, CARD_EXPORT_FRAME.innerX, CARD_EXPORT_FRAME.innerY, drawWidth, drawHeight)
  context.restore()

  context.drawImage(frame, 0, 0, CARD_EXPORT_FRAME.width, CARD_EXPORT_FRAME.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error('Failed to encode composed PNG'))
    }, 'image/png')
  })

  return new Uint8Array(await blob.arrayBuffer())
}

// T3.15: exportCardPng — full PNG export pipeline
async function exportCardPng(cardId: string) {
  const card = await getCardWithExportedBackground(cardId)
  if (!card) {
    console.error(`Card with id ${cardId} not found`)
    return
  }

  const displayModelId = cardStore.getCardDisplayModelId(cardId)
  await displayModelsStore.loadDisplayModelsFromIndexedDB()
  const previewModel = displayModelId ? await displayModelsStore.getDisplayModel(displayModelId) : null
  if (!previewModel) return

  const previewImage = previewModel.previewImage
  if (!previewImage) {
    console.error('No preview image available for card PNG export')
    return
  }

  const pngBytes = await composeCardExportPng(previewImage)
  const metadata = utf8ToBase64(JSON.stringify(buildCharaCardV2(card)))
  const encodedPng = injectPngTextChunk(pngBytes as Uint8Array, 'chara', metadata)

  const blob = new Blob([encodedPng as BlobPart], { type: 'image/png' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const safeName = (card.name || 'airi-card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  anchor.href = url
  anchor.download = `${safeName || 'airi-card'}.png`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// Card activation
async function activateCard(id: string) {
  activeCardId.value = id
  const artistryStore = useArtistryStore()
  artistryStore.resetState()
}

// Clear editing state when creation/edit dialog closes
watch(isCardCreationDialogOpen, (isOpen) => {
  if (!isOpen) {
    editingCardId.value = ''
  }
})

// Card version number
function getVersionNumber(id: string) {
  const card = cards.value.get(id)
  return card?.version || '1.0.0'
}

// Card module short name
function getModuleShortName(id: string, module: 'consciousness' | 'voice') {
  const card = cards.value.get(id)
  if (!card || !card.extensions?.airi?.modules) return 'default'

  const airiExt = card.extensions.airi.modules

  if (module === 'consciousness') {
    return airiExt.consciousness?.model ? airiExt.consciousness.model.split('-').pop() || 'default' : 'default'
  } else if (module === 'voice') {
    return airiExt.speech?.voice_id || 'default'
  }

  return 'default'
}

// Get display model ID for flip preview
function getDisplayModelId(id: string) {
  return cardStore.getCardDisplayModelId(id)
}
</script>

<template>
  <div rounded-xl p-4 flex="~ col gap-4">
    <!-- Toolbar with search and filters -->
    <div flex="~ row" flex-wrap items-center justify-between gap-4>
      <!-- Search bar -->
      <div class="relative min-w-[200px] flex-1" inline-flex="~" w-full items-center>
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <div i-solar:magnifer-line-duotone class="text-neutral-500 dark:text-neutral-400" />
        </div>
        <input
          v-model="searchQuery"
          type="search"
          class="w-full rounded-xl p-2.5 pl-10 text-sm outline-none"
          border="focus:primary-100 dark:focus:primary-400/50 2 solid neutral-200 dark:neutral-800"
          transition="all duration-200 ease-in-out"
          bg="white dark:neutral-900"
          :placeholder="t('settings.pages.card.search')"
        />
      </div>

      <!-- Sort options -->
      <div class="relative flex flex-row justify-start gap-2 lg:flex-col">
        <div
          class="top-[-32px] whitespace-nowrap text-sm text-neutral-500 leading-10 lg:absolute dark:text-neutral-400"
        >
          {{ t('settings.pages.card.sort_by') }}:
        </div>
        <Select
          v-model="sortOption"
          :options="[
            { value: 'nameAsc', label: t('settings.pages.card.name_asc') },
            { value: 'nameDesc', label: t('settings.pages.card.name_desc') },
            { value: 'recent', label: t('settings.pages.card.recent') },
          ]"
          placeholder="Select sort option"
          class="min-w-[150px]"
        />
      </div>
    </div>

    <!-- Masonry card layout -->
    <div
      class="mt-4"
      :class="{
        'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 grid-auto-rows-[minmax(min-content,max-content)] grid-auto-flow-dense sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-5 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]':
          cards.size > 0,
      }"
    >
      <!-- Upload card -->
      <InputFile v-model="inputFiles" accept=".json,.png" class="h-[280px]">
        <template #default="{ isDragging }">
          <template v-if="!isDragging">
            <div flex flex-col items-center>
              <div i-solar:upload-square-line-duotone mb-4 text-5xl text="neutral-400 dark:neutral-500" />
              <p font-medium text="neutral-600 dark:neutral-300">Import Card</p>
              <p text="neutral-500 dark:neutral-400" mt-2 text-sm>
                Import AIRI JSON or SillyTavern / chara_card_v2 PNG cards
              </p>
            </div>
          </template>
          <template v-else>
            <div flex flex-col items-center>
              <div i-solar:upload-minimalistic-bold class="mb-2 text-5xl text-primary-500 dark:text-primary-400" />
              <p font-medium text="primary-600 dark:primary-300">
                {{ t('settings.pages.card.drop_here') }}
              </p>
            </div>
          </template>
        </template>
      </InputFile>

      <!-- Create card -->
      <CardCreate class="h-[280px]" @click="handleCardCreationDialog" />

      <!-- Card Items -->
      <template v-if="cards.size > 0">
        <CardListItem
          v-for="item in sortedFilteredCards"
          :id="item.id"
          :key="item.id"
          :name="item.name"
          :description="item.description"
          :is-active="item.id === activeCardId"
          :is-selected="item.id === selectedCardId && isCardDialogOpen"
          :version="getVersionNumber(item.id)"
          :consciousness-model="getModuleShortName(item.id, 'consciousness')"
          :voice-model="getModuleShortName(item.id, 'voice')"
          :display-model-id="getDisplayModelId(item.id)"
          @select="handleSelectCard(item.id)"
          @activate="activateCard(item.id)"
          @delete="confirmDelete(item.id)"
          @edit="handleEditCard(item.id)"
          @export-json="exportCard(item.id)"
          @export-png="exportCardPng(item.id)"
        />
      </template>

      <!-- No cards message -->
      <div
        v-if="cards.size === 0"
        class="col-span-full rounded-xl p-8 text-center"
        border="~ neutral-200/50 dark:neutral-700/30"
        bg="neutral-50/50 dark:neutral-900/50"
      >
        <div i-solar:card-search-broken mx-auto mb-3 text-6xl text-neutral-400 />
        <p>{{ t('settings.pages.card.no_cards') }}</p>
      </div>

      <!-- No search results -->
      <Alert v-if="searchQuery && sortedFilteredCards.length === 0" type="warning">
        <template #title>
          {{ t('settings.pages.card.no_results') }}
        </template>
        <template #content>
          {{ t('settings.pages.card.try_different_search') }}
        </template>
      </Alert>
    </div>
  </div>

  <!-- Delete confirmation dialog -->
  <DeleteCardDialog
    v-model="showDeleteConfirm"
    :card-name="cardToDelete ? cardStore.getCard(cardToDelete)?.name : ''"
    @confirm="handleDeleteConfirm"
    @cancel="cardToDelete = null"
  />

  <!-- Card detail dialog -->
  <CardDetailDialog v-model="isCardDialogOpen" :card-id="selectedCardId" :initial-tab="initialTab" />

  <!-- Card creation/edit dialog -->
  <CardCreationDialog v-model="isCardCreationDialogOpen" :card-id="editingCardId" />

  <!-- Card import wizard dialog -->
  <CardImportWizard v-model="isImportWizardOpen" :card-data="importedCardData" @imported="handleSelectCard" />

  <!-- Card browser slide-over webview drawer (Only renders if running in Electron) -->
  <div
    v-if="isElectron"
    :class="[
      'fixed inset-y-0 right-0 z-50 w-[70vw] border-l border-neutral-200 bg-white/95 shadow-2xl transition-transform duration-500 ease-in-out backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/95',
      activeBrowserSource ? 'translate-x-0' : 'translate-x-full',
    ]"
  >
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div class="flex items-center gap-3">
          <h3 class="text-lg text-neutral-800 font-bold dark:text-neutral-200">
            Browse {{ activeBrowserSource?.name }}
          </h3>
          <span class="rounded bg-primary-500/10 px-2 py-0.5 text-xs text-primary-500 font-medium">
            Electron Webview
          </span>
        </div>
        <Button
          variant="ghost"
          icon="i-solar:close-square-bold-duotone"
          label="Close"
          @click="activeBrowserSource = null"
        />
      </div>
      <div class="flex-1 bg-white dark:bg-neutral-950">
        <webview v-if="activeBrowserSource" :src="activeBrowserSource.url" class="h-full w-full" allowpopups />
      </div>
    </div>
  </div>

  <!-- Background decoration -->
  <div
    v-motion
    text="neutral-200/50 dark:neutral-600/20"
    pointer-events-none
    fixed
    top="[calc(100dvh-15rem)]"
    bottom-0
    right--5
    z--1
    :initial="{ scale: 0.9, opacity: 0, x: 20 }"
    :enter="{ scale: 1, opacity: 1, x: 0 }"
    :duration="500"
    size-60
    flex
    items-center
    justify-center
  >
    <div text="60" i-solar:emoji-funny-square-bold-duotone />
  </div>

  <div :class="['mt-8 rounded-2xl border border-primary-500/10 bg-primary-500/5 p-5', 'flex flex-col gap-4']">
    <div :class="['flex items-start gap-3']">
      <div :class="['i-solar:compass-bold-duotone text-2xl text-primary-500']" />
      <div :class="['flex flex-col gap-1']">
        <div :class="['text-lg font-bold']">Find More Cards</div>
        <div :class="['max-w-3xl text-sm opacity-80']">
          AIRI can import standard SillyTavern-style character cards, including `chara_card_v2` PNG exports. Imported
          cards are a strong starting point, but they usually will not fill in AIRI-specific fields automatically.
        </div>
        <div :class="['max-w-3xl text-sm opacity-70']">
          After import, review and customize AIRI-only settings, especially the
          <strong>Acting</strong>
          tab, so expressions, speech tags, and motion cues actually line up with your current VRM or Live2D model.
        </div>
      </div>
    </div>

    <div :class="['grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4']">
      <component
        :is="isElectron ? 'button' : 'a'"
        v-for="source in cardSourceLinks"
        :key="source.name"
        :href="isElectron ? undefined : source.url"
        :target="isElectron ? undefined : '_blank'"
        :rel="isElectron ? undefined : 'noopener noreferrer'"
        :class="[
          'group rounded-xl border border-transparent bg-white/70 p-4 text-left transition-all dark:bg-neutral-900/60',
          'hover:border-primary-500/40 hover:shadow-md',
          'flex flex-col gap-2 w-full',
        ]"
        @click="isElectron ? (activeBrowserSource = source) : null"
      >
        <div :class="['flex items-center justify-between gap-2']">
          <div :class="['font-bold group-hover:text-primary-500 transition-colors']">
            {{ source.name }}
          </div>
          <div :class="['i-solar:share-circle-bold-duotone text-primary-500 opacity-70']" />
        </div>
        <div :class="['text-sm opacity-75']">
          {{ source.description }}
        </div>
      </component>
    </div>

    <div :class="['text-xs opacity-60']">
      Prefer exports explicitly labeled for SillyTavern, `chara_card_v2`, or ST PNG / JSON compatibility. Not every
      character site exports in a portable format.
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.card.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.card.description
  icon: i-solar:emoji-funny-square-bold-duotone
  settingsEntry: true
  order: 1
  stageTransition:
    name: slide
</route>
