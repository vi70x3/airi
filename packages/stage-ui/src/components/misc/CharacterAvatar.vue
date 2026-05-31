<script setup lang="ts">
interface Props {
  cardId: string
  name: string
  displayModelId?: string
  shape?: 'square' | 'circle'
  sizeClass?: string
  avatarClass?: string
  useDynamicBackground?: boolean
}

withDefaults(defineProps<Props>(), {
  shape: 'circle',
  sizeClass: 'w-24 h-24',
  avatarClass: 'h-full w-full object-cover',
  useDynamicBackground: false,
})
</script>

<template>
  <div
    :class="[
      sizeClass,
      'overflow-hidden bg-neutral-100 dark:bg-neutral-800',
      shape === 'circle' ? 'rounded-full' : 'rounded-lg',
    ]"
  >
    <div class="h-full w-full flex items-center justify-center text-neutral-400 dark:text-neutral-600">
      <div i-solar:user-bold-duotone class="text-3xl" />
    </div>
  </div>
</template>
