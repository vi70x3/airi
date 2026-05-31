import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMmd = defineStore('mmd', () => {
  const availableMorphs = useLocalStorageManualReset<string[]>('settings/mmd/available-morphs', () => [])
  const morphMappings = useLocalStorageManualReset<Record<string, string>>('settings/mmd/morph-mappings', {})
  const hiddenMorphs = useLocalStorageManualReset<string[]>('settings/mmd/hidden-morphs', () => [])

  const currentMotion = ref<string>('swaying_arms_and_hips.vmd')
  const previewExpression = ref<string | null>(null)
  const availableMotions = ref<string[]>([
    'brushoff_nice_and_tidy.vmd',
    'crossed_arms_look_around_confident.vmd',
    'fixing_hair_or_wig.vmd',
    'getting_item_out_of_bra.vmd',
    'hat_flip.vmd',
    'impatient_foot_tapping.vmd',
    'shy.vmd',
    'skittish_mermay.vmd',
    'smelling_something_in_the_air.vmd',
    'something_in_the_sky.vmd',
    'stretching.vmd',
    'swaying_arms_and_hips.vmd',
    'tracker.vmd',
  ])

  // Placement, Camera & Lighting configurations
  const scale = useLocalStorageManualReset<number>('settings/mmd/scale', 1)
  const modelOffset = useLocalStorageManualReset<{ x: number; y: number; z: number }>('settings/mmd/modelOffset', {
    x: 0,
    y: 0,
    z: 0,
  })
  const modelRotationY = useLocalStorageManualReset<number>('settings/mmd/modelRotationY', 0)
  const modelSize = useLocalStorageManualReset<{ x: number; y: number; z: number }>('settings/mmd/modelSize', {
    x: 0,
    y: 0,
    z: 0,
  })
  const modelOrigin = useLocalStorageManualReset<{ x: number; y: number; z: number }>('settings/mmd/modelOrigin', {
    x: 0,
    y: 0,
    z: 0,
  })

  const cameraFOV = useLocalStorageManualReset<number>('settings/mmd/cameraFOV', 40)
  const cameraPosition = useLocalStorageManualReset<{ x: number; y: number; z: number }>(
    'settings/mmd/camera-position',
    { x: 0, y: 0, z: -1 },
  )
  const cameraDistance = useLocalStorageManualReset<number>('settings/mmd/cameraDistance', 0)
  const trackingMode = useLocalStorageManualReset<'camera' | 'mouse' | 'none'>('settings/mmd/trackingMode', 'none')
  const eyeHeight = useLocalStorageManualReset<number>('settings/mmd/eyeHeight', 0)
  const lookAtTarget = useLocalStorageManualReset<{ x: number; y: number; z: number }>('settings/mmd/lookAtTarget', {
    x: 0,
    y: 0,
    z: 0,
  })

  const directionalLightPosition = useLocalStorageManualReset<{ x: number; y: number; z: number }>(
    'settings/mmd/scenes/scene/directional-light/position',
    { x: 0, y: 0, z: -1 },
  )
  const directionalLightTarget = useLocalStorageManualReset<{ x: number; y: number; z: number }>(
    'settings/mmd/scenes/scene/directional-light/target',
    { x: 0, y: 0, z: 0 },
  )
  const directionalLightRotation = useLocalStorageManualReset<{ x: number; y: number; z: number }>(
    'settings/mmd/scenes/scene/directional-light/rotation',
    { x: 0, y: 0, z: 0 },
  )
  const directionalLightIntensity = useLocalStorageManualReset<number>(
    'settings/mmd/scenes/scene/directional-light/intensity',
    2.02,
  )
  const directionalLightColor = useLocalStorageManualReset<string>(
    'settings/mmd/scenes/scene/directional-light/color',
    '#fffbf5',
  )

  const hemisphereSkyColor = useLocalStorageManualReset<string>(
    'settings/mmd/scenes/scene/hemisphere-light/sky-color',
    '#FFFFFF',
  )
  const hemisphereGroundColor = useLocalStorageManualReset<string>(
    'settings/mmd/scenes/scene/hemisphere-light/ground-color',
    '#222222',
  )
  const hemisphereLightIntensity = useLocalStorageManualReset<number>(
    'settings/mmd/scenes/scene/hemisphere-light/intensity',
    0.4,
  )

  const ambientLightColor = useLocalStorageManualReset<string>(
    'settings/mmd/scenes/scene/ambient-light/color',
    '#FFFFFF',
  )
  const ambientLightIntensity = useLocalStorageManualReset<number>(
    'settings/mmd/scenes/scene/ambient-light/intensity',
    0.6,
  )

  const envSelect = useLocalStorageManualReset<'hemisphere' | 'skyBox'>('settings/mmd/envEnabled', 'hemisphere')
  const skyBoxIntensity = useLocalStorageManualReset<number>('settings/mmd/skyBoxIntensity', 0.1)

  function resetState() {
    availableMorphs.reset()
    morphMappings.reset()
    hiddenMorphs.reset()
    scale.reset()
    modelOffset.reset()
    modelRotationY.reset()
    modelSize.reset()
    modelOrigin.reset()
    cameraFOV.reset()
    cameraPosition.reset()
    cameraDistance.reset()
    trackingMode.reset()
    eyeHeight.reset()
    lookAtTarget.reset()
    directionalLightPosition.reset()
    directionalLightTarget.reset()
    directionalLightRotation.reset()
    directionalLightIntensity.reset()
    directionalLightColor.reset()
    hemisphereSkyColor.reset()
    hemisphereGroundColor.reset()
    hemisphereLightIntensity.reset()
    ambientLightColor.reset()
    ambientLightIntensity.reset()
    envSelect.reset()
    skyBoxIntensity.reset()
  }

  return {
    availableMorphs,
    morphMappings,
    hiddenMorphs,
    availableMotions,
    currentMotion,
    previewExpression,
    resetState,

    // Placement, Camera & Lighting configurations
    scale,
    modelOffset,
    modelRotationY,
    modelSize,
    modelOrigin,
    cameraFOV,
    cameraPosition,
    cameraDistance,
    trackingMode,
    eyeHeight,
    lookAtTarget,
    directionalLightPosition,
    directionalLightTarget,
    directionalLightRotation,
    directionalLightIntensity,
    directionalLightColor,
    hemisphereSkyColor,
    hemisphereGroundColor,
    hemisphereLightIntensity,
    ambientLightColor,
    ambientLightIntensity,
    envSelect,
    skyBoxIntensity,
  }
})
