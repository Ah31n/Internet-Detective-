import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * PHASE 16 — RENDER DISCIPLINE
 *
 * `memo` is the easiest optimisation in React to accidentally disable: one
 * inline arrow in the parent and every child re-renders again, silently, with
 * no diff to notice and no test to fail. The evidence board had exactly that
 * bug — `EvidenceArtifact` was memoised, and all forty-eight cards re-rendered
 * on every single tap because their callbacks and gesture array were rebuilt
 * on each parent render.
 *
 * These tests read the source and hold the discipline in place.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const BOARD = read('src/features/evidence-board/components/EvidenceBoard.tsx');
const ARTIFACT = read(
  'src/features/evidence-board/components/EvidenceArtifact.tsx',
);
const RELATIONS = read(
  'src/features/evidence-board/components/BoardRelations.tsx',
);
const RENDERER = read(
  'src/features/investigation/components/CaseInvestigationRenderer.tsx',
);
const CCTV = read('src/features/evidence/viewers/CCTVEvidenceViewer.tsx');
const REGISTRY = read('src/case-content/evidenceMediaRegistry.ts');

describe('phase 16 · evidence board', () => {
  it('memoises every callback handed to a card', () => {
    for (const handler of [
      'const dispatch = useCallback',
      'const persistViewport = useCallback',
      'const handleMoveEnd = useCallback',
      'const handleTap = useCallback',
      'const handleLongPress = useCallback',
      'const handleDoubleTap = useCallback',
    ]) {
      expect(BOARD, handler).toContain(handler);
    }
  });

  it('memoises the gesture objects and the array they are passed in', () => {
    expect(BOARD).toContain('const twoFingerPan = useMemo(');
    expect(BOARD).toContain('const pinch = useMemo(');
    expect(BOARD).toContain('const boardGestures = useMemo(');
    expect(BOARD).toContain('const viewportGesture = useMemo(');
  });

  it('keeps the card component memoised', () => {
    expect(ARTIFACT).toContain('memo(EvidenceArtifactComponent)');
  });

  it('builds a card gesture graph in a memo, not on every render', () => {
    // Re-attaching native gesture handlers mid-interaction is how a drag gets
    // dropped. They are rebuilt only when their inputs change.
    expect(ARTIFACT).toContain('const gesture = useMemo(');
  });

  it('never rebuilds the placement map on the UI thread', () => {
    // `livePlacements.value = { ...livePlacements.value }` inside a frame
    // callback allocates a forty-eight-key object sixty times a second.
    expect(ARTIFACT).toContain('livePlacements.modify(');
    expect(ARTIFACT).not.toMatch(/livePlacements\.value\s*=\s*\{/);
    expect(BOARD).not.toMatch(/livePlacements\.value\s*=\s*\{/);
  });

  it('keeps the static cork surface out of the render path', () => {
    expect(BOARD).toContain('const CorkSurface = memo(');
  });

  it('computes string geometry once per frame, not four times', () => {
    expect(RELATIONS).toContain('const geometry = useDerivedValue(');
    // One map read per string per frame, in the derived value only.
    const mapReads = RELATIONS.match(/livePlacements\.value\[/g) ?? [];
    expect(mapReads.length).toBeLessThanOrEqual(3);
  });

  it('memoises the relation layer and its pieces', () => {
    expect(RELATIONS).toContain('memo(function BoardRelations');
    expect(RELATIONS).toContain('memo(function CollectionOutline');
    expect(RELATIONS).toContain('memo(function ConnectionString');
  });

  it('allocates no intermediate arrays inside an outline worklet', () => {
    const outline = RELATIONS.slice(
      RELATIONS.indexOf('CollectionOutline'),
      RELATIONS.indexOf('ConnectionString'),
    );
    expect(outline).not.toContain('Math.min(...');
    expect(outline).not.toContain('Math.max(...');
  });
});

describe('phase 16 · deduction picker', () => {
  it('memoises the block and the row', () => {
    expect(RENDERER).toContain('memo(function DeductionBlock');
    expect(RENDERER).toContain('memo(function EvidenceChoiceRow');
  });

  it('mounts one picker at a time', () => {
    expect(RENDERER).toContain('expandedDeductionId');
  });

  it('keeps the toggle and dispatch identities stable', () => {
    expect(RENDERER).toContain('const toggleDeductionEvidence = useCallback');
    expect(RENDERER).toContain('const dispatch = useCallback');
  });
});

describe('phase 16 · long lists', () => {
  it('memoises the evidence index row', () => {
    expect(RENDERER).toContain('memo(function EvidenceIndexRow');
  });
});

describe('phase 16 · media', () => {
  it('reads board cards from the thumbnail derivative', () => {
    expect(ARTIFACT).toContain("resolveEvidenceImage(media, 'thumb')");
  });

  it('gives recycled images a recycling key', () => {
    expect(ARTIFACT).toContain('recyclingKey={evidence.id}');
  });

  it('registers both variants for every asset', () => {
    const displays = REGISTRY.match(/display: require\(/g) ?? [];
    const thumbs = REGISTRY.match(/thumb: require\(/g) ?? [];
    expect(displays.length).toBe(thumbs.length);
    expect(displays.length).toBeGreaterThan(8);
  });

  it('creates a video player only when there is a video', () => {
    // The hook lives in the child that is mounted for a real source, so a
    // still-based CCTV record allocates no decoder at all.
    const playbackIndex = CCTV.indexOf('function CCTVPlayback');
    const hookIndex = CCTV.indexOf('useVideoPlayer(source');
    expect(playbackIndex).toBeGreaterThan(-1);
    expect(hookIndex).toBeGreaterThan(playbackIndex);
    expect(CCTV.match(/useVideoPlayer\(/g)?.length).toBe(1);
  });

  it('pauses playback when the screen is left or the app backgrounds', () => {
    expect(CCTV).toContain('useFocusEffect');
    expect(CCTV).toContain("AppState.addEventListener('change'");
    expect(CCTV).toContain('player.pause()');
  });
});

describe('phase 16 · animation loops', () => {
  it('runs no perpetual animation anywhere in the app', () => {
    // A `withRepeat(..., -1)` is a permanently busy UI thread and a
    // permanently warm device. The motion system has none, and must not gain
    // one by accident.
    const sources = [BOARD, ARTIFACT, RELATIONS, RENDERER, CCTV];
    for (const source of sources) {
      expect(source).not.toContain('withRepeat');
    }
  });
});
