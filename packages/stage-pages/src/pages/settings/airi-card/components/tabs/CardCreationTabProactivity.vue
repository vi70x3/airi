<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  sensorPayload?: string
  staticSamplePayload: string
}>()
const emit = defineEmits<{
  (e: 'sparkle-click', fieldId: string): void
}>()

const { t } = useI18n()
const heartbeatsEnabled = defineModel<boolean>('heartbeatsEnabled', { required: true })
const heartbeatsIntervalMinutes = defineModel<number>('heartbeatsIntervalMinutes', { required: true })
const heartbeatsPrompt = defineModel<string>('heartbeatsPrompt', { required: true })
const heartbeatsInjectIntoPrompt = defineModel<boolean>('heartbeatsInjectIntoPrompt', { required: true })
const heartbeatsUseAsLocalGate = defineModel<boolean>('heartbeatsUseAsLocalGate', { required: true })
const heartbeatsScheduleStart = defineModel<string>('heartbeatsScheduleStart', { required: true })
const heartbeatsScheduleEnd = defineModel<string>('heartbeatsScheduleEnd', { required: true })
const heartbeatsContextWindowHistory = defineModel<boolean>('heartbeatsContextWindowHistory', { required: true })
const heartbeatsContextSystemLoad = defineModel<boolean>('heartbeatsContextSystemLoad', { required: true })
const heartbeatsContextUsageMetrics = defineModel<boolean>('heartbeatsContextUsageMetrics', { required: true })
const heartbeatsRespectSchedule = defineModel<boolean>('heartbeatsRespectSchedule', { required: true })
const dreamStateEnabled = defineModel<boolean>('dreamStateEnabled', { required: true })
const dreamStateStrictAfkGating = defineModel<boolean>('dreamStateStrictAfkGating', { required: true })
const groundingEnabled = defineModel<boolean>('groundingEnabled', { required: true })
</script>

<template>
  <div class="tab-content ml-auto mr-auto w-95%">
    <p class="mb-3 text-sm text-neutral-500">
      Configure how often AIRI will proactively speak to you without being prompted.
    </p>
    <div class="input-list ml-auto mr-auto w-90% flex flex-col flex-wrap justify-center gap-6">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <input
            id="heartbeats-enabled"
            v-model="heartbeatsEnabled"
            type="checkbox"
            class="h-4 w-4 border-gray-300 rounded text-primary-600"
          />
          <label for="heartbeats-enabled" class="font-medium">Enable Proactive Heartbeats</label>
        </div>

        <div
          v-if="heartbeatsEnabled"
          class="grid grid-cols-1 ml-6 gap-4 border-l-2 border-neutral-100 pl-4 sm:grid-cols-2 dark:border-neutral-700"
        >
          <div class="flex flex-col gap-2">
            <label class="text-sm text-neutral-700 font-medium dark:text-neutral-300">Interval (Minutes)</label>
            <input
              v-model="heartbeatsIntervalMinutes"
              type="number"
              min="1"
              max="1440"
              class="border border-neutral-200 rounded-lg bg-transparent px-3 py-2 dark:border-neutral-700"
            />
            <span class="text-xs text-neutral-500">How often to tick the heartbeat polling.</span>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm text-neutral-700 font-medium dark:text-neutral-300">Schedule Options</label>
            <div class="flex items-center gap-2">
              <input
                v-model="heartbeatsScheduleStart"
                type="time"
                class="flex-1 border border-neutral-200 rounded-lg bg-transparent px-2 py-1 dark:border-neutral-700"
              />
              <span>to</span>
              <input
                v-model="heartbeatsScheduleEnd"
                type="time"
                class="flex-1 border border-neutral-200 rounded-lg bg-transparent px-2 py-1 dark:border-neutral-700"
              />
            </div>
            <div class="mt-1 flex items-center gap-2">
              <input
                id="heartbeats-respectSchedule"
                v-model="heartbeatsRespectSchedule"
                type="checkbox"
                class="h-4 w-4 border-gray-300 rounded text-primary-600"
              />
              <label for="heartbeats-respectSchedule" class="text-xs text-neutral-500">
                Only trigger heartbeats between these hours.
              </label>
            </div>
          </div>

          <div class="col-span-1 mt-2 flex items-center gap-2 sm:col-span-2">
            <input id="heartbeats-localGate" v-model="heartbeatsUseAsLocalGate" type="checkbox" class="h-4 w-4" />
            <label for="heartbeats-localGate" class="text-sm text-neutral-700 font-medium dark:text-neutral-300">
              Require Keyboard/Mouse Inactivity
            </label>
          </div>
          <span class="col-span-1 pl-6 text-xs text-neutral-500 sm:col-span-2">
            Only trigger the LLM if the user is currently idle (mouse/keyboard).
          </span>

          <div class="col-span-1 mt-2 flex items-center gap-2 sm:col-span-2">
            <input
              id="dream-state-enabled"
              v-model="dreamStateEnabled"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary-600"
            />
            <label for="dream-state-enabled" class="text-sm text-neutral-700 font-medium dark:text-neutral-300">
              Enable Dream State
            </label>
          </div>
          <span class="col-span-1 pl-6 text-xs text-neutral-500 sm:col-span-2">
            Allows idle-time memory consolidation to generate chips for this character.
          </span>

          <div class="col-span-1 mt-2 flex items-center gap-2 sm:col-span-2">
            <input
              id="dream-state-afk"
              v-model="dreamStateStrictAfkGating"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary-600"
            />
            <label for="dream-state-afk" class="text-sm text-neutral-700 font-medium dark:text-neutral-300">
              Strict AFK Gating (Dream State)
            </label>
          </div>
          <span class="col-span-1 pl-6 text-xs text-neutral-500 sm:col-span-2">
            Only allow Dream State synthesis once the user has been away long enough.
          </span>

          <div class="col-span-1 mt-2 max-w-full sm:col-span-2">
            <label class="flex flex-col gap-4">
              <div>
                <div class="flex items-center gap-1 text-sm font-medium">Stealth Heartbeat Prompt</div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  The hidden instruction sent to the LLM during a heartbeat tick.
                </div>
              </div>
              <div class="relative w-full">
                <textarea
                  v-model="heartbeatsPrompt"
                  rows="6"
                  placeholder="You are evaluating a proactive heartbeat. Provide a fun comment, or output NO_REPLY to remain silent."
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
                  @click.prevent="emit('sparkle-click', 'heartbeatsPrompt')"
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
        </div>
      </div>

      <div class="flex flex-col gap-1 border-l-2 border-neutral-100 pl-4 dark:border-neutral-700">
        <div class="flex items-center gap-2">
          <input
            id="grounding-enabled"
            v-model="groundingEnabled"
            type="checkbox"
            class="h-4 w-4 border-gray-300 rounded text-primary-600"
          />
          <label for="grounding-enabled" class="text-sm text-neutral-700 font-semibold dark:text-neutral-300">
            Attach sensor data with each message
          </label>
        </div>
        <span class="text-xs text-neutral-500">
          Injects real-time context into every manual chat message. Linked to the chatbox toggle.
        </span>
      </div>

      <!-- Situational Awareness / Rich Context -->
      <div class="flex flex-col gap-2 border-l-2 border-neutral-100 pl-4 dark:border-neutral-700">
        <div class="flex items-center gap-2">
          <input id="heartbeats-injectContext" v-model="heartbeatsInjectIntoPrompt" type="checkbox" class="h-4 w-4" />
          <label
            for="heartbeats-injectContext"
            class="group relative flex items-center gap-1 text-sm font-semibold dark:text-neutral-200"
          >
            Situational Awareness (Rich Context)
            <TooltipProvider :delay-duration="0">
              <TooltipRoot>
                <TooltipTrigger as-child>
                  <div i-lucide:info class="h-4 w-4 cursor-help text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent
                  class="z-110 max-w-sm animate-fadeIn animate-duration-200 rounded-lg bg-neutral-900 p-3 text-xs text-white shadow-xl"
                  :side-offset="8"
                  side="right"
                >
                  <p class="mb-2 border-b border-white/20 pb-1 text-primary-400 font-bold">Current Sensor Payload:</p>
                  <pre class="max-h-60 overflow-y-auto whitespace-pre-wrap font-mono opacity-90">{{
                    sensorPayload || staticSamplePayload
                  }}</pre>
                  <TooltipArrow class="fill-neutral-900" />
                </TooltipContent>
              </TooltipRoot>
            </TooltipProvider>
          </label>
        </div>
        <span class="text-xs text-neutral-500">
          Enable real-time sensor polling (Idle time, active window, system load) for proactivity and manual grounding.
        </span>

        <div v-if="heartbeatsInjectIntoPrompt" class="grid grid-cols-1 ml-6 mt-2 gap-2 sm:grid-cols-3">
          <div class="flex items-center gap-2">
            <input id="ctx-window" v-model="heartbeatsContextWindowHistory" type="checkbox" class="h-3.5 w-3.5" />
            <label for="ctx-window" class="text-xs text-neutral-600 dark:text-neutral-400">Window History</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="ctx-load" v-model="heartbeatsContextSystemLoad" type="checkbox" class="h-3.5 w-3.5" />
            <label for="ctx-load" class="text-xs text-neutral-600 dark:text-neutral-400">System Load</label>
          </div>
          <div class="flex items-center gap-2">
            <input id="ctx-metrics" v-model="heartbeatsContextUsageMetrics" type="checkbox" class="h-3.5 w-3.5" />
            <label for="ctx-metrics" class="text-xs text-neutral-600 dark:text-neutral-400">Usage Metrics</label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
