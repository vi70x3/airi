import { join } from 'node:path'
import { cwd } from 'node:process'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  return {
    root: import.meta.dirname,
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            include: ['src/**/*.test.ts'],
            env: loadEnv(mode, join(cwd(), 'packages', 'stage-pages'), ''),
          },
        },
      ],
    },
  }
})
