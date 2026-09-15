import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    testTimeout: 20000, // Augmenter le timeout à 20 secondes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData*',
        'dist/',
        'coverage/',
      ],
      all: true, // Inclure tous les fichiers même sans tests
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
})
