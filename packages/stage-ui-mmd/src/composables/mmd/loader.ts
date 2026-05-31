import type { LoadingManager } from 'three'

import { MMDLoader } from '@moeru/three-mmd'
import { Loader, Texture, TextureLoader, LoadingManager as ThreeLoadingManager } from 'three'
import { TGALoader } from 'three/addons/loaders/TGALoader.js'

/**
 * Create an MMDLoader with an optional custom LoadingManager.
 *
 * Use when:
 * - Loading PMX/PMD model files, optionally with a custom manager for texture URL remapping
 *
 * Returns:
 * - A new MMDLoader instance configured with the given manager
 */
export function createMMDLoader(manager?: LoadingManager): MMDLoader {
  return new MMDLoader([], manager)
}

function resolveTextureEntry(
  url: string,
  textureMap: Map<string, string | ImageBitmap>,
): string | ImageBitmap | undefined {
  const normalizedUrl = url.replace(/\\/g, '/').toLowerCase()

  if (textureMap.has(normalizedUrl)) {
    return textureMap.get(normalizedUrl)
  }

  const pathParts = normalizedUrl.split('/')
  for (let i = 0; i < pathParts.length; i++) {
    const candidate = pathParts.slice(i).join('/')
    if (textureMap.has(candidate)) {
      return textureMap.get(candidate)
    }
  }

  const filename = pathParts[pathParts.length - 1]
  if (filename && textureMap.has(filename)) {
    return textureMap.get(filename)
  }

  return undefined
}

class CustomTextureLoader extends Loader {
  private textureMap: Map<string, string | ImageBitmap>

  constructor(manager: LoadingManager, textureMap: Map<string, string | ImageBitmap>) {
    super(manager)
    this.textureMap = textureMap
  }

  load(url: string, onLoad: (t: Texture) => void, onProgress?: any, onError?: any) {
    const resolved = resolveTextureEntry(url, this.textureMap)

    if (resolved instanceof ImageBitmap) {
      const texture = new Texture()
      // Resolve in microtask to prevent callback re-entrancy issues
      Promise.resolve().then(() => {
        texture.image = resolved
        texture.needsUpdate = true
        onLoad(texture)
      })
      return texture
    }

    // Fall back to original url if resolved is not a valid blob url string
    const loadUrl = typeof resolved === 'string' && resolved.startsWith('blob:') ? resolved : url
    const isTga = url.toLowerCase().endsWith('.tga')
    const stdLoader = isTga ? new TGALoader(this.manager) : new TextureLoader(this.manager)

    return stdLoader.load(loadUrl, onLoad, onProgress, onError)
  }
}

/**
 * Create a LoadingManager that remaps texture URLs to blob URLs or ImageBitmaps from a file map.
 *
 * Use when:
 * - Loading an MMD model from a blob URL where textures are also stored as blobs or ImageBitmaps
 *
 * Expects:
 * - A Map of relative filename/path (lowercase) -> blob URL or ImageBitmap
 *
 * Returns:
 * - A LoadingManager with URL modifier and custom handlers that resolves texture paths from the map
 */
export function createTextureRemappingManager(textureMap?: Map<string, string | ImageBitmap>): LoadingManager {
  const manager = new ThreeLoadingManager()

  if (!textureMap) return manager

  manager.setURLModifier((url: string) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url
    }

    const resolved = resolveTextureEntry(url, textureMap)
    if (typeof resolved === 'string') {
      return resolved
    }

    return url
  })

  // Custom loader to intercept and return pre-decoded ImageBitmaps
  const customLoader = new CustomTextureLoader(manager, textureMap)

  manager.addHandler(/\.(png|jpg|jpeg|bmp|tga)$/i, customLoader)

  return manager
}
