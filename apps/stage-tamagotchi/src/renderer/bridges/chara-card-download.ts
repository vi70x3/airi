import { getElectronEventaContext } from '@proj-airi/electron-vueuse'
import { charaCardDownloaded } from '../../../shared/eventa'
import { useCharaCardHandler } from '../composables/useCharaCardHandler'
import { toast } from 'vue-sonner'

/**
 * Register chara-card-downloaded listeners at the renderer service level so they
 * persist for the window's lifetime, independent of any Vue component's
 * mount/unmount lifecycle.
 */
export function initializeCharaCardDownloadBridge() {
  const context = getElectronEventaContext()
  const { handleCharaCardDownloaded } = useCharaCardHandler()

  context.on(charaCardDownloaded, async (event) => {
    const payload = event.body
    if (!payload) return

    try {
      await handleCharaCardDownloaded(payload)
    } catch (err) {
      console.error('[Chara Card Download Bridge] Failed to process intercepted card:', err)
      toast.error('Failed to parse intercepted card file')
    }
  })
}
