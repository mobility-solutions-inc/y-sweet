import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Tests build the y-sweet binary with cargo and spawn servers, which can
    // take far longer than vitest's 5s default on a cold build.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
