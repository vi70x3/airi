<script setup lang="ts">
/*
 * Core component for loading and displaying MMD (PMX/PMD) models.
 * Parallel to VRMModel.vue but uses @moeru/three-mmd for loading and rendering.
 * Handles model loading, animation playback, morph-based expressions, and lip sync.
 */
import type { MMD } from '@moeru/three-mmd'
import type { Group, PerspectiveCamera } from 'three'

import { useLoop, useTresContext } from '@tresjs/core'
import { AnimationMixer, LoopOnce, LoopRepeat } from 'three'
import { computed, onMounted, onUnmounted, ref, shallowRef, toRefs, watch } from 'vue'

import { loadVMDAnimation } from '../../../composables/mmd/animation'
import { loadMmd } from '../../../composables/mmd/core'
import { useMMDEmote } from '../../../composables/mmd/expression'
import { useMmd } from '../../../stores/mmd'

export interface Vec3 {
  x: number
  y: number
  z: number
}
export interface SceneBootstrap {
  cacheHit: boolean
  cameraDistance: number
  cameraPosition: Vec3
  eyeHeight: number
  lookAtTarget: Vec3
  modelOffset: Vec3
  modelOrigin: Vec3
  modelSize: Vec3
}

const props = withDefaults(
  defineProps<{
    lastCommittedModelSrc?: string
    modelSrc?: string
    textureMap?: Map<string, string | ImageBitmap>
    idleAnimation?: string
    paused?: boolean
    modelOffset: Vec3
    modelRotationY: number
    lookAtTarget: Vec3
    trackingMode: string
    eyeHeight: number
    cameraPosition: Vec3
    camera: PerspectiveCamera
    scale?: number
    previewExpression?: string
    idleAnimations?: string[]
    mouthOpenSize?: number
  }>(),
  {
    paused: false,
    scale: 1,
    mouthOpenSize: 0,
  },
)

const emit = defineEmits<{
  (e: 'loadingProgress', value: number): void
  (e: 'loadStart', value: 'initial-load' | 'model-reload' | 'model-switch'): void
  (e: 'sceneBootstrap', value: SceneBootstrap): void
  (e: 'lookAtTarget', value: Vec3): void
  (e: 'error', value: unknown): void
  (e: 'loaded', value: string): void
}>()

const { lastCommittedModelSrc, modelSrc, paused, modelOffset, modelRotationY } = toRefs(props)

const { scene } = useTresContext()
const mmdInstance = shallowRef<MMD>()
const mmdGroup = shallowRef<Group>()
const modelLoaded = ref(false)
let loadSequence = 0

const mmdAnimationMixer = shallowRef<AnimationMixer>()
const mmdEmote = shallowRef<ReturnType<typeof useMMDEmote>>()
// mmdEmote state setup

const mmdStore = useMmd()

const mmdCycleMotions = computed(() => {
  if (!props.idleAnimations) return []
  return props.idleAnimations.filter((key) => key.startsWith('mmd:')).map((key) => key.replace(/^mmd:/, ''))
})

const mmdCycleUrls = computed(() => {
  return mmdCycleMotions.value.map((motion) => `/assets/mmd/animations/${motion}`)
})

let currentAction: any = null
const clipCache = new Map<string, any>()
let cycleAdvancePending = false

async function playBaseAnimation() {
  console.log('[MMDModel] playBaseAnimation called, props.idleAnimation:', props.idleAnimation)
  if (!mmdInstance.value || !mmdAnimationMixer.value) {
    console.log('[MMDModel] playBaseAnimation bailed: no instance or mixer')
    return
  }

  // If a cycle is active and the current base animation is the default one, prioritize playing the cycle!
  if (mmdCycleUrls.value.length > 0 && props.idleAnimation === '/assets/mmd/animations/swaying_arms_and_hips.vmd') {
    console.log(
      '[MMDModel] playBaseAnimation: cycle is active and base is default, delegating to playNextMmdCycleAnimation',
    )
    void playNextMmdCycleAnimation()
    return
  }

  const url = props.idleAnimation
  if (!url || !url.endsWith('.vmd')) {
    console.log('[MMDModel] playBaseAnimation: stopping all actions (no valid .vmd)')
    mmdAnimationMixer.value.stopAllAction()
    currentAction = null
    return
  }

  try {
    let clip = clipCache.get(url)
    if (!clip) {
      console.log('[MMDModel] playBaseAnimation: loading clip from URL:', url)
      clip = await loadVMDAnimation(url, mmdInstance.value)
      if (clip) {
        clipCache.set(url, clip)
      }
    }

    if (!clip || !mmdAnimationMixer.value) {
      console.log('[MMDModel] playBaseAnimation: clip loading failed or mixer missing')
      return
    }

    const newAction = mmdAnimationMixer.value.clipAction(clip)
    const fadeDuration = 0.5

    newAction.setLoop(LoopRepeat, Infinity)
    newAction.clampWhenFinished = false
    newAction.reset()
    newAction.setEffectiveWeight(1)
    newAction.play()

    if (currentAction && currentAction !== newAction) {
      console.log('[MMDModel] playBaseAnimation: crossfading from currentAction to newAction')
      newAction.crossFadeFrom(currentAction, fadeDuration, true)
    } else {
      console.log('[MMDModel] playBaseAnimation: fading in newAction')
      newAction.fadeIn(fadeDuration)
    }

    currentAction = newAction
    console.log('[MMDModel] playBaseAnimation: currentAction set to:', clip.name)
  } catch (err) {
    console.error('[MMDModel] Failed to play base animation:', err)
  }
}

async function playNextMmdCycleAnimation() {
  console.log('[MMDModel] playNextMmdCycleAnimation called, cycle urls:', mmdCycleUrls.value)
  if (!mmdInstance.value || !mmdAnimationMixer.value) {
    console.log('[MMDModel] playNextMmdCycleAnimation bailed: no instance or mixer')
    return
  }

  const cycle = mmdCycleUrls.value
  if (cycle.length === 0) {
    console.log('[MMDModel] playNextMmdCycleAnimation: cycle empty, falling back to base')
    void playBaseAnimation()
    return
  }

  let nextAnimUrl = cycle[0]
  if (cycle.length > 1) {
    const currentClip = currentAction?.getClip()
    const choices = cycle.filter((url) => {
      const clip = clipCache.get(url)
      return !clip || clip !== currentClip
    })
    const targetChoices = choices.length > 0 ? choices : cycle
    nextAnimUrl = targetChoices[Math.floor(Math.random() * targetChoices.length)]
  }
  console.log('[MMDModel] playNextMmdCycleAnimation: selected nextAnimUrl:', nextAnimUrl)

  try {
    let clip = clipCache.get(nextAnimUrl)
    if (!clip) {
      console.log('[MMDModel] playNextMmdCycleAnimation: loading clip from URL:', nextAnimUrl)
      clip = await loadVMDAnimation(nextAnimUrl, mmdInstance.value)
      if (clip) {
        clipCache.set(nextAnimUrl, clip)
      }
    }

    if (!clip || !mmdAnimationMixer.value) {
      console.log('[MMDModel] playNextMmdCycleAnimation: clip loading failed or mixer missing')
      return
    }

    const newAction = mmdAnimationMixer.value.clipAction(clip)
    const fadeDuration = 0.5

    if (cycle.length === 1) {
      newAction.setLoop(LoopRepeat, Infinity)
      newAction.clampWhenFinished = false
    } else {
      newAction.setLoop(LoopOnce, 1)
      newAction.clampWhenFinished = true
    }

    newAction.reset()
    newAction.setEffectiveWeight(1)
    newAction.play()

    if (currentAction && currentAction !== newAction) {
      console.log('[MMDModel] playNextMmdCycleAnimation: crossfading to next cycle item')
      newAction.crossFadeFrom(currentAction, fadeDuration, true)
    } else {
      console.log('[MMDModel] playNextMmdCycleAnimation: fading in next cycle item')
      newAction.fadeIn(fadeDuration)
    }

    currentAction = newAction
    console.log('[MMDModel] playNextMmdCycleAnimation: currentAction set to:', clip.name)
  } catch (err) {
    console.error('[MMDModel] Failed to play next cycle animation:', err)
  }
}

function onAnimationFinished(e: any) {
  console.log('[MMDModel] onAnimationFinished triggered for action clip:', e.action?.getClip()?.name)
  if (e.action !== currentAction) {
    console.log('[MMDModel] onAnimationFinished: finished action is not currentAction. Ignoring.')
    return
  }

  const cycle = mmdCycleUrls.value
  console.log('[MMDModel] onAnimationFinished: current cycle length is:', cycle.length)
  if (cycle.length > 1 && !cycleAdvancePending) {
    cycleAdvancePending = true
    setTimeout(() => {
      cycleAdvancePending = false
      console.log('[MMDModel] onAnimationFinished: advancing to next cycle item')
      void playNextMmdCycleAnimation()
    }, 0)
  }
}

const { onBeforeRender } = useLoop()

// Render loop
let disposeRenderLoop: (() => void) | undefined

function bindRenderLoop() {
  disposeRenderLoop?.()

  const { off } = onBeforeRender(({ delta }) => {
    if (paused.value) return

    const activeMmd = mmdInstance.value
    if (!activeMmd) return

    // Update animation mixer
    mmdAnimationMixer.value?.update(delta)

    // Update physics (IK, grants, spring bones)
    activeMmd.update(delta)

    // Update expressions
    mmdEmote.value?.update(delta)

    // Update lip sync
    if (props.mouthOpenSize !== undefined) {
      const dict = activeMmd.mesh.morphTargetDictionary
      if (dict) {
        const morphIndex = dict['あ'] !== undefined ? dict['あ'] : dict.a
        if (morphIndex !== undefined && activeMmd.mesh.morphTargetInfluences) {
          activeMmd.mesh.morphTargetInfluences[morphIndex] = props.mouthOpenSize
        }
      }
    }
  })

  disposeRenderLoop = off
}

function detachMmdGroup(group: Group) {
  scene.value?.remove(group as any)
}

function cleanup() {
  disposeRenderLoop?.()
  disposeRenderLoop = undefined

  if (mmdGroup.value) {
    detachMmdGroup(mmdGroup.value)
  }

  if (mmdAnimationMixer.value) {
    mmdAnimationMixer.value.removeEventListener('finished', onAnimationFinished)
  }

  clipCache.clear()
  currentAction = null

  if (mmdInstance.value) {
    // Dispose geometry and materials
    const mesh = mmdInstance.value.mesh
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m: { dispose: () => void }) => m.dispose())
    } else if (mesh.material && 'dispose' in mesh.material) {
      ;(mesh.material as { dispose: () => void }).dispose()
    }
  }

  mmdInstance.value = undefined
  mmdGroup.value = undefined
  mmdAnimationMixer.value = undefined
  mmdEmote.value = undefined
  modelLoaded.value = false
}

function resolveLoadReason(): 'initial-load' | 'model-reload' | 'model-switch' {
  if (!lastCommittedModelSrc.value) return 'initial-load'
  if (lastCommittedModelSrc.value === modelSrc.value) return 'model-reload'
  return 'model-switch'
}

async function loadModel(url: string) {
  const currentSequence = ++loadSequence
  const reason = resolveLoadReason()

  emit('loadStart', reason)
  console.log('[MMDModel] loadModel started!', { url, reason, sequence: currentSequence })

  try {
    const result = await loadMmd(url, {
      // NOTICE:
      // Do NOT pass scene here. loadMmd would add the new group to the scene immediately
      // upon completion, before cleanup() removes the old model — causing both models to
      // coexist in the scene and visually "fuse" together. Instead, we add the group to
      // the scene manually after cleanup() so the transition is atomic from the scene's
      // perspective. Remove this comment if loadMmd's scene-insertion behavior changes.
      textureMap: props.textureMap,
      onProgress: (progress) => {
        if (currentSequence !== loadSequence) return
        if (progress.total > 0) {
          emit('loadingProgress', progress.loaded / progress.total)
        }
      },
    })

    if (!isComponentMounted.value || currentSequence !== loadSequence) return

    if (!result) {
      console.warn('[MMDModel] loadMmd returned undefined!')
      emit('error', new Error('Failed to load MMD model'))
      return
    }
    console.log('[MMDModel] loadMmd succeeded!', { mesh: result.mmd.mesh.name })
    console.log('[MMDModel] Available Morph Targets:', Object.keys(result.mmd.mesh.morphTargetDictionary || {}))
    console.log('[MMDModel] Available Bones:', result.mmd.mesh.skeleton?.bones.map((b: any) => b.name) || [])

    // Update store with available morphs
    mmdStore.availableMorphs = Object.keys(result.mmd.mesh.morphTargetDictionary || {})

    // Clean up previous model before adding the new one to the scene,
    // so the old and new models never coexist in the scene simultaneously.
    cleanup()

    if (scene.value) {
      scene.value.add(result.mmdGroup as any)
    }

    mmdInstance.value = result.mmd
    mmdGroup.value = result.mmdGroup

    // Apply model offset and rotation
    result.mmdGroup.position.set(modelOffset.value.x, modelOffset.value.y, modelOffset.value.z)
    result.mmdGroup.rotation.y = modelRotationY.value

    // Set up animation mixer
    const mixer = new AnimationMixer(result.mmd.mesh)
    mixer.addEventListener('finished', onAnimationFinished)
    mmdAnimationMixer.value = mixer

    // Set up expression controller
    mmdEmote.value = useMMDEmote(result.mmd)

    // Load initial animation or cycle
    if (mmdCycleUrls.value.length > 0) {
      void playNextMmdCycleAnimation()
    } else {
      void playBaseAnimation()
    }

    // Re-check sequence after all async work before committing to the scene
    if (currentSequence !== loadSequence) return

    // Emit scene bootstrap data
    const eyeHeight = result.modelCenter.y
    const cameraDistance = result.initialCameraOffset.z

    emit('sceneBootstrap', {
      cacheHit: false,
      cameraDistance,
      cameraPosition: {
        x: result.initialCameraOffset.x,
        y: result.initialCameraOffset.y,
        z: result.initialCameraOffset.z,
      },
      eyeHeight,
      lookAtTarget: { x: 0, y: eyeHeight, z: -100 },
      modelOffset: { x: 0, y: 0, z: 0 },
      modelOrigin: {
        x: result.modelCenter.x,
        y: result.modelCenter.y,
        z: result.modelCenter.z,
      },
      modelSize: {
        x: result.modelSize.x,
        y: result.modelSize.y,
        z: result.modelSize.z,
      },
    })

    emit('lookAtTarget', { x: 0, y: eyeHeight, z: -100 })

    // Bind render loop and mark as loaded
    bindRenderLoop()
    modelLoaded.value = true
    emit('loaded', url)
  } catch (error) {
    if (currentSequence !== loadSequence) {
      console.log('[MMDModel] loadModel failed but sequence changed. Ignoring error.')
      return
    }
    console.error('[MMDModel] loadModel FAILED:', error)
    emit('error', error)
  }
}

// Watch idle animation changes
watch(
  () => props.idleAnimation,
  async (newAnim) => {
    console.log('[MMDModel] idleAnimation changed:', newAnim)
    if (newAnim && newAnim.endsWith('.vmd') && mmdInstance.value && mmdAnimationMixer.value) {
      if (newAnim !== '/assets/mmd/animations/swaying_arms_and_hips.vmd' || mmdCycleUrls.value.length === 0) {
        void playBaseAnimation()
      }
    } else if (mmdAnimationMixer.value && mmdCycleUrls.value.length === 0) {
      console.log('[MMDModel] Stopping all actions (None or invalid animation)')
      mmdAnimationMixer.value.stopAllAction()
      currentAction = null
    }
  },
)

// Watch cycle animations playlist changes
watch(
  mmdCycleUrls,
  (urls) => {
    if (!mmdInstance.value || !mmdAnimationMixer.value) return

    if (urls.length > 0) {
      const currentClip = currentAction?.getClip()
      const isPlayingCycleItem = urls.some((url) => {
        const clip = clipCache.get(url)
        return clip && clip === currentClip
      })

      if (!isPlayingCycleItem) {
        void playNextMmdCycleAnimation()
      }
    } else {
      void playBaseAnimation()
    }
  },
  { deep: true },
)

// Watch model source changes
watch(
  modelSrc,
  (newSrc, oldSrc) => {
    if (!newSrc) {
      cleanup()
      return
    }
    if (newSrc !== oldSrc) {
      void loadModel(newSrc)
    }
  },
  { immediate: true },
)

// Watch offset/rotation changes
watch([modelOffset, modelRotationY], ([offset, rotY]) => {
  if (!mmdGroup.value) return
  mmdGroup.value.position.set(offset.x, offset.y, offset.z)
  mmdGroup.value.rotation.y = rotY
})

// Watch scale changes
watch(
  () => props.scale,
  (newScale) => {
    if (!mmdGroup.value || newScale === undefined) return
    mmdGroup.value.scale.set(newScale, newScale, newScale)
  },
)

// Watch preview expression changes
watch(
  () => props.previewExpression,
  (newExpr) => {
    console.log('[MMDModel] previewExpression changed:', newExpr)
    if (newExpr && mmdEmote.value) {
      console.log('[MMDModel] Setting expression:', newExpr)
      mmdEmote.value.setExpression(newExpr, 1.0)
    } else if (mmdEmote.value) {
      console.log('[MMDModel] Resetting expression')
      mmdEmote.value.resetExpression()
    }
  },
)

const isComponentMounted = ref(false)

onMounted(() => {
  isComponentMounted.value = true
  // NOTE: loadModel is already triggered by the immediate watcher on modelSrc,
  // so we don't need to call it again here to avoid redundant initial loads.
})

onUnmounted(() => {
  isComponentMounted.value = false
  cleanup()
})

defineExpose({
  setExpression: (name: string, intensity?: number) => {
    mmdEmote.value?.setExpression(name, intensity)
  },
  resetExpression: () => {
    mmdEmote.value?.resetExpression()
  },
})
</script>

<template>
  <!-- MMD model is added to the scene programmatically via Three.js API -->
  <slot />
</template>
