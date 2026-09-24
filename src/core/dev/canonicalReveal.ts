import { DEV_TOOLS_ENABLED } from './devMode';

/**
 * REVEAL CANONICAL SOLUTION — the one tool that prints the answer.
 *
 * The spoiler-sealed record is pulled in with a `require` inside the dev gate,
 * never with a top-level `import`. The difference is the whole point:
 *
 *   import  -> a permanent edge in the module graph; Metro bundles the file
 *              into every build, and `strings` on the shipped binary prints
 *              the solution to anyone who looks.
 *
 *   require -> executed only on the branch that survives, and in a production
 *              bundle `DEV_TOOLS_ENABLED` is the literal `false`, so the
 *              branch is dead code and the file is not reached.
 *
 * That alone turned out not to be enough — Metro collects dependencies from
 * the syntax tree before any minifier sees the dead branch, so the file was
 * still being bundled. `metro.config.js` therefore resolves this module, and
 * the sealed record it reads, to an empty stub in any non-development build.
 *
 * Verified, not assumed: `npm run verify:release` exports a real production
 * bundle and greps the compiled output for this case's canonical phrases.
 */

export interface CanonicalRevealSection {
  id: string;
  heading: string;
  lines: readonly string[];
}

export interface CanonicalReveal {
  caseId: string;
  sections: readonly CanonicalRevealSection[];
}

interface SolutionRecord {
  perpetratorId: string;
  accompliceId: string;
  stolenObject: string;
  motive: string;
  method: string;
  concealment: string;
  framingAttempt: string;
  exclusions: Readonly<Record<string, string>>;
  deterministicSequence: readonly string[];
}

/**
 * Injected so tests can supply the record directly. Node's `require` cannot
 * load a TypeScript source file, and the point of the test is the *shape* of
 * the reveal, not Metro's resolver — which the release bundle check covers.
 */
export type SolutionLoader = () => SolutionRecord;

const requireSealedRecord: SolutionLoader = () =>
  (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../case-content/cases/case001/case001.solution') as {
      CASE001_SOLUTION_RECORD: SolutionRecord;
    }
  ).CASE001_SOLUTION_RECORD;

export function loadCanonicalReveal(
  caseId: string,
  load: SolutionLoader = requireSealedRecord,
): CanonicalReveal | null {
  if (!DEV_TOOLS_ENABLED) return null;
  if (caseId !== 'case-001-missing-diamond') return null;

  const record = load();

  return {
    caseId,
    sections: [
      {
        id: 'responsible',
        heading: 'RESPONSIBLE',
        lines: [
          `Perpetrator · ${record.perpetratorId}`,
          `Accomplice · ${record.accompliceId}`,
          `Object · ${record.stolenObject}`,
        ],
      },
      { id: 'motive', heading: 'MOTIVE', lines: [record.motive] },
      { id: 'method', heading: 'METHOD', lines: [record.method] },
      { id: 'concealment', heading: 'CONCEALMENT', lines: [record.concealment] },
      { id: 'framing', heading: 'FRAMING ATTEMPT', lines: [record.framingAttempt] },
      {
        id: 'exclusions',
        heading: 'EXCLUSIONS',
        lines: Object.entries(record.exclusions).map(
          ([suspectId, reason]) => `${suspectId} — ${reason}`,
        ),
      },
      {
        id: 'sequence',
        heading: 'DETERMINISTIC SEQUENCE',
        lines: record.deterministicSequence.map(
          (step, index) => `${String(index + 1).padStart(2, '0')}. ${step}`,
        ),
      },
    ],
  };
}

/** The authored dependency graph: which artifacts unlock which conclusions. */
export interface DependencyStageView {
  id: string;
  purpose: string;
  requiredEvidenceIds: readonly string[];
  unlocks: readonly string[];
  /** How many required artifacts the player currently holds. */
  held: number;
}

interface DependencyStage {
  id: string;
  purpose: string;
  requiredEvidenceIds: readonly string[];
  unlocks: readonly string[];
}

export type DependencyLoader = () => readonly DependencyStage[];

const requireDependencyGraph: DependencyLoader = () =>
  (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../case-content/cases/case001/case001.dependencies') as {
      CASE001_EVIDENCE_DEPENDENCIES: readonly DependencyStage[];
    }
  ).CASE001_EVIDENCE_DEPENDENCIES;

export function loadDependencyGraph(
  caseId: string,
  discoveredEvidenceIds: readonly string[],
  load: DependencyLoader = requireDependencyGraph,
): readonly DependencyStageView[] | null {
  if (!DEV_TOOLS_ENABLED) return null;
  if (caseId !== 'case-001-missing-diamond') return null;

  const stages = load();

  return stages.map((stage) => ({
    id: stage.id,
    purpose: stage.purpose,
    requiredEvidenceIds: stage.requiredEvidenceIds,
    unlocks: stage.unlocks,
    held: stage.requiredEvidenceIds.filter((id) => discoveredEvidenceIds.includes(id))
      .length,
  }));
}
