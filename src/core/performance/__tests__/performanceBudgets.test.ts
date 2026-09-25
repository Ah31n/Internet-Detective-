import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROJECT_ROOT, toProjectPath } from '@/test-support/projectRoot';

import { CASE_001 } from '@/case-content/cases/case001/case001.definition';
import {
  createInitialCasePlayerState,
  transitionCase,
  type CaseAction,
  type CasePlayerState,
} from '@/case-engine';

/**
 * PHASE 16 — PERFORMANCE BUDGETS
 *
 * Performance regressions are invisible in a diff. These tests measure the
 * things that actually cost frames and memory on a phone — asset bytes, decode
 * size, save payload, and the per-frame arithmetic the evidence board does —
 * and fail the build when a budget is exceeded.
 *
 * The reference device is an iPhone 13: 1170x2532 at 3x, and a mid-range
 * Android with roughly a third of the memory headroom.
 */

const ROOT = PROJECT_ROOT;
const CASE_ASSETS = join(ROOT, 'assets', 'cases');

/** Reads width and height out of a JPEG header without decoding it. */
function jpegDimensions(path: string): { width: number; height: number } {
  const data = readFileSync(path);
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1]!;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error(`no SOF marker in ${path}`);
}

function imageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return imageFiles(full);
    return /\.(jpg|jpeg|png)$/.test(full) ? [full] : [];
  });
}

const images = imageFiles(CASE_ASSETS).map((path) => ({
  path: toProjectPath(path),
  name: path.split('/').pop()!,
  bytes: statSync(path).size,
  ...jpegDimensions(path),
}));

const thumbs = images.filter((image) => image.name.endsWith('.thumb.jpg'));
const displays = images.filter((image) => !image.name.endsWith('.thumb.jpg'));

/** Decoded ARGB bitmap cost, which is what actually occupies RAM. */
const bitmapBytes = (image: { width: number; height: number }) =>
  image.width * image.height * 4;

describe('phase 16 · image budgets', () => {
  it('ships a thumbnail for every display image', () => {
    const missing = displays
      .filter(
        (display) =>
          !thumbs.some(
            (thumb) => thumb.name === display.name.replace('.jpg', '.thumb.jpg'),
          ),
      )
      .map((display) => display.path);
    expect(missing, missing.join('\n')).toEqual([]);
    expect(displays.length).toBeGreaterThan(0);
  });

  it('keeps display artwork at or under 1280 on the long edge', () => {
    // 1280 still exceeds an iPhone 13's 1170 px panel width.
    for (const image of displays) {
      expect(Math.max(image.width, image.height), image.path).toBeLessThanOrEqual(
        1280,
      );
    }
  });

  it('keeps board thumbnails at or under 420 on the long edge', () => {
    for (const image of thumbs) {
      expect(Math.max(image.width, image.height), image.path).toBeLessThanOrEqual(
        420,
      );
    }
  });

  it('keeps every shipped image under 160 KB', () => {
    for (const image of images) {
      expect(image.bytes, `${image.path} is ${Math.round(image.bytes / 1024)} KB`)
        .toBeLessThan(160 * 1024);
    }
  });

  it('keeps the whole case image payload under 1.6 MB', () => {
    const total = images.reduce((sum, image) => sum + image.bytes, 0);
    expect(total, `${Math.round(total / 1024)} KB`).toBeLessThan(1.6 * 1024 * 1024);
  });

  it('keeps a full board of thumbnails inside a sane decode budget', () => {
    // Every image on the wall at once, decoded at card resolution. The old
    // 1536 px masters would have cost roughly 69 MB for the same eleven cards.
    const total = thumbs.reduce((sum, image) => sum + bitmapBytes(image), 0);
    expect(total / (1024 * 1024), `${(total / 1048576).toFixed(1)} MB`).toBeLessThan(8);
  });

  it('keeps a single full-screen decode under 6 MB', () => {
    for (const image of displays) {
      expect(
        bitmapBytes(image) / (1024 * 1024),
        `${image.path}: ${(bitmapBytes(image) / 1048576).toFixed(1)} MB`,
      ).toBeLessThan(6);
    }
  });
});

/** Drives the case to a heavily-played state through the real engine. */
function playedState(): CasePlayerState {
  let state = createInitialCasePlayerState(CASE_001);
  const apply = (action: CaseAction) => {
    const result = transitionCase(CASE_001, state, action);
    if (result?.ok) state = result.state;
  };

  apply({ type: 'BEGIN_INVESTIGATION' });
  for (const scene of CASE_001.investigation.scenes) {
    apply({ type: 'VISIT_SCENE', sceneId: scene.id });
  }
  for (const evidence of CASE_001.investigation.evidence) {
    apply({ type: 'VIEW_EVIDENCE', evidenceId: evidence.id });
    apply({
      type: 'SET_EVIDENCE_NOTE',
      evidenceId: evidence.id,
      text: 'A note of about the length a player actually writes on a card.',
    });
  }
  apply({ type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD' });

  const discovered = state.discoveredEvidenceIds;
  for (let index = 0; index + 1 < discovered.length; index += 2) {
    apply({
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: discovered[index]!,
      toEvidenceId: discovered[index + 1]!,
      kind: index % 4 === 0 ? 'contradicts' : 'related',
    });
  }
  for (const evidenceId of discovered) {
    apply({
      type: 'MOVE_EVIDENCE_ON_BOARD',
      evidenceId,
      x: 120,
      y: 240,
      rotation: 1.5,
    });
  }
  return state;
}

describe('phase 16 · save payload', () => {
  const state = playedState();
  const serialized = JSON.stringify({ sessions: { [state.caseId]: state } });

  it('reaches a genuinely heavy state', () => {
    expect(state.discoveredEvidenceIds.length).toBeGreaterThan(20);
    expect(state.evidenceConnections.length).toBeGreaterThan(8);
  });

  it('keeps a fully-played save under 256 KB', () => {
    // Zustand serialises this synchronously on the JS thread on every commit,
    // so its size is a frame-time cost, not just a storage one.
    expect(
      serialized.length / 1024,
      `${Math.round(serialized.length / 1024)} KB`,
    ).toBeLessThan(256);
  });

  it('serialises a save in well under one frame', () => {
    const started = performance.now();
    for (let index = 0; index < 20; index += 1) JSON.stringify(state);
    const perWrite = (performance.now() - started) / 20;
    expect(perWrite, `${perWrite.toFixed(2)} ms`).toBeLessThan(16);
  });
});

describe('phase 16 · board frame budget', () => {
  it('computes a full wall of string geometry inside a frame', () => {
    // Mirrors what BoardRelations does on the UI thread each frame: one
    // geometry pass per connection, reading two placements.
    const placements: Record<string, { x: number; y: number }> = {};
    for (let index = 0; index < 48; index += 1) {
      placements[`evidence-${index}`] = { x: index * 37, y: index * 53 };
    }
    const connections = Array.from({ length: 40 }, (_, index) => ({
      from: `evidence-${index % 48}`,
      to: `evidence-${(index * 7 + 3) % 48}`,
    }));

    const started = performance.now();
    const frames = 120;
    let sink = 0;
    for (let frame = 0; frame < frames; frame += 1) {
      for (const connection of connections) {
        const from = placements[connection.from]!;
        const to = placements[connection.to]!;
        const deltaX = to.x - from.x;
        const deltaY = to.y - from.y;
        sink += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        sink += Math.atan2(deltaY, deltaX);
      }
    }
    const perFrame = (performance.now() - started) / frames;

    expect(sink).not.toBe(0);
    // Two frames of headroom at 120 Hz on the reference device.
    expect(perFrame, `${perFrame.toFixed(3)} ms/frame`).toBeLessThan(4);
  });
});
