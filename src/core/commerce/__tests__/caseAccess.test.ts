import { describe, expect, it } from 'vitest';

import {
  availabilityLabel,
  canAccessCase,
  resolveCaseAvailability,
  resolveLibrary,
  type AccessContext,
} from '../caseAccess';
import type { EntitlementGrant } from '../entitlements';

const INSTALLED = ['case-001-missing-diamond'];

const context = (
  grants: readonly EntitlementGrant[] = [],
  installed: readonly string[] = INSTALLED,
): AccessContext => ({ grants, installedDefinitionIds: installed });

const owns = (id: EntitlementGrant['id']): EntitlementGrant => ({
  id,
  source: 'purchase',
  grantedAtEpochMs: 1,
  productId: null,
});

describe('canAccessCase', () => {
  it('opens case 001 for a player who has bought nothing', () => {
    expect(canAccessCase('case-001', context())).toBe(true);
    // ...and by its definition id, the form the engine uses.
    expect(canAccessCase('case-001-missing-diamond', context())).toBe(true);
  });

  it('refuses a case that has not been written, even when owned', () => {
    expect(canAccessCase('case-002', context([owns('case:002')]))).toBe(false);
  });

  it('refuses an unowned case', () => {
    expect(canAccessCase('case-004', context())).toBe(false);
  });

  it('is false for an id the catalog has never heard of', () => {
    expect(canAccessCase('case-404', context())).toBe(false);
    expect(resolveCaseAvailability('case-404', context())).toBeNull();
  });

  it('would open case 002 the moment its content ships', () => {
    const shipped = context([owns('case:002')], [...INSTALLED, 'case-002-last-message']);
    const catalogWithContent: AccessContext = {
      ...shipped,
      catalog: [
        {
          id: 'case-002',
          number: '002',
          title: 'THE LAST MESSAGE',
          logline: '',
          entitlement: 'case:002',
          seasonId: 'season:01',
          release: 'released',
          definitionId: 'case-002-last-message',
          expectedLabel: null,
        },
      ],
    };
    expect(canAccessCase('case-002', catalogWithContent)).toBe(true);
  });

  it('honours a season without naming a single case', () => {
    const season = context([owns('season:01')]);
    for (const id of ['case-002', 'case-003', 'case-004', 'case-005', 'case-006']) {
      const availability = resolveCaseAvailability(id, season);
      expect(availability?.entitled, id).toBe(true);
    }
  });

  it('honours the complete edition transitively', () => {
    const complete = context([owns('complete:edition')]);
    expect(resolveLibrary(complete).every((item) => item.entitled)).toBe(true);
  });
});

describe('availability statuses', () => {
  it('marks the shipped free case playable', () => {
    const availability = resolveCaseAvailability('case-001', context());
    expect(availability?.status).toBe('playable');
    expect(availability?.entitled).toBe(true);
    expect(availability?.installed).toBe(true);
    expect(availability?.offers).toEqual([]);
  });

  it('marks unwritten cases coming soon rather than locked', () => {
    const availability = resolveCaseAvailability('case-005', context());
    expect(availability?.status).toBe('coming-soon');
    expect(availability?.note).toBe('IN PREPARATION');
  });

  it('tells an owner of an unwritten case that it is already theirs', () => {
    const availability = resolveCaseAvailability('case-003', context([owns('season:01')]));
    expect(availability?.status).toBe('coming-soon');
    expect(availability?.note).toBe('In your collection. Arrives in a future dossier.');
    expect(availability?.offers).toEqual([]);
  });

  it('locks a released case with no route to obtain it', () => {
    const availability = resolveCaseAvailability('case-002', {
      ...context(),
      catalog: [
        {
          id: 'case-002',
          number: '002',
          title: 'THE LAST MESSAGE',
          logline: '',
          entitlement: 'case:002',
          seasonId: 'season:01',
          release: 'released',
          definitionId: 'case-002-last-message',
          expectedLabel: null,
        },
      ],
    });
    expect(availability?.status).toBe('locked');
  });

  it('never leaves case 001 anything but playable, whatever else is owned', () => {
    for (const grants of [[], [owns('case:002')], [owns('complete:edition')]]) {
      expect(canAccessCase('case-001', context(grants))).toBe(true);
    }
  });

  it('resolves the whole published library in printed order', () => {
    const library = resolveLibrary(context());
    expect(library).toHaveLength(6);
    expect(library[0]?.status).toBe('playable');
    expect(library.slice(1).every((item) => item.status === 'coming-soon')).toBe(true);
  });

  it('gives every status a word, never colour alone', () => {
    expect(availabilityLabel('playable')).toBe('AVAILABLE');
    expect(availabilityLabel('available')).toBe('IN THE ANTHOLOGY');
    expect(availabilityLabel('locked')).toBe('LOCKED');
    expect(availabilityLabel('coming-soon')).toBe('COMING SOON');
  });
});
