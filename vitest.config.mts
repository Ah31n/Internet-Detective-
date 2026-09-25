import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, type AliasOptions } from 'vitest/config';

const ROOT = dirname(fileURLToPath(import.meta.url));
const fromRoot = (relative: string) => resolve(ROOT, relative);

/**
 * PATH ALIASES — DERIVED, NOT DUPLICATED
 *
 * `@/*` is declared once, in `tsconfig.json`. TypeScript reads it directly and
 * Metro reads it through `expo/metro-config`, which honours tsconfig paths.
 * Vite does not, so Vitest needs the same mapping — and a second hand-written
 * copy of it is a copy that drifts.
 *
 * So the mapping is translated out of tsconfig at config load. Add a path
 * there and every one of the four systems picks it up together; there is no
 * second list to forget. It also fixes a mismatch the hand-written version
 * had: tsconfig maps `@/assets/*` to `./assets/*`, while the old alias sent
 * everything under `@/` into `src/`, so `@/assets/…` resolved to the wrong
 * directory under test.
 */
function aliasesFromTsconfig(): AliasOptions {
  const tsconfig = JSON.parse(readFileSync(fromRoot('tsconfig.json'), 'utf8')) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  const paths = tsconfig.compilerOptions?.paths ?? {};

  return (
    Object.entries(paths)
      // Longest prefix first, so `@/assets/*` is matched before `@/*`.
      .sort(([left], [right]) => right.length - left.length)
      .flatMap(([pattern, targets]) => {
        const target = targets[0];
        if (!pattern.endsWith('/*') || !target?.endsWith('/*')) return [];

        // `@/x/*` -> match the literal `@/x/` prefix; `./y/*` -> the absolute
        // `<root>/y/` directory. The trailing separator is re-appended because
        // `resolve` strips it, and without it `@/case-engine` would rewrite to
        // `<root>/srccase-engine`.
        const prefix = pattern.slice(0, -1);
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return [
          {
            find: new RegExp(`^${escaped}`),
            replacement: `${fromRoot(target.slice(0, -1))}/`,
          },
        ];
      })
  );
}

export default defineConfig({
  // Pinned so the configuration is authoritative wherever the runner is
  // started from. Without it, invoking Vitest from outside the project (a CI
  // step with the wrong working-directory, a monorepo runner, an editor test
  // button) silently drops this file — and with it every alias, so each suite
  // importing `@/…` fails on resolution while the rest carry on passing.
  root: ROOT,

  // React Native defines `__DEV__` globally; a node test run has to as well,
  // or every `__DEV__` guard silently takes its production path and the tests
  // exercise code the developer never sees.
  define: {
    __DEV__: 'true',
  },

  resolve: {
    alias: [
      // Device storage is replaced with an in-memory double in tests. Listed
      // first: it is a package name that also begins with `@`.
      {
        find: '@react-native-async-storage/async-storage',
        replacement: fromRoot('src/state/persistence/testing/memoryAsyncStorage.ts'),
      },
      ...(aliasesFromTsconfig() as { find: RegExp; replacement: string }[]),
    ],
  },

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
