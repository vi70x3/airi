import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useDisplayModelsStore } from '@proj-airi/stage-ui/stores/display-models'
import { useBackgroundStore } from '@proj-airi/stage-ui/stores/background'
import { useArtistryStore } from '@proj-airi/stage-ui/stores/modules/artistry'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useSpeechStore } from '@proj-airi/stage-ui/stores/modules/speech'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'
import { useSettingsStageModel } from '@proj-airi/stage-ui/stores/settings/stage-model'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Card, ccv3 } from '@proj-airi/ccc'

// State that mirrors the card-index page's state
export const importedCardData = ref<any>(null)
export const activeBrowserSource = ref<any>(null)
export const isImportWizardOpen = ref(false)

type ImportedCardPayload = Card | ccv3.CharacterCardV3

// We also need the stores and other refs that the handler uses
// We'll create a function that returns the handler and the state, so the component can use the same state
export function useCharaCardHandler() {
  const cardStore = useAiriCardStore()
  const displayModelsStore = useDisplayModelsStore()
  const backgroundStore = useBackgroundStore()
  const artistryStore = useArtistryStore()
  const consciousnessStore = useConsciousnessStore()
  const speechStore = useSpeechStore()
  const providersStore = useProvidersStore()
  const stageModelStore = useSettingsStageModel()

  const { addCard, removeCard } = cardStore
  const { cards, activeCardId } = storeToRefs(cardStore)
  const { activeExpressions } = storeToRefs(consciousnessStore)
  const { stageModelSelected } = storeToRefs(stageModelStore)
  const backgroundStoreInstance = useBackgroundStore()
  const { displayModels } = storeToRefs(displayModelsStore)
  const { activeProvider: consciousnessProvider, activeModel: defaultConsciousnessModel } =
    storeToRefs(consciousnessStore)
  const {
    activeSpeechProvider: speechProvider,
    activeSpeechModel: defaultSpeechModel,
    activeSpeechVoiceId: defaultSpeechVoiceId,
  } = storeToRefs(speechStore)
  const { stageModelSelected: defaultDisplayModelId } = storeToRefs(stageModelStore)

  // Form states (we don't need to expose these as they are internal to the wizard)
  // But we need to mimic the wizard's state? Actually, the handler only sets importedCardData and opens the wizard.
  // The wizard itself will handle the form.

  // Helper functions (copied from the card-index page)
  function parsePngCharaPayload(buffer: ArrayBuffer): ImportedCardPayload {
    // TODO: implement
    throw new Error('parsePngCharaPayload not implemented')
  }

  function parseImportedCard(content: string): ImportedCardPayload {
    // TODO: implement
    throw new Error('parseImportedCard not implemented')
  }

  function addCardPreviewNormalize(card: any): ImportedCardPayload {
    // TODO: implement
    throw new Error('addCardPreviewNormalize not implemented')
  }

  // The handler function
  async function handleCharaCardDownloaded(payload: { base64Data: string; filename: string; ext: string }) {
    try {
      const rawData = atob(payload.base64Data)
      const arrayBuffer = new ArrayBuffer(rawData.length)
      const view = new Uint8Array(arrayBuffer)
      for (let i = 0; i < rawData.length; i++) {
        view[i] = rawData.charCodeAt(i)
      }

      let importedCard: ImportedCardPayload

      if (payload.ext === 'png') {
        importedCard = parsePngCharaPayload(arrayBuffer)
      } else {
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(arrayBuffer)
        importedCard = parseImportedCard(text)
      }

      const normalized = addCardPreviewNormalize(importedCard)
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

  return {
    // State
    importedCardData,
    activeBrowserSource,
    isImportWizardOpen,
    // Handler
    handleCharaCardDownloaded,
    // Stores and other refs if needed by the component
    cardStore,
    displayModelsStore,
    backgroundStore,
    artistryStore,
    consciousnessStore,
    speechStore,
    providersStore,
    stageModelStore,
    addCard,
    removeCard,
    cards,
    activeCardId,
    activeExpressions,
    stageModelSelected,
    backgroundStoreInstance,
    displayModels,
    consciousnessProvider,
    defaultConsciousnessModel,
    speechProvider,
    defaultSpeechModel,
    defaultSpeechVoiceId,
    defaultDisplayModelId,
  }
}
