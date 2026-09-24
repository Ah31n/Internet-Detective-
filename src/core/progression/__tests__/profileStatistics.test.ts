import { describe, expect, it } from 'vitest';

import {
  buildActiveInvestigations,
  buildInvestigationRecord,
  formatFieldTime,
  formatFilingDate,
} from '../profileStatistics';
import type { CaseProgressSnapshot } from '../progression';

const snapshot = (
  overrides: Partial<CaseProgressSnapshot> = {},
): CaseProgressSnapshot => ({
  caseId: 'case-001-missing-diamond',
  discoveredEvidence: 0,
  viewedEvidence: 0,
  evidenceNotes: 0,
  evidenceConnections: 0,
  boardPlacements: 0,
  evidenceGroups: 0,
  theories: 0,
  pinnedTimelineEvents: 0,
  hintsUsed: 0,
  solvedDeductions: 0,
  completed: false,
  score: null,
  investigationDurationMs: 0,
  ...overrides,
});

describe('field time', () => {
  it('prints hours and minutes, never seconds', () => {
    expect(formatFieldTime(0)).toBe('—');
    expect(formatFieldTime(45_000)).toBe('—');
    expect(formatFieldTime(48 * 60_000)).toBe('48 m');
    expect(formatFieldTime(252 * 60_000)).toBe('4 h 12 m');
    expect(formatFieldTime(60 * 60_000)).toBe('1 h 00 m');
  });

  it('survives nonsense input', () => {
    expect(formatFieldTime(Number.NaN)).toBe('—');
    expect(formatFieldTime(-1)).toBe('—');
  });
});

describe('filing dates', () => {
  it('prints a day and a month, not a timestamp', () => {
    expect(formatFilingDate(Date.UTC(2026, 2, 14))).toBe('14 MAR');
    expect(formatFilingDate(null)).toBe('—');
    expect(formatFilingDate(0)).toBe('—');
  });
});

describe('the investigation record', () => {
  it('reads as a record on an empty profile, not an error', () => {
    const record = buildInvestigationRecord([]);
    expect(record).toHaveLength(8);
    expect(record.every((figure) => figure.value.length > 0)).toBe(true);
    expect(record.find((figure) => figure.id === 'best-verdict')?.value).toBe('—');
  });

  it('totals across every case the player has touched', () => {
    const record = buildInvestigationRecord([
      snapshot({ discoveredEvidence: 30, evidenceConnections: 12, theories: 2 }),
      snapshot({ caseId: 'case-002', discoveredEvidence: 18, evidenceConnections: 5 }),
    ]);
    expect(record.find((figure) => figure.id === 'evidence-recovered')?.value).toBe('48');
    expect(record.find((figure) => figure.id === 'strings-run')?.value).toBe('17');
  });

  it('notes cases closed without assistance', () => {
    const record = buildInvestigationRecord([
      snapshot({ completed: true, score: 92, hintsUsed: 0 }),
      snapshot({ caseId: 'case-002', completed: true, score: 71, hintsUsed: 3 }),
    ]);
    expect(record.find((figure) => figure.id === 'cases-closed')?.value).toBe('2');
    expect(record.find((figure) => figure.id === 'cases-closed')?.footnote).toBe(
      '1 without assistance',
    );
    expect(record.find((figure) => figure.id === 'best-verdict')?.value).toBe('92');
  });

  it('measures the work, never the player', () => {
    const labels = buildInvestigationRecord([]).map((figure) => figure.label);
    for (const label of labels) {
      expect(label).not.toMatch(/streak|daily|session|engagement|rate|%/i);
    }
  });
});

describe('active investigations', () => {
  it('ignores untouched and finished cases', () => {
    const active = buildActiveInvestigations(
      [
        snapshot({ discoveredEvidence: 0 }),
        snapshot({ caseId: 'case-002', discoveredEvidence: 4 }),
        snapshot({ caseId: 'case-003', discoveredEvidence: 9, completed: true }),
      ],
      {},
    );
    expect(active.map((item) => item.caseId)).toEqual(['case-002']);
  });

  it('orders by the case last opened', () => {
    const active = buildActiveInvestigations(
      [
        snapshot({ caseId: 'older', discoveredEvidence: 1 }),
        snapshot({ caseId: 'newer', discoveredEvidence: 1 }),
      ],
      { older: 1_000, newer: 9_000 },
    );
    expect(active.map((item) => item.caseId)).toEqual(['newer', 'older']);
  });

  it('describes progress in words, not a percentage', () => {
    const [active] = buildActiveInvestigations(
      [snapshot({ discoveredEvidence: 1, solvedDeductions: 2 })],
      {},
    );
    expect(active?.progressLine).toBe(
      '1 artifact recovered · 2 deductions proven',
    );
    expect(active?.progressLine).not.toMatch(/%/);
  });
});
