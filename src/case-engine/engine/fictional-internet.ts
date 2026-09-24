import type { CaseDefinition } from '../domain/case-definition';
import type {
  FictionalInternetLocation,
  FictionalInternetSearchResult,
  FictionalPageDefinition,
  FictionalPageId,
  FictionalSiteDefinition,
  FictionalSiteId,
} from '../domain/fictional-internet';
import type { CasePlayerState } from '../domain/player-state';
import { isConditionMet } from './conditions';

export function createFictionalPageKey(
  siteId: FictionalSiteId,
  pageId: FictionalPageId,
) {
  return `${encodeURIComponent(siteId)}/${encodeURIComponent(pageId)}`;
}

export function getFictionalSite(
  definition: CaseDefinition,
  siteId: FictionalSiteId,
): FictionalSiteDefinition | undefined {
  return definition.investigation.internet.sites.find((site) => site.id === siteId);
}

export function getFictionalPage(
  definition: CaseDefinition,
  location: FictionalInternetLocation,
): FictionalPageDefinition | undefined {
  return getFictionalSite(definition, location.siteId)?.pages.find(
    (page) => page.id === location.pageId,
  );
}

export function getAvailableFictionalSites(
  definition: CaseDefinition,
  state: CasePlayerState,
) {
  if (state.phase === 'briefing') return [];
  return definition.investigation.internet.sites.filter((site) =>
    isConditionMet(site.openWhen, state),
  );
}

export function searchFictionalInternet(
  definition: CaseDefinition,
  state: CasePlayerState,
  query: string,
): readonly FictionalInternetSearchResult[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return getAvailableFictionalSites(definition, state)
    .flatMap((site) =>
      site.pages.map((page) => ({
        result: {
          key: createFictionalPageKey(site.id, page.id),
          siteId: site.id,
          pageId: page.id,
          siteName: site.identity.name,
          fictionalHost: site.identity.fictionalHost,
          title: page.title,
          description: page.description,
        },
        searchable: normalize(
          [
            site.identity.name,
            site.identity.tagline,
            site.identity.fictionalHost,
            page.title,
            page.description,
            ...page.searchTerms,
          ].join(' '),
        ),
      })),
    )
    .filter(({ searchable }) => terms.every((term) => searchable.includes(term)))
    .map(({ result }) => result);
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
