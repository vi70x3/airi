<script setup lang="ts">
import { DirectionalLight } from 'three'

import { useMmd } from '@proj-airi/stage-ui-mmd/stores/mmd'
import { Screen } from '@proj-airi/ui'
import { TresCanvas } from '@tresjs/core'
import { storeToRefs } from 'pinia'
import { ACESFilmicToneMapping, Euler, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { computed, ref, shallowRef, watch } from 'vue'

import MMDModel from './mmd/Model.vue'

const props = withDefaults(
  defineProps<{
    modelSrc?: string
    paused?: boolean
    mouthOpenSize?: number
    textureMap?: Map<string, string | ImageBitmap>
    scale?: number
    positionX?: number
    positionY?: number
    previewExpression?: string
    idleAnimations?: string[]
    draggable?: boolean
  }>(),
  {
    paused: false,
    scale: 1,
    positionX: 0,
    positionY: 0,
    draggable: false,
    mouthOpenSize: 0,
  },
)

const emit = defineEmits<{
  (e: 'error', value: unknown): void
  (e: 'scaleChange', value: number): void
  (e: 'offsetChange', value: { x: number; y: number }): void
}>()

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const camera = shallowRef(new PerspectiveCamera())
const mmdStore = useMmd()
const {
  currentMotion,
  directionalLightPosition,
  directionalLightTarget,
  directionalLightRotation,
  directionalLightIntensity,
  directionalLightColor,

  ambientLightIntensity,
  ambientLightColor,

  hemisphereSkyColor,
  hemisphereGroundColor,
  hemisphereLightIntensity,

  envSelect,

  modelRotationY,
  cameraFOV,
  cameraDistance,
  trackingMode,
  eyeHeight,
  lookAtTarget,
  cameraPosition,
  modelSize,
  modelOrigin,
} = storeToRefs(mmdStore)

const computedModelOffset = computed(() => {
  return {
    x: props.positionX !== undefined ? props.positionX / 100 : 0,
    y: props.positionY !== undefined ? props.positionY / 100 : 0,
    z: 0,
  }
})

const computedScale = computed(() => {
  return props.scale !== undefined ? props.scale : 1
})

watch(cameraFOV, (fov) => {
  if (camera.value) {
    camera.value.fov = fov
    camera.value.updateProjectionMatrix()
  }
})

watch([cameraDistance, eyeHeight, lookAtTarget], ([distance, height, target]) => {
  if (camera.value) {
    camera.value.position.set(0, height, distance || 5)
    camera.value.lookAt(target.x, target.y, target.z)
  }
})

const dirLightRef = ref<InstanceType<typeof DirectionalLight>>()

function updateDirLightTarget(newRotation: { x: number; y: number; z: number }) {
  const light = dirLightRef.value
  if (!light) return

  const { x: rx, y: ry, z: rz } = newRotation
  const lightPosition = new Vector3(
    directionalLightPosition.value.x,
    directionalLightPosition.value.y,
    directionalLightPosition.value.z,
  )
  const origin = new Vector3(0, 0, 0)
  const euler = new Euler(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz), 'XYZ')
  const initialForward = origin.clone().sub(lightPosition).normalize()
  const newForward = initialForward.applyEuler(euler).normalize()
  const distance = lightPosition.distanceTo(origin)
  const target = lightPosition.clone().addScaledVector(newForward, distance)

  light.target.position.copy(target)
  light.target.updateMatrixWorld()

  directionalLightTarget.value = { x: target.x, y: target.y, z: target.z }
}

watch(
  directionalLightRotation,
  (newRotation) => {
    updateDirLightTarget(newRotation)
  },
  { deep: true },
)

watch([dirLightRef], ([dirLight]) => {
  if (!dirLight) return
  try {
    dirLight.parent?.add(dirLight.target)
    dirLight.target.position.set(
      directionalLightTarget.value.x,
      directionalLightTarget.value.y,
      directionalLightTarget.value.z,
    )
    dirLight.target.updateMatrixWorld()
  } catch (error) {
    console.error('[MMD] Failed to setup directional light target:', error)
  }
})

function onTresReady() {
  componentState.value = 'mounted'
}

function onSceneBootstrap(data: any) {
  // Update store values from bootstrap data
  eyeHeight.value = data.eyeHeight
  modelOrigin.value = data.modelOrigin
  modelSize.value = data.modelSize

  if (cameraDistance.value === 0) {
    cameraDistance.value = data.cameraDistance
  }
  if (cameraPosition.value.x === 0 && cameraPosition.value.y === 0 && cameraPosition.value.z === -1) {
    cameraPosition.value = data.cameraPosition
  }
  if (lookAtTarget.value.x === 0 && lookAtTarget.value.y === 0 && lookAtTarget.value.z === 0) {
    lookAtTarget.value = data.lookAtTarget
  }

  // Position camera
  if (camera.value) {
    camera.value.position.set(cameraPosition.value.x, cameraPosition.value.y, cameraPosition.value.z)
    camera.value.lookAt(lookAtTarget.value.x, lookAtTarget.value.y, lookAtTarget.value.z)
    camera.value.fov = cameraFOV.value
    camera.value.updateProjectionMatrix()
  }
}

function handleWheel(event: WheelEvent) {
  const delta = event.deltaY * -0.0005
  const newScale = Math.min(Math.max((props.scale || 1) + delta, 0.1), 3)
  emit('scaleChange', newScale)
}

const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let initialOffsetX = 0
let initialOffsetY = 0

function handlePointerDown(event: PointerEvent) {
  if (!props.draggable) return

  const target = event.currentTarget as HTMLElement
  if (target && typeof target.setPointerCapture === 'function') {
    target.setPointerCapture(event.pointerId)
  }

  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY

  initialOffsetX = props.positionX || 0
  initialOffsetY = props.positionY || 0
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY

  const newX = initialOffsetX + deltaX
  const newY = initialOffsetY - deltaY

  emit('offsetChange', { x: newX, y: newY })
}

function handlePointerUp(event: PointerEvent) {
  if (!isDragging.value) return

  const target = event.currentTarget as HTMLElement
  if (target && typeof target.releasePointerCapture === 'function') {
    target.releasePointerCapture(event.pointerId)
  }

  isDragging.value = false
}
</script>

<template>
  <Screen
    v-slot="{ width, height }"
    relative
    :class="props.draggable ? (isDragging ? 'cursor-grabbing select-none' : 'cursor-grab') : ''"
    @wheel="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <div class="h-full w-full">
      <TresCanvas
        :camera="camera as any"
        :alpha="true"
        :antialias="true"
        :width="width"
        :height="height"
        :tone-mapping="ACESFilmicToneMapping"
        :tone-mapping-exposure="1"
        :clear-alpha="0"
        power-preference="high-performance"
        @ready="onTresReady"
      >
        <TresHemisphereLight
          v-if="envSelect === 'hemisphere'"
          :color="hemisphereSkyColor"
          :ground-color="hemisphereGroundColor"
          :position="[0, 1, 0]"
          :intensity="hemisphereLightIntensity"
          cast-shadow
        />
        <TresAmbientLight :color="ambientLightColor" :intensity="ambientLightIntensity" cast-shadow />
        <TresDirectionalLight
          ref="dirLightRef"
          :color="directionalLightColor"
          :position="[directionalLightPosition.x, directionalLightPosition.y, directionalLightPosition.z]"
          :intensity="directionalLightIntensity"
          cast-shadow
        />

        <MMDModel
          :model-src="modelSrc"
          :paused="paused"
          :mouth-open-size="mouthOpenSize"
          :texture-map="textureMap"
          :model-offset="computedModelOffset"
          :model-rotation-y="modelRotationY"
          :look-at-target="lookAtTarget"
          :tracking-mode="trackingMode"
          :eye-height="eyeHeight"
          :camera-position="cameraPosition"
          :camera="camera"
          :scale="computedScale"
          :preview-expression="props.previewExpression"
          :idle-animations="props.idleAnimations"
          :idle-animation="`/assets/mmd/animations/${currentMotion}`"
          @scene-bootstrap="onSceneBootstrap"
          @error="(err) => emit('error', err)"
        />
      </TresCanvas>
    </div>
  </Screen>
</template>
