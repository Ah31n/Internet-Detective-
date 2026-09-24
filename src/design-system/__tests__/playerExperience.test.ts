import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * PHASE 19 — THE ANTI-WEBSITE AUDIT, MADE PERMANENT
 *
 * This phase was carried out by playing the game rather than reading it, and
 * two screens failed: the home screen was a numbered site map of "05
 * DESTINATIONS" under a green INVESTIGATION DESK ONLINE status dot, and
 * Settings carried a six-cell dashboard stat grid that printed an internal
 * route path to the player.
 *
 * Both were redesigned. These tests keep them redesigned. Every rule below
 * corresponds to something that was actually wrong, not to a hypothetical.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/**
 * Strips comments before auditing.
 *
 * These rules are about what a player can see, and several of the screens that
 * were fixed in this phase carry a comment quoting the copy that was removed,
 * so the reason survives in the file. A rule that fired on its own explanation
 * would force those explanations to be deleted, which is the wrong trade.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const relative = `${dir}/${entry}`;
    if (statSync(join(ROOT, relative)).isDirectory()) return sourceFiles(relative);
    const isTest = relative.includes('__tests__') || /\.test\.tsx?$/.test(entry);
    return /\.tsx$/.test(entry) && !isTest ? [relative] : [];
  });
}

const SCREENS = sourceFiles('src/features')
  .filter((path) => !path.startsWith('src/features/qa/'))
  .map((path) => ({ path, source: withoutComments(read(path)) }));

describe('nothing in the game is a web page', () => {
  it('is auditing a real number of screens', () => {
    expect(SCREENS.length).toBeGreaterThan(25);
  });

  it('embeds no web view anywhere', () => {
    // The in-game internet is structured local data rendered natively. A
    // WebView would make the fictional browser literally a wrapped web page.
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['react-native-webview']).toBeUndefined();

    const offenders = SCREENS.filter((file) => /<WebView|react-native-webview/.test(file.source));
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('uses no marketing or product-page language', () => {
    const marketing =
      /get started|learn more|sign up|sign in|log in|free trial|most popular|best value|choose your plan|upgrade now|our features|welcome to/i;
    const offenders = SCREENS.filter((file) => {
      // Only look at strings the player can actually read.
      const rendered = file.source.match(/>[^<>{}]{4,}</g)?.join(' ') ?? '';
      return marketing.test(rendered);
    }).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('presents no service-status indicator', () => {
    // "INVESTIGATION DESK ONLINE" with a green dot is a SaaS health widget.
    // A detective's desk is not a service with uptime.
    const offenders = SCREENS.filter((file) =>
      /\b(SYSTEM|DESK|SERVICE|SERVER|STATUS)\s+(ONLINE|OFFLINE|HEALTHY|DEGRADED)\b/.test(
        file.source,
      ),
    ).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('builds no dashboard tile grid', () => {
    // The signature of a stat-tile dashboard: a wrapping row of
    // percentage-width cells. The Detective Record presents the same figures
    // as a typeset ledger with leader rules instead.
    const offenders = SCREENS.filter((file) => {
      const wraps = /flexWrap:\s*'wrap'/.test(file.source);
      const percentCells = /width:\s*'(?:33|33\.33|50|25)%'/.test(file.source);
      return wraps && percentCells;
    }).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('never prints an internal route path to the player', () => {
    // Settings used to render `activeProgress.lastScreen`, so a player could
    // read "/INVESTIGATION/EVIDENCE" in their own settings.
    const offenders = SCREENS.filter((file) =>
      /\{[^}]*\blastScreen\b[^}]*\}/.test(file.source),
    ).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('the first screen a player sees', () => {
  const home = withoutComments(
    read('src/features/shell/screens/InvestigationHomeScreen.tsx'),
  );

  it('puts one case file in front of the player', () => {
    expect(home).toContain('DeskCaseFile');
  });

  it('is no longer a registry of destinations', () => {
    expect(home).not.toMatch(/DESTINATIONS|DESK REGISTRY|NavLedgerRow/);
    // The old navigation row component is gone, not merely unused.
    expect(() => read('src/features/shell/components/NavLedgerRow.tsx')).toThrow();
  });

  it('offers an action for every state the investigation can be in', () => {
    const file = read('src/features/shell/components/DeskCaseFile.tsx');
    for (const label of [
      'OPEN THE CASE FILE',
      'READ THE BRIEF',
      'RESUME INVESTIGATION',
      'READ THE CASE REPORT',
    ]) {
      expect(file, label).toContain(label);
    }
  });

  it('describes progress in words rather than a percentage or a bar', () => {
    expect(home).toContain('ARTIFACTS RECOVERED');
    expect(home).not.toMatch(/%|ProgressBar|progressBar/);
  });
});

describe('the game reads its own version', () => {
  it('prints no hard-coded version string on the launch plate', () => {
    const launch = withoutComments(
      read('src/features/shell/screens/AppLaunchScreen.tsx'),
    );
    expect(launch).toContain('BUILD_VERSION');
    expect(launch).not.toMatch(/MOBILE FIELD SYSTEM \/ \d/);
  });
});

describe('touch is the only input', () => {
  it('binds nothing to a mouse, hover, or keyboard shortcut', () => {
    const offenders = SCREENS.filter((file) =>
      /onMouse|onHover|onDoubleClick|onContextMenu|cursor:\s*'pointer'|onKeyDown|onKeyPress/.test(
        file.source,
      ),
    ).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('never assumes a desktop breakpoint', () => {
    // Responsive desktop layout is on the reject list. The game reads window
    // size for the board viewport only, never to switch layouts by width.
    const offenders = SCREENS.filter((file) =>
      /@media|minWidth:\s*(7[0-9][0-9]|[89][0-9][0-9]|1[0-9]{3})|isDesktop|isTablet/.test(
        file.source,
      ),
    ).map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
