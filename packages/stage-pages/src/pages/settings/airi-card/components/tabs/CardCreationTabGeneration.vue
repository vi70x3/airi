<script setup lang="ts">
import { FieldCheckbox, FieldInput, FieldTextArea, Select } from '@proj-airi/ui'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  providerOptions: { value: string; label: string }[]
  modelOptions: { value: string; label: string }[]
  providerPlaceholder: string
  modelPlaceholder: string
}>()

const emit = defineEmits<{
  (e: 'sparkle-click', fieldId: string): void
}>()

const generationEnabled = defineModel<boolean>('generationEnabled', { required: true })
const generationProvider = defineModel<string>('generationProvider', { required: true })
const generationModel = defineModel<string>('generationModel', { required: true })
const generationMaxTokens = defineModel<number | undefined>('generationMaxTokens', { required: true })
const generationTemperature = defineModel<number | undefined>('generationTemperature', { required: true })
const generationTopP = defineModel<number | undefined>('generationTopP', { required: true })
const generationContextWidth = defineModel<number | undefined>('generationContextWidth', { required: true })
const generationAdvancedJson = defineModel<string>('generationAdvancedJson', { required: true })
const generationReasoningFallback = defineModel<boolean>('generationReasoningFallback', { required: true })
const cardPostHistoryInstructions = defineModel<string>('cardPostHistoryInstructions', { required: true })
const compactionStrategy = defineModel<string>('compactionStrategy', { required: true })
const compactionMinKeepTurns = defineModel<number | undefined>('compactionMinKeepTurns', { required: true })
const { t } = useI18n()

function updateGlobalContextMap() {
  if (!generationContextWidth.value || !generationProvider.value || !generationModel.value) return

  try {
    const rawMap = localStorage.getItem('airi:context-width-map')
    const map = rawMap ? JSON.parse(rawMap) : {}

    if (!map[generationProvider.value]) {
      map[generationProvider.value] = {}
    }

    map[generationProvider.value][generationModel.value] = generationContextWidth.value
    localStorage.setItem('airi:context-width-map', JSON.stringify(map))
  } catch (err) {
    console.error('[CardCreationTabGeneration] Failed to update global context map:', err)
  }
}

watch([generationContextWidth, generationProvider, generationModel], () => {
  updateGlobalContextMap()
})
</script>

<template>
  <div class="tab-content ml-auto mr-auto w-95%">
    <p class="mb-3">
      Tune per-character response generation without changing the rest of the app. This first pass focuses on the most
      common chat controls and saves them with the AIRI card.
    </p>

    <div
      class="mx-auto mb-6 w-90% border border-amber-200 rounded-xl bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      Keys that work for one provider or model may be ignored or rejected by another. Start simple, and treat these as
      character-specific generation defaults rather than guaranteed cross-provider behavior.
    </div>

    <div class="mx-auto mb-6 w-90% flex flex-col gap-4">
      <FieldCheckbox
        v-model="generationEnabled"
        label="Use character-specific generation settings"
        description="When disabled, this card inherits the global chat generation defaults."
      />
      <FieldCheckbox
        v-model="generationReasoningFallback"
        label="Fall back to reasoning on empty speech"
        description="If the model outputs everything inside reasoning tags (leaving speech empty), use the reasoning text as the spoken content."
        :disabled="!generationEnabled"
      />
    </div>

    <div
      class="input-list ml-auto mr-auto w-90% flex flex-row flex-wrap justify-start gap-8"
      :class="[!generationEnabled ? 'pointer-events-none opacity-50' : '']"
    >
      <div class="field-block">
        <label class="mb-2 flex flex-row items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <div i-lucide:brain />
          Provider
        </label>
        <Select
          v-model="generationProvider"
          :options="providerOptions"
          :placeholder="providerPlaceholder"
          class="w-full"
        />
      </div>

      <div class="field-block">
        <label class="mb-2 flex flex-row items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <div i-lucide:ghost />
          Model
        </label>
        <Select v-model="generationModel" :options="modelOptions" :placeholder="modelPlaceholder" class="w-full" />
      </div>

      <FieldInput
        v-model="generationMaxTokens"
        class="field-block"
        label="Max Tokens"
        description="Cap the model's reply length for this character."
        type="number"
        placeholder="500"
      />

      <FieldInput
        v-model="generationTemperature"
        class="field-block"
        label="Temperature"
        description="Higher values are more random; lower values are more deterministic."
        type="number"
        placeholder="0.8"
      />

      <FieldInput
        v-model="generationTopP"
        class="field-block"
        label="Top P"
        description="Nucleus sampling cutoff for this character's replies."
        type="number"
        placeholder="0.9"
      />

      <FieldInput
        v-model="generationContextWidth"
        class="field-block"
        label="Context Width (Compaction Threshold)"
        description="The token threshold that triggers history compaction and drives the visual context meter."
        type="number"
        placeholder="4096"
      />

      <div class="field-block">
        <label class="mb-2 flex flex-row items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <div i-solar:tuning-square-bold-duotone />
          Compaction Strategy
        </label>
        <Select
          v-model="compactionStrategy"
          :options="[
            { value: 'none', label: 'None (Disabled)' },
            { value: 'prune', label: 'Prune History Only' },
            { value: 'distill', label: 'Distill & Summarize (Premium)' },
          ]"
          class="w-full"
        />
      </div>

      <FieldInput
        v-model="compactionMinKeepTurns"
        class="field-block"
        label="Compaction Preservation Window"
        description="The number of recent messages to always keep un-compacted."
        type="number"
        placeholder="15"
      />

      <div class="advanced-block">
        <label class="flex flex-col gap-4">
          <div>
            <div class="flex items-center gap-1 text-sm font-medium">
              {{ t('settings.pages.card.posthistoryinstructions') }}
              <span class="text-red-500">*</span>
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ t('settings.pages.card.creation.fields_info.posthistoryinstructions') }}
            </div>
          </div>
          <div class="relative w-full">
            <textarea
              v-model="cardPostHistoryInstructions"
              rows="6"
              :placeholder="t('settings.pages.card.posthistoryinstructions')"
              class="focus:primary-300 dark:focus:primary-400/50 text-disabled:neutral-400 dark:text-disabled:neutral-600 cursor-disabled:not-allowed w-full border-2 border-neutral-100 rounded-lg border-solid bg-neutral-50 py-1.5 pl-2 pr-9 text-sm shadow-sm outline-none transition-all duration-200 ease-in-out dark:border-neutral-900 dark:bg-neutral-950 focus:bg-neutral-50 dark:focus:bg-neutral-900"
            />
            <button
              type="button"
              style="
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 50;
                display: flex;
                height: 32px;
                width: 32px;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                background: transparent;
              "
              class="text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-800 dark:hover:text-primary-400"
              :aria-label="t('settings.pages.card.creation.sparkle.optimize_with_ai')"
              title="Optimize with AI"
              @click.prevent="emit('sparkle-click', 'postHistoryInstructions')"
            >
              <span
                i-ph:sparkle
                class="i-ph:sparkle animate-pulse text-lg"
                style="display: inline-block; width: 1.2em; height: 1.2em"
              />
            </button>
          </div>
        </label>
      </div>

      <FieldTextArea
        v-model="generationAdvancedJson"
        class="advanced-block"
        label="Advanced JSON"
        description="Optional raw request fields for provider-specific tuning. These keys are merged into the outbound request when Generation is enabled."
        placeholder='{&#10;  "thinking": { "type": "disabled" }&#10;}'
        :rows="8"
      />
    </div>
  </div>
</template>

<style scoped>
.input-list > * {
  min-width: 45%;
}

.field-block {
  width: 45%;
}

.advanced-block {
  width: 100%;
}

@media (max-width: 641px) {
  .input-list > * {
    min-width: unset;
    width: 100%;
  }

  .field-block {
    width: 100%;
  }
}
</style>
