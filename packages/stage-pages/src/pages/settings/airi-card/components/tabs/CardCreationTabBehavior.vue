<script setup lang="ts">
import { FieldValues } from '@proj-airi/ui'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (e: 'sparkle-click', fieldId: string): void
}>()
const cardPersonality = defineModel<string>('cardPersonality', { required: true })
const cardScenario = defineModel<string>('cardScenario', { required: true })
const cardGreetings = defineModel<string[]>('cardGreetings', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="tab-content ml-auto mr-auto w-95%">
    <div class="input-list ml-auto mr-auto w-90% flex flex-row flex-wrap justify-center gap-8">
      <div class="max-w-full">
        <label class="flex flex-col gap-4">
          <div>
            <div class="flex items-center gap-1 text-sm font-medium">
              {{ t('settings.pages.card.personality') }}
              <span class="text-red-500">*</span>
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ t('settings.pages.card.creation.fields_info.personality') }}
            </div>
          </div>
          <div class="relative w-full">
            <textarea
              v-model="cardPersonality"
              rows="6"
              :placeholder="t('settings.pages.card.personality')"
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
              @click.prevent="emit('sparkle-click', 'personality')"
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

      <div class="max-w-full">
        <label class="flex flex-col gap-4">
          <div>
            <div class="flex items-center gap-1 text-sm font-medium">
              {{ t('settings.pages.card.scenario') }}
              <span class="text-red-500">*</span>
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ t('settings.pages.card.creation.fields_info.scenario') }}
            </div>
          </div>
          <div class="relative w-full">
            <textarea
              v-model="cardScenario"
              rows="6"
              :placeholder="t('settings.pages.card.scenario')"
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
              @click.prevent="emit('sparkle-click', 'scenario')"
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

      <div class="max-w-full">
        <FieldValues
          v-model="cardGreetings"
          :label="t('settings.pages.card.creation.greetings')"
          :description="t('settings.pages.card.creation.fields_info.greetings')"
        >
          <template #label>
            <div class="flex items-center gap-2">
              <span>{{ t('settings.pages.card.creation.greetings') }}</span>
              <button
                type="button"
                style="
                  display: inline-flex;
                  height: 24px;
                  width: 24px;
                  align-items: center;
                  justify-content: center;
                  border-radius: 6px;
                  border: none;
                  cursor: pointer;
                  background: transparent;
                "
                class="text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:hover:bg-neutral-800 dark:hover:text-primary-400"
                :aria-label="t('settings.pages.card.creation.sparkle.generate_with_ai')"
                title="Generate with AI"
                @click.prevent="emit('sparkle-click', 'greetings')"
              >
                <span
                  i-ph:sparkle
                  class="i-ph:sparkle animate-pulse text-sm"
                  style="display: inline-block; width: 1.2em; height: 1.2em"
                />
              </button>
            </div>
          </template>
        </FieldValues>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-list > * {
  min-width: 45%;
}

@media (max-width: 641px) {
  .input-list * {
    min-width: unset;
    width: 100%;
  }
}
</style>
