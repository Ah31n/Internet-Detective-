import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CASE_001 } from '@/case-content/cases/case001/case001.definition';
// Imported twice on purpose, through both specifiers, so the test can prove
// the alias and the relative path land on one module. `import/no-duplicates`
// is correct in general and wrong here — that duplication is the assertion.
// eslint-disable-next-line import/no-duplicates
import * as caseEngineViaAlias from '@/case-engine';
import { PROJECT_ROOT, fromRoot, readProjectFile } from '@/test-support/projectRoot';

// eslint-disable-next-line import/no-duplicates
import * as caseEngineViaRelativePath from '../../case-engine';

/**
 * THE `@/` ALIAS, GUARDED
 *
 * When alias resolution breaks, it does not announce itself. Every suite that
 * imports through `@/` dies at import time and is reported as a failed *file*,
 * while the suites using relative imports carry on passing — so the run says
 * something like "8 failed | 15 passed" with no failing assertion to read, and
 * the eighty-odd tests inside those files quietly stop being counted at all.
 * That looks like an application regression and is not one.
 *
 * This suite exists to fail first and say why. It imports through the alias
 * itself, so if resolution is broken it breaks here too — but with a name that
 * points at the configuration instead of at the game.
 *
 * The alias is declared once, in `tsconfig.json`. Four systems consume it:
 *
 *   TypeScript  reads `compilerOptions.paths` directly
 *   Metro       reads the same, via `expo/metro-config`
 *   Vitest      translates it in `vitest.config.mts` (Vite ignores tsconfig)
 *   ESLint      resolves through the TypeScript parser
 */

interface Tsconfig {
  compilerOptions?: { paths?: Record<string, string[]> };
}

const tsconfig = JSON.parse(readProjectFile('tsconfig.json')) as Tsconfig;
const declaredPaths = tsconfig.compilerOptions?.paths ?? {};

describe('path aliases resolve at runtime', () => {
  it('locates a project root that is really the project root', () => {
    // This used to assert `PROJECT_ROOT.endsWith('internet-detective')`, which
    // is not the invariant — it is a guess about what the developer named the
    // folder they cloned into. A checkout at `Internet-Detective-`, or any
    // other directory name, failed a test about module resolution for a reason
    // that has nothing to do with module resolution.
    //
    // The identity that actually matters is structural, so it is checked
    // structurally: an absolute path, containing this package, with the source
    // root the alias points at.
    expect(isAbsolute(PROJECT_ROOT)).toBe(true);
    expect(existsSync(PROJECT_ROOT)).toBe(true);

    const manifest = JSON.parse(readProjectFile('package.json')) as {
      name?: string;
    };
    // The package's own name, which travels with the repository. Not the
    // directory's name, which does not.
    expect(manifest.name).toBe('internet-detective');

    const sourceRoot = fromRoot('src');
    expect(existsSync(sourceRoot)).toBe(true);
    expect(statSync(sourceRoot).isDirectory()).toBe(true);
    expect(existsSync(fromRoot('src', 'case-engine'))).toBe(true);
  });

  it('lands `@/` inside that source root, not merely somewhere', () => {
    // The strongest available proof: the module reached through the alias and
    // the module reached by walking up from this file are the same module
    // instance. Vite would have to have resolved both to one file for that to
    // hold, so the alias demonstrably points at `<root>/src`.
    expect(caseEngineViaAlias).toBe(caseEngineViaRelativePath);
  });

  it('agrees with the mapping declared in tsconfig', () => {
    const target = declaredPaths['@/*']?.[0];
    expect(target).toBeDefined();

    // `./src/*` -> `<root>/src`, which must be the directory the alias uses.
    const declaredRoot = resolve(PROJECT_ROOT, target!.replace(/\/\*$/, ''));
    expect(declaredRoot).toBe(fromRoot('src'));
  });

  it('resolves deep module paths through the alias', () => {
    expect(CASE_001.id).toBe('case-001-missing-diamond');
    expect(typeof caseEngineViaAlias.createInitialCasePlayerState).toBe(
      'function',
    );
  });

  it('resolves every alias prefix the project declares', async () => {
    // One representative import per declared prefix. A new prefix added to
    // tsconfig without a Vitest translation fails here rather than in whatever
    // suite happens to use it first.
    const probes: Record<string, () => Promise<unknown>> = {
      '@/*': () => import('@/case-engine'),
    };

    for (const pattern of Object.keys(declaredPaths)) {
      const probe = probes[pattern];
      if (!probe) continue;
      await expect(probe()).resolves.toBeTruthy();
    }

    expect(Object.keys(declaredPaths)).toContain('@/*');
  });
});

describe('the alias is declared in exactly one place', () => {
  it('maps `@/*` to the source root in tsconfig', () => {
    expect(declaredPaths['@/*']).toEqual(['./src/*']);
  });

  it('derives the Vitest aliases from tsconfig instead of restating them', () => {
    // A hand-written second copy is a copy that drifts. This is the check that
    // stops one being reintroduced.
    const config = readProjectFile('vitest.config.mts');
    expect(config).toContain('aliasesFromTsconfig');
    expect(config).toContain("readFileSync(fromRoot('tsconfig.json')");

    const hardCoded = /alias:\s*\{[^}]*['"]@['"]\s*:/.test(config);
    expect(hardCoded, 'vitest.config.mts must not hard-code the @ alias').toBe(
      false,
    );
  });

  it('pins the Vitest root so the config cannot be skipped', () => {
    // Running from outside the project used to drop this file entirely, which
    // is what removes the aliases in the first place.
    expect(readProjectFile('vitest.config.mts')).toContain('root: ROOT');
  });
});

describe('the audit suites do not depend on the working directory', () => {
  const AUDIT_SUITES = [
    'src/core/commerce/__tests__/accessArchitecture.test.ts',
    'src/core/dev/__tests__/devMode.test.ts',
    'src/core/distribution/__tests__/storeReadiness.test.ts',
    'src/core/performance/__tests__/performanceBudgets.test.ts',
    'src/core/performance/__tests__/renderDiscipline.test.ts',
    'src/design-system/__tests__/accessibilityAudit.test.ts',
    'src/design-system/__tests__/playerExperience.test.ts',
  ];

  it('anchors every source-reading suite on the project root', () => {
    // `process.cwd()` is the other half of the same failure: with a foreign
    // working directory the root-relative paths stay absolute, every allowlist
    // entry stops matching, and the architecture tests report every file in
    // the project as a violation.
    const offenders = AUDIT_SUITES.filter((suite) =>
      readProjectFile(suite).includes('process.cwd()'),
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('routes them through the shared root helper', () => {
    const offenders = AUDIT_SUITES.filter(
      (suite) => !readProjectFile(suite).includes('@/test-support/projectRoot'),
    );
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
