import type { createContext } from '@moeru/eventa/adapters/electron/main'

import { defineInvokeHandler } from '@moeru/eventa'
import { app, session } from 'electron'
import { charaCardDownloaded } from '../../../shared/eventa'

export function setupCardDownloadInterception(params: { context: ReturnType<typeof createContext>['context'] }) {
  const { context } = params

  // Intercept downloads in webview elements
  session.defaultSession.on('will-download', async (_event, item, webContents) => {
    // Only process downloads from webview elements
    if (webContents.getType() !== 'webview') {
      return
    }

    const filename = item.getFilename()
    const ext = filename.split('.').pop()?.toLowerCase()

    // Only process PNG and JSON files (card formats)
    if (ext === 'png' || ext === 'json') {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')

      const tempDir = app.getPath('temp')
      const tempFilePath = path.join(tempDir, `airi-card-${Date.now()}-${filename}`)
      item.setSavePath(tempFilePath)

      item.once('done', async (_e, state) => {
        if (state === 'completed') {
          try {
            const buffer = await fs.readFile(tempFilePath)
            const base64Data = buffer.toString('base64')

            // Send the card data to the renderer via Eventa
            const targetWebContents = webContents.hostWebContents || webContents
            context.emit(charaCardDownloaded, {
              base64Data,
              filename,
              ext,
            })
          } catch (err) {
            console.error('[Card Download Interception] Failed to read temporary file:', err)
          } finally {
            await fs.unlink(tempFilePath).catch(() => {})
          }
        }
      })
    }
  })
}
