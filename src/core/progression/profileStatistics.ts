import type { CaseProgressSnapshot } from './progression';

/**
 * THE DETECTIVE'S RECORD
 *
 * Figures for the profile, phrased the way a case record would phrase them.
 * Not a dashboard: no rates, no percentages of engagement, no streaks, nothing
 * that measures the player rather than the work. Each line is something a
 * detective would actually have a count of.
 */

export interface RecordFigure {
  id: string;
  /** Printed label, small caps. */
  label: string;
  /** The figure itself, already formatted. */
  value: string;
  /** Optional line of context, printed quietly beneath. */
  footnote?: string;
}

export interface ActiveInvestigation {
  caseId: string;
  discoveredEvidence: number;
  solvedDeductions: number;
  /** Words, not a percentage — "34 artifacts recovered". */
  progressLine: string;
  lastOpenedAtEpochMs: number | null;
}

const sum = (
  snapshots: readonly CaseProgressSnapshot[],
  pick: (snapshot: CaseProgressSnapshot) => number,
): number => snapshots.reduce((total, snapshot) => total + pick(snapshot), 0);

/** "4 h 12 m", "48 m", "—". Hours and minutes; never seconds. */
export function formatFieldTime(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 60_000) return '—';
  const totalMinutes = Math.floor(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} m`;
  return `${hours} h ${String(minutes).padStart(2, '0')} m`;
}

export function buildInvestigationRecord(
  snapshots: readonly CaseProgressSnapshot[],
): readonly RecordFigure[] {
  const closed = snapshots.filter((snapshot) => snapshot.completed);
  const unaided = closed.filter((snapshot) => snapshot.hintsUsed === 0);
  const scores = closed
    .map((snapshot) => snapshot.score)
    .filter((score): score is number => score !== null);
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  return [
    {
      id: 'evidence-recovered',
      label: 'EVIDENCE RECOVERED',
      value: String(sum(snapshots, (item) => item.discoveredEvidence)),
      footnote: `${sum(snapshots, (item) => item.viewedEvidence)} examined in full`,
    },
    {
      id: 'strings-run',
      label: 'STRINGS RUN',
      value: String(sum(snapshots, (item) => item.evidenceConnections)),
      footnote: `across ${sum(snapshots, (item) => item.boardPlacements)} pinned artifacts`,
    },
    {
      id: 'deductions-proven',
      label: 'DEDUCTIONS PROVEN',
      value: String(sum(snapshots, (item) => item.solvedDeductions)),
    },
    {
      id: 'theories-built',
      label: 'THEORIES BUILT',
      value: String(sum(snapshots, (item) => item.theories)),
      footnote: `${sum(snapshots, (item) => item.evidenceNotes)} margin notes written`,
    },
    {
      id: 'timeline-fixed',
      label: 'EVENTS FIXED IN TIME',
      value: String(sum(snapshots, (item) => item.pinnedTimelineEvents)),
    },
    {
      id: 'field-time',
      label: 'TIME IN THE FIELD',
      value: formatFieldTime(sum(snapshots, (item) => item.investigationDurationMs)),
    },
    {
      id: 'cases-closed',
      label: 'CASES CLOSED',
      value: String(closed.length),
      footnote:
        unaided.length > 0
          ? `${unaided.length} without assistance`
          : undefined,
    },
    {
      id: 'best-verdict',
      label: 'BEST VERDICT',
      value: bestScore === null ? '—' : String(bestScore),
      footnote: bestScore === null ? 'no case closed yet' : 'out of 100',
    },
  ];
}

/** Cases the player has opened and not yet finished, most recent first. */
export function buildActiveInvestigations(
  snapshots: readonly CaseProgressSnapshot[],
  lastOpened: Readonly<Record<string, number | null>>,
): readonly ActiveInvestigation[] {
  return snapshots
    .filter(
      (snapshot) =>
        !snapshot.completed &&
        (snapshot.discoveredEvidence > 0 || snapshot.solvedDeductions > 0),
    )
    .map((snapshot) => ({
      caseId: snapshot.caseId,
      discoveredEvidence: snapshot.discoveredEvidence,
      solvedDeductions: snapshot.solvedDeductions,
      progressLine: `${snapshot.discoveredEvidence} artifact${
        snapshot.discoveredEvidence === 1 ? '' : 's'
      } recovered · ${snapshot.solvedDeductions} deduction${
        snapshot.solvedDeductions === 1 ? '' : 's'
      } proven`,
      lastOpenedAtEpochMs: lastOpened[snapshot.caseId] ?? null,
    }))
    .sort(
      (left, right) =>
        (right.lastOpenedAtEpochMs ?? 0) - (left.lastOpenedAtEpochMs ?? 0),
    );
}

/** "14 MAR" — a filing date, not a timestamp. */
export function formatFilingDate(epochMs: number | null): string {
  if (epochMs === null || !Number.isFinite(epochMs) || epochMs <= 0) return '—';
  const date = new Date(epochMs);
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  return `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]}`;
}
