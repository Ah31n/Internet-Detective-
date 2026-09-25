import { describe, expect, it } from 'vitest';

import { readSourceFiles } from '@/test-support/projectRoot';

/**
 * PHASE 14 — a standing audit of the source itself.
 *
 * Accessibility rots silently: a control added next month with no label is
 * invisible to a screen reader and nothing else in the build would complain.
 * These tests read the TSX and fail the gate instead.
 */

/** Returns the text of each opening tag for the given component. */
function openingTags(source: string, component: string): string[] {
  const tags: string[] = [];
  const pattern = new RegExp(`<${component}\\b`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    let depth = 0;
    let index = match.index + match[0].length;
    while (index < source.length) {
      const char = source[index];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0) break;
      index += 1;
    }
    tags.push(source.slice(match.index, index));
  }
  return tags;
}

// Root-anchored on this module's own location rather than the working
// directory, so a runner started elsewhere cannot silently change what is
// audited.
const files = readSourceFiles('src', {
  extensions: ['.tsx'],
  excludeTests: false,
});

describe('phase 14 · source audit', () => {
  it('finds the screens it is supposed to be auditing', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('gives every pressable an accessible name', () => {
    const unnamed: string[] = [];
    for (const file of files) {
      for (const component of ['TactilePressable', 'Pressable']) {
        for (const tag of openingTags(file.source, component)) {
          if (!tag.includes('accessibilityLabel')) {
            unnamed.push(`${file.path} · <${component}>`);
          }
        }
      }
    }
    expect(unnamed, unnamed.join('\n')).toEqual([]);
  });

  it('routes every string through the text primitive', () => {
    // A raw <Text> bypasses text scaling, the contrast mapping, and the
    // Dynamic Type clamp all at once.
    const raw = files
      .filter((file) => !file.path.endsWith('AppText.tsx'))
      .filter((file) => /<Text[\s>]/.test(file.source))
      .map((file) => file.path);
    expect(raw, raw.join('\n')).toEqual([]);
  });

  it('never states a contradiction in colour alone', () => {
    // Every contradiction surface pairs its colour with an icon and the word.
    const board = files.find((file) =>
      file.path.endsWith('BoardRelations.tsx'),
    );
    expect(board).toBeDefined();
    expect(board?.source).toContain('CONTRADICTION');
    expect(board?.source).toMatch(/Ionicons/);
  });

  it('keeps hard-coded row heights out of text-bearing rows', () => {
    // Fixed heights clip scaled type; `minHeight` grows with it.
    // Rows of pure ornament, holding no words at all.
    const ORNAMENT = new Set(['barcode', 'meter']);
    const offenders: string[] = [];
    for (const file of files) {
      const rows = file.source.matchAll(
        /(\w+):\s*\{[^}]*flexDirection:\s*'row'[^}]*\}/g,
      );
      for (const row of rows) {
        const name = row[1] ?? '';
        if (ORNAMENT.has(name)) continue;
        if (/\n\s*height:\s*\d/.test(row[0])) {
          offenders.push(`${file.path} · ${name}`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
