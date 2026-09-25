import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const resolvePath = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  // React Native defines `__DEV__` globally; a node test run has to as well,
  // or every `__DEV__` guard silently takes its production path and the tests
  // exercise code the developer never sees.
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      // Device storage is replaced with an in-memory double in tests.
      '@react-native-async-storage/async-storage': resolvePath(
        './src/state/persistence/testing/memoryAsyncStorage.ts',
      ),
      '@': resolvePath('./src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
