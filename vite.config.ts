/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@convex': fileURLToPath(new URL('./convex', import.meta.url)),
}

export default defineConfig({
  plugins: [
    // Must come before the React plugin. Skipped under Vitest: its file watcher keeps the test
    // process alive, and tests use the committed src/routeTree.gen.ts.
    ...(process.env.VITEST ? [] : [tanstackRouter({ target: 'react', autoCodeSplitting: true })]),
    react(),
    tailwindcss(),
  ],
  resolve: { alias },
  server: { port: 5173, strictPort: true },
  test: {
    restoreMocks: true,
    projects: [
      {
        // Web app: components, pages and pure logic.
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./src/testing/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          css: false,
          // Whole-page tests (router + axe) can pass 5 s on a busy machine.
          testTimeout: 15_000,
        },
      },
      {
        // Convex functions run against convex-test's in-memory backend.
        resolve: { alias },
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts'],
          server: { deps: { inline: ['convex-test'] } },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'convex/**/*.ts'],
      exclude: [
        '**/*.test.{ts,tsx}',
        'src/testing/**',
        'src/routeTree.gen.ts',
        // Wiring and configuration: exercised by the end-to-end run, not unit tests.
        'src/main.tsx',
        'src/app/app.tsx',
        'src/lib/convex.ts',
        'src/env.d.ts',
        'convex/_generated/**',
        'convex/http.ts',
        'convex/auth.ts',
        'convex/auth.config.ts',
        'convex/test.helpers.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
