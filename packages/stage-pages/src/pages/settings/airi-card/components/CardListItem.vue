<script setup lang="ts">
import { CharacterAvatar, CursorFloating } from '@proj-airi/stage-ui/components'
import { Button } from '@proj-airi/ui'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

defineProps<Props>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'activate'): void
  (e: 'delete'): void
  (e: 'edit'): void
  (e: 'export-json'): void
  (e: 'export-png'): void
}>()

interface Props {
  id: string
  name: string
  description?: string
  isActive: boolean
  isSelected: boolean
  version: string
  consciousnessModel: string
  voiceModel: string
  displayModelId?: string
}
</script>

<template>
  <CursorFloating
    :class="[
      'relative h-[280px] flex flex-col cursor-pointer overflow-hidden rounded-xl transition-all ease-in-out duration-400',
      'group perspective-1000',
      isSelected
        ? 'border-2 border-primary-400 dark:border-primary-600'
        : 'border-2 border-neutral-100 dark:border-neutral-800/25',
      'bg-neutral-200/50 dark:bg-neutral-800/50',
      'drop-shadow-none hover:drop-shadow-[0px_4px_4px_rgba(220,220,220,0.4)] active:drop-shadow-[0px_0px_0px_rgba(220,220,220,0.25)] dark:hover:drop-shadow-none',
      'before:content-empty before:absolute before:inset-0 before:z-0 before:w-1/4 before:h-full before:transition-all before:duration-400 before:ease-in-out before:bg-gradient-to-r before:from-primary-500/0 before:to-primary-500/0 dark:before:from-primary-400/0 dark:before:to-primary-400/0 before:mask-image-[linear-gradient(120deg,white_100%)] before:opacity-0',
      'hover:before:opacity-100 hover:before:bg-gradient-to-r hover:before:from-primary-500/20 hover:before:via-primary-500/10 hover:before:to-transparent dark:hover:before:from-primary-400/20 dark:hover:before:via-primary-400/10 dark:hover:before:to-transparent',
    ]"
    @click="emit('select')"
  >
    <!-- Flip container -->
    <div
      :class="[
        'preserve-3d relative w-full flex-1 min-h-0 flex flex-col transition-transform duration-600 ease-in-out',
        'group-hover:rotate-y-180',
      ]"
    >
      <!-- Front side (Portrait/Square) -->
      <div
        :class="[
          'backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-xl bg-white dark:bg-neutral-900',
        ]"
      >
        <CharacterAvatar
          :card-id="id"
          :name="name"
          :display-model-id="displayModelId"
          shape="square"
          size-class="w-full aspect-square"
          avatar-class="h-full w-full object-cover object-[50%_15%]"
          :use-dynamic-background="true"
        />

        <!-- Name overlay positioned absolute at the bottom of the front container (above toolbar) -->
        <div
          :class="[
            'absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1 z-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent',
          ]"
        >
          <div :class="['flex items-center justify-between']">
            <span :class="['text-sm text-white font-semibold tracking-wide uppercase drop-shadow-sm truncate']">
              {{ name }}
            </span>
            <div v-if="isActive" :class="['rounded-md p-0.5 bg-primary-500/80 text-white']">
              <div i-solar:check-circle-bold-duotone :class="['text-xs']" />
            </div>
          </div>
        </div>
      </div>

      <!-- Back side (Card text details) -->
      <div
        :class="[
          'dark:bg-neutral-900 backface-hidden rotate-y-180 absolute inset-0 flex flex-col overflow-hidden rounded-xl bg-white shadow-xl border-2',
          'border-primary-500/20 dark:border-primary-400/10',
        ]"
      >
        <!-- Card content -->
        <div
          :class="[
            'relative flex flex-col flex-1 justify-between gap-3 overflow-hidden p-5 transition-all duration-400 ease-in-out',
            'after:content-empty after:absolute after:inset-0 after:z--2 after:w-full after:h-full after:bg-dotted-[neutral-200/80] after:bg-size-10px after:mask-image-[linear-gradient(165deg,white_30%,transparent_50%)] after:transition-all after:duration-400 after:ease-in-out',
            'hover:after:bg-dotted-[primary-300/50] dark:hover:after:bg-dotted-[primary-200/20] hover:text-primary-600/80 dark:hover:text-primary-300/80',
          ]"
        >
          <!-- Card header (name and badge) -->
          <div :class="['z-1 flex items-start justify-between gap-2']">
            <h3 :class="['flex-1 truncate text-lg font-normal']">
              {{ name }}
            </h3>
            <div :class="['flex shrink-0 items-center gap-2']">
              <div
                v-if="isActive"
                :class="['rounded-md p-1 bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400']"
              >
                <div i-solar:check-circle-bold-duotone :class="['text-sm']" />
              </div>
            </div>
          </div>

          <!-- Card description -->
          <p
            v-if="description"
            :class="['line-clamp-6 min-h-40px flex-1 text-sm text-neutral-500 dark:text-neutral-400']"
          >
            {{ description }}
          </p>
          <p v-else :class="['flex-1 text-sm italic text-neutral-400 dark:text-neutral-500']">
            No description provided.
          </p>

          <!-- Card stats -->
          <div :class="['z-1 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400']">
            <div>v{{ version }}</div>
            <div :class="['flex items-center gap-1.5']">
              <div :class="['flex items-center gap-0.5']">
                <div i-lucide:ghost :class="['text-xs']" />
                <span>{{ consciousnessModel }}</span>
              </div>
              <div :class="['flex items-center gap-0.5']">
                <div i-lucide:mic :class="['text-xs']" />
                <span>{{ voiceModel }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Actions Toolbar (outside flip) -->
    <div
      :class="[
        'relative z-10 flex items-center justify-end px-2 py-1.5 bg-neutral-50/50 dark:bg-neutral-800/30 border-t border-neutral-100 dark:border-neutral-800/50',
      ]"
    >
      <Button
        variant="ghost"
        icon="i-solar:pen-2-bold-duotone"
        :aria-label="`Edit ${name}`"
        @click.stop="emit('edit')"
      />

      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" icon="i-solar:export-bold-duotone" :aria-label="`Export ${name}`" @click.stop />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            :class="[
              'z-10000 min-w-28 border border-neutral-200 rounded-lg bg-white p-1 text-sm text-neutral-800 shadow-xl outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
            ]"
            align="end"
            side="bottom"
            :side-offset="6"
          >
            <DropdownMenuItem
              :class="[
                'cursor-pointer rounded-md px-3 py-2 outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800',
              ]"
              @click.stop="emit('export-json')"
            >
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              :class="[
                'cursor-pointer rounded-md px-3 py-2 outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800',
              ]"
              @click.stop="emit('export-png')"
            >
              Export PNG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <Button
        variant="ghost"
        :icon="isActive ? 'i-solar:check-circle-bold-duotone' : 'i-solar:play-circle-broken'"
        :aria-label="isActive ? `Active card: ${name}` : `Activate ${name}`"
        :disabled="isActive"
        @click.stop="emit('activate')"
      />

      <Button
        v-if="id !== 'default'"
        variant="ghost"
        icon="i-solar:trash-bin-trash-linear"
        :aria-label="`Delete ${name}`"
        @click.stop="emit('delete')"
      />
    </div>
  </CursorFloating>
</template>
