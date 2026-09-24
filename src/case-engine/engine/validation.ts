import type {
  CaseCondition,
  CaseDefinition,
} from '../domain/case-definition';
import type {
  EvidenceDefinition,
  EvidenceMediaReference,
  EvidenceTextBlock,
} from '../domain/evidence';

export interface CaseDefinitionIssue {
  code: string;
  path: string;
  message: string;
}

export class InvalidCaseDefinitionError extends Error {
  readonly issues: readonly CaseDefinitionIssue[];

  constructor(issues: readonly CaseDefinitionIssue[]) {
    super(`Invalid CaseDefinition: ${issues.map((issue) => issue.message).join('; ')}`);
    this.name = 'InvalidCaseDefinitionError';
    this.issues = issues;
  }
}

function duplicates(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  }
  return [...duplicateValues];
}

export function validateCaseDefinition(
  definition: CaseDefinition,
): readonly CaseDefinitionIssue[] {
  const issues: CaseDefinitionIssue[] = [];
  const add = (code: string, path: string, message: string) =>
    issues.push({ code, path, message });

  if (definition.schemaVersion !== 1) {
    add('UNSUPPORTED_SCHEMA', 'schemaVersion', 'Only case schema version 1 is supported.');
  }
  if (!definition.id.trim()) add('REQUIRED', 'id', 'Case id is required.');
  if (!Number.isInteger(definition.contentVersion) || definition.contentVersion < 1) {
    add('INVALID_VERSION', 'contentVersion', 'Content version must be a positive integer.');
  }
  if (!definition.metadata.title.trim()) {
    add('REQUIRED', 'metadata.title', 'Case title is required.');
  }

  const suspects = definition.investigation.suspects;
  const locations = definition.investigation.locations;
  const relationships = definition.investigation.relationships;
  const timeline = definition.investigation.timeline;
  const scenes = definition.investigation.scenes;
  const evidence = definition.investigation.evidence;
  const deductions = definition.investigation.deductions;
  const questions = definition.investigation.accusation.questions;

  const suspectIds = new Set(suspects.map((item) => item.id));
  const locationIds = new Set(locations.map((item) => item.id));
  const sceneIds = new Set(scenes.map((item) => item.id));
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const deductionIds = new Set(deductions.map((item) => item.id));
  const questionIds = new Set(questions.map((item) => item.id));

  for (const [path, ids] of [
    ['investigation.suspects', suspects.map((item) => item.id)],
    ['investigation.locations', locations.map((item) => item.id)],
    ['investigation.relationships', relationships.map((item) => item.id)],
    ['investigation.timeline', timeline.map((item) => item.id)],
    ['investigation.scenes', scenes.map((item) => item.id)],
    ['investigation.evidence', evidence.map((item) => item.id)],
    ['investigation.deductions', deductions.map((item) => item.id)],
    ['investigation.accusation.questions', questions.map((item) => item.id)],
  ] as const) {
    for (const id of duplicates(ids)) {
      add('DUPLICATE_ID', path, `Duplicate id "${id}".`);
    }
    if (ids.some((id) => !id.trim())) add('REQUIRED_ID', path, 'Ids cannot be empty.');
  }

  suspects.forEach((suspect, index) => {
    if (
      !suspect.name.trim() ||
      !suspect.role.trim() ||
      !suspect.summary.trim() ||
      !suspect.statedAlibi.trim()
    ) {
      add(
        'REQUIRED',
        `investigation.suspects[${index}]`,
        `Suspect "${suspect.id}" requires a name, role, summary, and stated alibi.`,
      );
    }
  });
  locations.forEach((location, index) => {
    if (!location.name.trim() || !location.summary.trim()) {
      add(
        'REQUIRED',
        `investigation.locations[${index}]`,
        `Location "${location.id}" requires a name and summary.`,
      );
    }
  });

  if (!sceneIds.has(definition.investigation.startingSceneId)) {
    add(
      'UNKNOWN_REFERENCE',
      'investigation.startingSceneId',
      `Starting scene "${definition.investigation.startingSceneId}" does not exist.`,
    );
  }

  const validateEvidenceReference = (id: string, path: string) => {
    if (!evidenceIds.has(id)) {
      add('UNKNOWN_REFERENCE', path, `Evidence "${id}" does not exist.`);
    }
  };
  evidence.forEach((item, index) =>
    validateEvidencePayload(item, index, evidenceIds, add),
  );
  validateFictionalInternet(
    definition,
    { sceneIds, evidenceIds, deductionIds },
    add,
  );

  const validateDeductionReference = (id: string, path: string) => {
    if (!deductionIds.has(id)) {
      add('UNKNOWN_REFERENCE', path, `Deduction "${id}" does not exist.`);
    }
  };

  definition.investigation.startingEvidenceIds.forEach((id, index) =>
    validateEvidenceReference(id, `investigation.startingEvidenceIds[${index}]`),
  );

  scenes.forEach((scene, sceneIndex) => {
    if (scene.suspectId && !suspectIds.has(scene.suspectId)) {
      add(
        'UNKNOWN_REFERENCE',
        `investigation.scenes[${sceneIndex}].suspectId`,
        `Suspect "${scene.suspectId}" does not exist.`,
      );
    }
    if (scene.locationId && !locationIds.has(scene.locationId)) {
      add(
        'UNKNOWN_REFERENCE',
        `investigation.scenes[${sceneIndex}].locationId`,
        `Location "${scene.locationId}" does not exist.`,
      );
    }
    scene.revealsEvidenceIds.forEach((id, evidenceIndex) =>
      validateEvidenceReference(
        id,
        `investigation.scenes[${sceneIndex}].revealsEvidenceIds[${evidenceIndex}]`,
      ),
    );
    validateCondition(
      scene.openWhen,
      `investigation.scenes[${sceneIndex}].openWhen`,
      { sceneIds, evidenceIds, deductionIds },
      add,
    );
  });

  relationships.forEach((relationship, index) => {
    const path = `investigation.relationships[${index}]`;
    if (
      !suspectIds.has(relationship.fromSuspectId) ||
      !suspectIds.has(relationship.toSuspectId) ||
      relationship.fromSuspectId === relationship.toSuspectId
    ) {
      add(
        'UNKNOWN_REFERENCE',
        path,
        `Relationship "${relationship.id}" requires two different known suspects.`,
      );
    }
    if (!relationship.label.trim() || !relationship.summary.trim()) {
      add(
        'REQUIRED',
        path,
        `Relationship "${relationship.id}" requires a label and summary.`,
      );
    }
    validateCondition(
      relationship.openWhen,
      `${path}.openWhen`,
      { sceneIds, evidenceIds, deductionIds },
      add,
    );
  });

  timeline.forEach((event, index) => {
    const path = `investigation.timeline[${index}]`;
    if (
      !event.timeLabel.trim() ||
      !event.title.trim() ||
      !event.summary.trim() ||
      !Number.isFinite(event.sortOrder)
    ) {
      add(
        'REQUIRED',
        path,
        `Timeline event "${event.id}" requires time, order, title, and summary.`,
      );
    }
    if (event.locationId && !locationIds.has(event.locationId)) {
      add(
        'UNKNOWN_REFERENCE',
        `${path}.locationId`,
        `Timeline event references unknown location "${event.locationId}".`,
      );
    }
    event.suspectIds.forEach((suspectId, suspectIndex) => {
      if (!suspectIds.has(suspectId)) {
        add(
          'UNKNOWN_REFERENCE',
          `${path}.suspectIds[${suspectIndex}]`,
          `Timeline event references unknown suspect "${suspectId}".`,
        );
      }
    });
    event.sourceEvidenceIds.forEach((evidenceId, evidenceIndex) =>
      validateEvidenceReference(
        evidenceId,
        `${path}.sourceEvidenceIds[${evidenceIndex}]`,
      ),
    );
    validateCondition(
      event.openWhen,
      `${path}.openWhen`,
      { sceneIds, evidenceIds, deductionIds },
      add,
    );
  });

  deductions.forEach((deduction, index) => {
    if (
      !Number.isInteger(deduction.minimumEvidence) ||
      !Number.isInteger(deduction.maximumEvidence) ||
      deduction.minimumEvidence < 1 ||
      deduction.maximumEvidence < deduction.minimumEvidence
    ) {
      add(
        'INVALID_SELECTION_RANGE',
        `investigation.deductions[${index}]`,
        `Deduction "${deduction.id}" has an invalid evidence selection range.`,
      );
    }
    validateCondition(
      deduction.openWhen,
      `investigation.deductions[${index}].openWhen`,
      { sceneIds, evidenceIds, deductionIds },
      add,
    );
  });

  validateCondition(
    definition.investigation.accusation.openWhen,
    'investigation.accusation.openWhen',
    { sceneIds, evidenceIds, deductionIds },
    add,
  );

  questions.forEach((question, questionIndex) => {
    const optionIds = question.options.map((item) => item.id);
    for (const id of duplicates(optionIds)) {
      add(
        'DUPLICATE_ID',
        `investigation.accusation.questions[${questionIndex}].options`,
        `Duplicate option id "${id}".`,
      );
    }
    if (question.options.length < 2) {
      add(
        'INSUFFICIENT_OPTIONS',
        `investigation.accusation.questions[${questionIndex}].options`,
        `Question "${question.id}" requires at least two options.`,
      );
    }
  });

  for (const deduction of deductions) {
    const solution = definition.canonicalTruth.deductionSolutions[deduction.id];
    if (!solution) {
      add(
        'MISSING_TRUTH',
        `canonicalTruth.deductionSolutions.${deduction.id}`,
        `Deduction "${deduction.id}" has no canonical solution.`,
      );
      continue;
    }
    solution.requiredEvidenceIds.forEach((id, index) =>
      validateEvidenceReference(
        id,
        `canonicalTruth.deductionSolutions.${deduction.id}.requiredEvidenceIds[${index}]`,
      ),
    );
    if (
      solution.requiredEvidenceIds.length < deduction.minimumEvidence ||
      solution.requiredEvidenceIds.length > deduction.maximumEvidence
    ) {
      add(
        'TRUTH_OUTSIDE_SELECTION_RANGE',
        `canonicalTruth.deductionSolutions.${deduction.id}`,
        `Canonical solution for "${deduction.id}" cannot satisfy its selection range.`,
      );
    }
  }

  for (const truthDeductionId of Object.keys(
    definition.canonicalTruth.deductionSolutions,
  )) {
    validateDeductionReference(
      truthDeductionId,
      `canonicalTruth.deductionSolutions.${truthDeductionId}`,
    );
  }

  for (const deductionId of definition.canonicalTruth.requiredDeductionIds) {
    validateDeductionReference(deductionId, 'canonicalTruth.requiredDeductionIds');
  }

  for (const question of questions) {
    const answer = definition.canonicalTruth.accusationAnswers[question.id];
    if (!answer) {
      add(
        'MISSING_TRUTH',
        `canonicalTruth.accusationAnswers.${question.id}`,
        `Question "${question.id}" has no canonical answer.`,
      );
    } else if (!question.options.some((option) => option.id === answer)) {
      add(
        'UNKNOWN_REFERENCE',
        `canonicalTruth.accusationAnswers.${question.id}`,
        `Canonical option "${answer}" is not available for question "${question.id}".`,
      );
    }
  }

  for (const truthQuestionId of Object.keys(
    definition.canonicalTruth.accusationAnswers,
  )) {
    if (!questionIds.has(truthQuestionId)) {
      add(
        'UNKNOWN_REFERENCE',
        `canonicalTruth.accusationAnswers.${truthQuestionId}`,
        `Canonical answer references unknown question "${truthQuestionId}".`,
      );
    }
  }

  const score = definition.scoring;
  if (
    score.maximumScore < 0 ||
    score.incorrectDeductionPenalty < 0 ||
    score.incorrectAccusationPenalty < 0
  ) {
    add('INVALID_SCORING', 'scoring', 'Scoring values cannot be negative.');
  }

  return issues;
}

export function assertValidCaseDefinition(definition: CaseDefinition) {
  const issues = validateCaseDefinition(definition);
  if (issues.length > 0) throw new InvalidCaseDefinitionError(issues);
}

function validateCondition(
  condition: CaseCondition | undefined,
  path: string,
  ids: {
    sceneIds: ReadonlySet<string>;
    evidenceIds: ReadonlySet<string>;
    deductionIds: ReadonlySet<string>;
  },
  add: (code: string, path: string, message: string) => void,
): void {
  if (!condition) return;

  switch (condition.kind) {
    case 'all':
    case 'any':
      condition.conditions.forEach((item, index) =>
        validateCondition(item, `${path}.conditions[${index}]`, ids, add),
      );
      return;
    case 'not':
      validateCondition(condition.condition, `${path}.condition`, ids, add);
      return;
    case 'sceneVisited':
      if (!ids.sceneIds.has(condition.sceneId)) {
        add('UNKNOWN_REFERENCE', path, `Scene "${condition.sceneId}" does not exist.`);
      }
      return;
    case 'evidenceDiscovered':
    case 'evidenceViewed':
    case 'evidenceReferenced':
      if (!ids.evidenceIds.has(condition.evidenceId)) {
        add('UNKNOWN_REFERENCE', path, `Evidence "${condition.evidenceId}" does not exist.`);
      }
      return;
    case 'deductionSolved':
      if (!ids.deductionIds.has(condition.deductionId)) {
        add('UNKNOWN_REFERENCE', path, `Deduction "${condition.deductionId}" does not exist.`);
      }
      return;
  }
}

function validateEvidencePayload(
  evidence: EvidenceDefinition,
  index: number,
  allEvidenceIds: ReadonlySet<string>,
  add: (code: string, path: string, message: string) => void,
) {
  const basePath = `investigation.evidence[${index}]`;
  if (!evidence.title.trim() || !evidence.source.trim()) {
    add('REQUIRED', basePath, `Evidence "${evidence.id}" requires a title and source.`);
  }

  const validateStableIds = (ids: readonly string[], path: string) => {
    if (ids.some((id) => !id.trim())) {
      add('REQUIRED_ID', path, 'Nested evidence object IDs cannot be empty.');
    }
    for (const id of duplicates(ids)) {
      add('DUPLICATE_ID', path, `Duplicate nested evidence id "${id}".`);
    }
  };
  const validateBlocks = (blocks: readonly EvidenceTextBlock[], path: string) => {
    validateStableIds(blocks.map((block) => block.id), path);
  };

  switch (evidence.type) {
    case 'photo':
      validateMedia(evidence.image, `${basePath}.image`, add);
      validateStableIds(
        evidence.annotations.map((annotation) => annotation.id),
        `${basePath}.annotations`,
      );
      evidence.annotations.forEach((annotation, annotationIndex) => {
        if (
          annotation.xPercent < 0 ||
          annotation.xPercent > 100 ||
          annotation.yPercent < 0 ||
          annotation.yPercent > 100
        ) {
          add(
            'INVALID_COORDINATE',
            `${basePath}.annotations[${annotationIndex}]`,
            'Photo annotation coordinates must be percentages between 0 and 100.',
          );
        }
      });
      return;
    case 'document':
      validateStableIds(evidence.pages.map((page) => page.id), `${basePath}.pages`);
      evidence.pages.forEach((page, pageIndex) =>
        validateBlocks(page.blocks, `${basePath}.pages[${pageIndex}].blocks`),
      );
      if (evidence.pages.length === 0) {
        add('EMPTY_EVIDENCE', `${basePath}.pages`, 'A document requires at least one page.');
      }
      return;
    case 'receipt':
      validateStableIds(evidence.lines.map((line) => line.id), `${basePath}.lines`);
      evidence.lines.forEach((line, lineIndex) => {
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
          add(
            'INVALID_QUANTITY',
            `${basePath}.lines[${lineIndex}].quantity`,
            'Receipt quantities must be positive numbers.',
          );
        }
      });
      return;
    case 'message': {
      const participantIds = evidence.participants.map((participant) => participant.id);
      validateStableIds(participantIds, `${basePath}.participants`);
      validateStableIds(evidence.messages.map((message) => message.id), `${basePath}.messages`);
      const participantSet = new Set(participantIds);
      evidence.messages.forEach((message, messageIndex) => {
        if (!participantSet.has(message.senderId)) {
          add(
            'UNKNOWN_REFERENCE',
            `${basePath}.messages[${messageIndex}].senderId`,
            `Message sender "${message.senderId}" is not a participant.`,
          );
        }
      });
      return;
    }
    case 'email':
      validateBlocks(evidence.body, `${basePath}.body`);
      evidence.attachmentEvidenceIds.forEach((attachmentId, attachmentIndex) => {
        if (!allEvidenceIds.has(attachmentId)) {
          add(
            'UNKNOWN_REFERENCE',
            `${basePath}.attachmentEvidenceIds[${attachmentIndex}]`,
            `Email attachment evidence "${attachmentId}" does not exist.`,
          );
        }
      });
      return;
    case 'cctv':
      validateMedia(evidence.video, `${basePath}.video`, add);
      if (evidence.poster) validateMedia(evidence.poster, `${basePath}.poster`, add);
      validateStableIds(evidence.markers.map((marker) => marker.id), `${basePath}.markers`);
      if (!Number.isFinite(evidence.durationSeconds) || evidence.durationSeconds <= 0) {
        add('INVALID_DURATION', `${basePath}.durationSeconds`, 'CCTV duration must be positive.');
      }
      evidence.markers.forEach((marker, markerIndex) => {
        if (marker.offsetSeconds < 0 || marker.offsetSeconds > evidence.durationSeconds) {
          add(
            'INVALID_OFFSET',
            `${basePath}.markers[${markerIndex}].offsetSeconds`,
            'CCTV marker offset must fall within the clip duration.',
          );
        }
      });
      if (evidence.transcript) validateBlocks(evidence.transcript, `${basePath}.transcript`);
      return;
    case 'webpage':
      if (evidence.heroImage) validateMedia(evidence.heroImage, `${basePath}.heroImage`, add);
      validateBlocks(evidence.body, `${basePath}.body`);
      return;
    case 'statement':
      validateBlocks(evidence.paragraphs, `${basePath}.paragraphs`);
      return;
  }
}

function validateMedia(
  media: EvidenceMediaReference,
  path: string,
  add: (code: string, path: string, message: string) => void,
) {
  if (!media.assetId.trim()) {
    add('REQUIRED_ID', `${path}.assetId`, 'Media requires a stable asset ID.');
  }
  if (!media.altText.trim()) {
    add('REQUIRED', `${path}.altText`, 'Media requires accessibility text.');
  }
  if (media.width <= 0 || media.height <= 0) {
    add('INVALID_DIMENSIONS', path, 'Media dimensions must be positive.');
  }
}

function validateFictionalInternet(
  definition: CaseDefinition,
  conditionIds: {
    sceneIds: ReadonlySet<string>;
    evidenceIds: ReadonlySet<string>;
    deductionIds: ReadonlySet<string>;
  },
  add: (code: string, path: string, message: string) => void,
) {
  const sites = definition.investigation.internet.sites;
  const siteIds = sites.map((site) => site.id);
  const identityIds = sites.map((site) => site.identity.identityId);
  const fictionalHosts = sites.map((site) => site.identity.fictionalHost);
  const visualSignatures = sites.map((site) =>
    JSON.stringify([
      site.identity.layout,
      site.identity.typography,
      site.identity.shape,
      site.identity.logoText,
      site.identity.colors,
    ]),
  );

  for (const id of duplicates(siteIds)) {
    add('DUPLICATE_ID', 'investigation.internet.sites', `Duplicate fictional site id "${id}".`);
  }
  for (const id of duplicates(identityIds)) {
    add(
      'DUPLICATE_SITE_IDENTITY',
      'investigation.internet.sites',
      `Fictional site identity "${id}" is reused. Each site requires its own identity.`,
    );
  }
  for (const host of duplicates(fictionalHosts)) {
    add(
      'DUPLICATE_FICTIONAL_HOST',
      'investigation.internet.sites',
      `Fictional host "${host}" is assigned to more than one site.`,
    );
  }
  if (new Set(visualSignatures).size !== visualSignatures.length) {
    add(
      'DUPLICATE_SITE_IDENTITY',
      'investigation.internet.sites',
      'Two fictional sites have identical visual identity definitions.',
    );
  }

  const siteMap = new Map(sites.map((site) => [site.id, site]));
  sites.forEach((site, siteIndex) => {
    const sitePath = `investigation.internet.sites[${siteIndex}]`;
    if (!site.id.trim() || !site.identity.identityId.trim()) {
      add('REQUIRED_ID', sitePath, 'Fictional site and identity IDs are required.');
    }
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+invalid$/i.test(
        site.identity.fictionalHost,
      )
    ) {
      add(
        'NON_FICTIONAL_HOST',
        `${sitePath}.identity.fictionalHost`,
        'Fictional hosts must be valid reserved .invalid hostnames and omit a scheme.',
      );
    }
    if (
      !site.identity.name.trim() ||
      !site.identity.shortName.trim() ||
      !site.identity.tagline.trim() ||
      !site.identity.logoText.trim()
    ) {
      add(
        'REQUIRED',
        `${sitePath}.identity`,
        'Fictional sites require authored names, logo text, and a tagline.',
      );
    }
    if (
      Object.values(site.identity.colors).some(
        (color) => !/^#[0-9a-f]{6}$/i.test(color),
      )
    ) {
      add(
        'INVALID_SITE_COLOR',
        `${sitePath}.identity.colors`,
        'Fictional site colors must be six-digit hex values.',
      );
    }
    validateCondition(site.openWhen, `${sitePath}.openWhen`, conditionIds, add);

    const pageIds = site.pages.map((page) => page.id);
    const pagePaths = site.pages.map((page) => page.path);
    for (const id of duplicates(pageIds)) {
      add('DUPLICATE_ID', `${sitePath}.pages`, `Duplicate page id "${id}".`);
    }
    for (const path of duplicates(pagePaths)) {
      add('DUPLICATE_PAGE_PATH', `${sitePath}.pages`, `Duplicate local page path "${path}".`);
    }
    if (site.pages.length === 0) {
      add('EMPTY_FICTIONAL_SITE', `${sitePath}.pages`, `Fictional site "${site.id}" requires at least one page.`);
    }
    if (!pageIds.includes(site.homePageId)) {
      add(
        'UNKNOWN_REFERENCE',
        `${sitePath}.homePageId`,
        `Home page "${site.homePageId}" does not exist on site "${site.id}".`,
      );
    }

    site.pages.forEach((page, pageIndex) => {
      const pagePath = `${sitePath}.pages[${pageIndex}]`;
      if (
        !page.id.trim() ||
        !/^\/(?:[a-z0-9][a-z0-9/_-]*)?$/i.test(page.path)
      ) {
        add(
          'REQUIRED_ID',
          pagePath,
          'Fictional pages require an ID and a normalized local slash path.',
        );
      }
      if (!page.title.trim() || !page.description.trim()) {
        add(
          'REQUIRED',
          pagePath,
          `Fictional page "${page.id}" requires a title and description.`,
        );
      }
      const blockIds = page.blocks.map((block) => block.id);
      const linkIds = page.links.map((link) => link.id);
      for (const id of duplicates(blockIds)) {
        add('DUPLICATE_ID', `${pagePath}.blocks`, `Duplicate page block id "${id}".`);
      }
      for (const id of duplicates(linkIds)) {
        add('DUPLICATE_ID', `${pagePath}.links`, `Duplicate page link id "${id}".`);
      }
      if (page.blocks.length === 0) {
        add(
          'EMPTY_FICTIONAL_PAGE',
          `${pagePath}.blocks`,
          `Fictional page "${page.id}" requires authored content.`,
        );
      }
      page.blocks.forEach((block, blockIndex) => {
        const blockPath = `${pagePath}.blocks[${blockIndex}]`;
        if (!block.id.trim()) {
          add('REQUIRED_ID', blockPath, 'Page blocks require stable IDs.');
        }
        const image =
          block.type === 'image'
            ? block.image
            : block.type === 'profile' || block.type === 'product'
              ? block.image
              : undefined;
        if (image && (!image.assetId.trim() || !image.altText.trim())) {
          add(
            'REQUIRED_ID',
            `${blockPath}.image`,
            'Fictional website images require a local asset ID and accessibility text.',
          );
        }
        if (image && (!Number.isFinite(image.aspectRatio) || image.aspectRatio <= 0)) {
          add(
            'INVALID_DIMENSIONS',
            `${blockPath}.image.aspectRatio`,
            'Fictional website image aspect ratio must be positive.',
          );
        }
      });
      page.links.forEach((link, linkIndex) => {
        if (!link.id.trim() || !link.label.trim()) {
          add(
            'REQUIRED_ID',
            `${pagePath}.links[${linkIndex}]`,
            'Local links require a stable ID and visible label.',
          );
        }
      });
      page.revealsEvidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!conditionIds.evidenceIds.has(evidenceId)) {
          add(
            'UNKNOWN_REFERENCE',
            `${pagePath}.revealsEvidenceIds[${evidenceIndex}]`,
            `Website clue evidence "${evidenceId}" does not exist.`,
          );
        }
      });
    });
  });

  sites.forEach((site, siteIndex) => {
    site.pages.forEach((page, pageIndex) => {
      page.links.forEach((link, linkIndex) => {
        const targetSite = siteMap.get(link.targetSiteId);
        const path = `investigation.internet.sites[${siteIndex}].pages[${pageIndex}].links[${linkIndex}]`;
        if (!targetSite) {
          add(
            'UNKNOWN_REFERENCE',
            path,
            `Local link targets unknown site "${link.targetSiteId}".`,
          );
        } else if (!targetSite.pages.some((item) => item.id === link.targetPageId)) {
          add(
            'UNKNOWN_REFERENCE',
            path,
            `Local link targets unknown page "${link.targetPageId}" on site "${link.targetSiteId}".`,
          );
        }
      });
    });
  });
}
