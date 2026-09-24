import { describe, expect, it } from 'vitest';

import { duration, stagger } from '../motionTiming';

describe('motion timing', () => {
  it('orders durations from the quickest acknowledgement to the longest beat', () => {
    expect(duration.flick).toBeLessThan(duration.brief);
    expect(duration.brief).toBeLessThan(duration.reveal);
    expect(duration.reveal).toBeLessThan(duration.unfold);
    expect(duration.unfold).toBeLessThan(duration.cinematic);
  });

  it('keeps every animation short enough to stay out of the way', () => {
    expect(duration.cinematic).toBeLessThanOrEqual(700);
  });

  it('staggers arrivals in order', () => {
    expect(stagger(0)).toBe(0);
    expect(stagger(1)).toBeGreaterThan(stagger(0));
    expect(stagger(3)).toBeGreaterThan(stagger(2));
  });

  it('caps the stagger so a long list never becomes a wait', () => {
    expect(stagger(400)).toBe(440);
    expect(stagger(400, 55, 200)).toBe(200);
  });

  it('treats negative indices as immediate', () => {
    expect(stagger(-4)).toBe(0);
  });
});
