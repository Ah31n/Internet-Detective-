import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveDevToolsEnabled } from '../devMode';

/**
 * PHASE 17 — THE PRODUCTION SAFETY PROPERTY
 *
 * The brief's hard requirement is that a release build does not expose
 * developer functionality, and that this does not rest on hiding a button.
 * There are three independent things to prove, and all three are proved here
 * or in the release verification script:
 *
 *   1. The gate is closed in a release build, and no environment value can
 *      open it.                                          — this file
 *   2. No shipped module reaches the QA surface except through that gate.
 *                                                        — this file
 *   3. The compiled production bundle does not contain the tools or the
 *      canonical solution.      — tools/verify_release_bundle.mjs, in the gate
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const relative = `${dir}/${entry}`;
    if (statSync(join(ROOT, relative)).isDirectory()) return sourceFiles(relative);
    const isTest = relative.includes('__tests__') || /\.test\.tsx?$/.test(entry);
    return /\.tsx?$/.test(entry) && !isTest ? [relative] : [];
  });
}

const APP_SOURCES = sourceFiles('src')
  .filter(
    (path) =>
      !path.startsWith('src/core/dev/') && !path.startsWith('src/features/qa/'),
  )
  .map((path) => ({ path, source: read(path) }));

describe('the gate', () => {
  it('is open only in a development build', () => {
    expect(
      resolveDevToolsEnabled({ isDevelopmentBuild: true, devToolsEnv: undefined }),
    ).toBe(true);
    expect(
      resolveDevToolsEnabled({ isDevelopmentBuild: false, devToolsEnv: undefined }),
    ).toBe(false);
  });

  it('can be closed from the environment inside a development build', () => {
    expect(
      resolveDevToolsEnabled({ isDevelopmentBuild: true, devToolsEnv: 'off' }),
    ).toBe(false);
  });

  it('cannot be opened from the environment in a release build', () => {
    // The flag subtracts only. This is the reason it is not an opt-in: an
    // enabling flag is one that can be set by accident on a shipped build.
    for (const value of ['on', 'true', '1', 'yes', 'ON', '']) {
      expect(
        resolveDevToolsEnabled({ isDevelopmentBuild: false, devToolsEnv: value }),
        value,
      ).toBe(false);
    }
  });

  it('derives the build flag from __DEV__, not from configuration', () => {
    const source = read('src/core/dev/devMode.ts');
    expect(source).toContain('__DEV__');
    // No environment read may appear in the enabling half of the expression.
    expect(source).toContain('BUILD_IS_DEVELOPMENT && !SILENCED_BY_ENVIRONMENT');
  });
});

describe('reachability from shipped code', () => {
  it('has app code that could have leaked, so the check is meaningful', () => {
    expect(APP_SOURCES.length).toBeGreaterThan(80);
  });

  it('never statically imports the QA console or the tool registry', () => {
    const leaks = APP_SOURCES.filter((file) =>
      /^\s*import[^;]*from\s+['"][^'"]*(features\/qa|core\/dev\/qaTools|core\/dev\/qaInspectors|core\/dev\/canonicalReveal)/m.test(
        file.source,
      ),
    ).map((file) => file.path);
    expect(leaks, leaks.join('\n')).toEqual([]);
  });

  it('only ever reaches the console through the gated route', () => {
    const route = read('src/app/(shell)/qa.tsx');
    expect(route).toContain('DEV_TOOLS_ENABLED');
    expect(route).toContain('<Redirect href="/investigation-home" />');
    // A require, not an import: an import is a graph edge Metro must follow.
    expect(route).toContain("require('@/features/qa/screens/QAConsoleScreen')");
    expect(route).not.toMatch(/^import .*QAConsoleScreen/m);
  });

  it('keeps the sealed solution out of every shipped module', () => {
    // Prose referring to the file is fine; an import or require of it is not.
    const leaks = APP_SOURCES.filter((file) =>
      /(from\s+['"][^'"]*case001\.solution|require\(\s*['"][^'"]*case001\.solution)/.test(
        file.source,
      ),
    ).map((file) => file.path);
    expect(leaks, leaks.join('\n')).toEqual([]);
  });

  it('separates the engine answer key from the narrative solution', () => {
    // The definition needs the answer key at runtime; it must not drag the
    // prose in with it, which is exactly what used to happen.
    const definition = read(
      'src/case-content/cases/case001/case001.definition.ts',
    );
    expect(definition).toContain("from './case001.truth'");
    expect(definition).not.toContain("from './case001.solution'");

    const truth = read('src/case-content/cases/case001/case001.truth.ts');
    expect(truth).toContain('CASE001_CANONICAL_TRUTH');
    expect(truth).not.toContain('CASE001_SOLUTION_RECORD');

    const solution = read('src/case-content/cases/case001/case001.solution.ts');
    expect(solution).toContain('CASE001_SOLUTION_RECORD');
    expect(solution).not.toContain('CASE001_CANONICAL_TRUTH');
  });

  it('loads the solution and the dependency graph behind the gate', () => {
    const reveal = read('src/core/dev/canonicalReveal.ts');
    expect(reveal).toContain('if (!DEV_TOOLS_ENABLED) return null;');
    expect(reveal).not.toMatch(/^import .*case001\.solution/m);
    expect(reveal).toContain(
      "require('../../case-content/cases/case001/case001.solution')",
    );
  });

  it('exposes no developer surface in the settings screen', () => {
    const settings = read('src/features/settings/screens/SettingsScreen.tsx');
    expect(settings).not.toMatch(/DeveloperTools|DEVELOPER TOOLS|QA CONSOLE/);
    expect(settings).toContain('<BuildStamp');
  });

  it('renders the hidden entry as an inert label when the gate is shut', () => {
    const stamp = read('src/features/settings/components/BuildStamp.tsx');
    // The early return happens before any handler or pressable is created, so
    // in a release build there is no tap target at all — not a silent one.
    const gateIndex = stamp.indexOf('if (!DEV_TOOLS_ENABLED)');
    const handlerIndex = stamp.indexOf('const handleTap');
    expect(gateIndex).toBeGreaterThan(-1);
    expect(handlerIndex).toBeGreaterThan(gateIndex);
    expect(stamp).toContain("router.push('/qa')");
  });
});

describe('every tool refuses to run when the gate is shut', () => {
  it('guards each tool individually, not just the screen', () => {
    const tools = read('src/core/dev/qaTools.ts');
    const runners = tools.match(/run: \(\) => \{/g) ?? [];
    const guards = tools.match(/if \(!DEV_TOOLS_ENABLED\) return blocked;/g) ?? [];
    expect(runners.length).toBeGreaterThan(9);
    // One guard per tool, plus the guard on runQATool itself.
    expect(guards.length).toBe(runners.length + 1);
  });
});
