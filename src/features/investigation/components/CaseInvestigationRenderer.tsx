import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  type CaseAction,
  type CaseDefinition,
  type DeductionId,
  type EvidenceId,
  type OptionId,
  type QuestionId,
  createInitialCasePlayerState,
  createInvestigationViewModel,
} from '@/case-engine';
import { useAmbientBed } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { revealIn, useReduceMotion } from '@/design-system/motion/motionSystem';
import { palette, radius, spacing, touch } from '@/design-system/theme/tokens';
import {
  useInvestigationContext,
  useRestoredScroll,
} from '@/navigation/investigationContext';

import { CaseConclusionSequence } from './CaseConclusionSequence';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

export type InvestigationSection = 'hub' | 'evidence' | 'leads' | 'notebook';

interface CaseInvestigationRendererProps {
  definition: CaseDefinition;
  section: InvestigationSection;
}

export function CaseInvestigationRenderer({
  definition,
  section,
}: CaseInvestigationRendererProps) {
  // Out on the case: the city carries on underneath the investigation.
  useAmbientBed('ambient-distant-city');
  const persistedState = useCaseSessionStore(
    (store) => store.sessions[definition.id],
  );
  const dispatchCaseAction = useCaseSessionStore(
    (store) => store.dispatchCaseAction,
  );
  const hapticsEnabled = useAppStore((store) => store.settings.hapticsEnabled);
  const [engineError, setEngineError] = useState<string | null>(null);
  // Half-finished reasoning survives a trip through evidence, people, and
  // back again; it is navigation context, never persisted case truth.
  const deductionSelections = useInvestigationContext(
    (store) => store.deductionSelections[definition.id],
  ) as Readonly<Record<DeductionId, readonly EvidenceId[]>> | undefined;
  const accusationAnswers = useInvestigationContext(
    (store) => store.accusationAnswers[definition.id],
  ) as Readonly<Record<QuestionId, OptionId>> | undefined;
  /**
   * PHASE 16 — stable identity, always-fresh data.
   *
   * The selection map lives in the navigation store, so the handler can read
   * the current value with `getState()` instead of closing over it. That keeps
   * one function identity for the life of the screen, which is what lets the
   * memoised deduction rows stay mounted and untouched while one checkbox
   * changes — previously a single tick re-rendered every row in the picker.
   */
  const toggleDeductionEvidence = useCallback(
    (deductionId: DeductionId, evidenceId: EvidenceId) => {
      const store = useInvestigationContext.getState();
      const all = (store.deductionSelections[definition.id] ?? {}) as Record<
        DeductionId,
        readonly EvidenceId[]
      >;
      const current = all[deductionId] ?? [];
      const next = current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId];
      store.setDeductionSelections(definition.id, { ...all, [deductionId]: next });
    },
    [definition.id],
  );
  const setAccusationAnswers = (
    value: Readonly<Record<QuestionId, OptionId>>,
  ) =>
    useInvestigationContext
      .getState()
      .setAccusationAnswers(definition.id, value);

  const playerState =
    persistedState ?? createInitialCasePlayerState(definition);
  const contentVersionMatches =
    playerState.contentVersion === definition.contentVersion;
  const view = useMemo(
    () => createInvestigationViewModel(definition, playerState),
    [definition, playerState],
  );

  const openEvidenceId = useCaseSessionStore(
    (store) => store.progress[definition.id]?.openEvidenceId ?? null,
  );
  const resumableEvidence = definition.investigation.evidence.find(
    (item) =>
      item.id === openEvidenceId &&
      (persistedState?.discoveredEvidenceIds.includes(item.id) ?? false),
  );

  // Stable: it is handed to every section and, through them, to the memoised
  // deduction blocks. An unstable dispatch would re-render all of them on
  // every keystroke of state anywhere in the case.
  const dispatch = useCallback(
    (action: CaseAction) => {
      const result = dispatchCaseAction(definition, action);
      setEngineError(result.ok ? null : result.error.message);
    },
    [definition, dispatchCaseAction],
  );

  if (!contentVersionMatches) {
    return (
      <EngineMessage
        code="CONTENT MIGRATION REQUIRED"
        message="This saved investigation was created with another content version. Progress must be migrated before play continues."
        title="Case file update required"
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.channelBar}>
        <View style={styles.channelIdentity}>
          <View style={styles.activeDot} />
          <AppText variant="mono" color={palette.moss} numberOfLines={1}>
            CASE CHANNEL / ACTIVE
          </AppText>
        </View>
        <AppText variant="mono" color={palette.paperMuted} numberOfLines={1}>
          TURN {String(view.turn).padStart(3, '0')}
        </AppText>
      </View>

      {engineError ? (
        <View accessibilityRole="alert" style={styles.errorBar}>
          <Ionicons color={palette.rust} name="warning-outline" size={16} />
          <AppText
            variant="bodySmall"
            color={palette.paper}
            style={styles.errorCopy}
          >
            {engineError}
          </AppText>
        </View>
      ) : null}

      {view.resolution ? (
        <CaseConclusionSequence hapticsEnabled={hapticsEnabled} view={view} />
      ) : section === 'hub' ? (
        <HubSection
          scrollKey={`${definition.id}:hub`}
          resumeEvidence={
            resumableEvidence
              ? { id: resumableEvidence.id, title: resumableEvidence.title }
              : null
          }
          definition={definition}
          dispatch={dispatch}
          hapticsEnabled={hapticsEnabled}
          view={view}
        />
      ) : section === 'evidence' ? (
        <EvidenceSection
          hapticsEnabled={hapticsEnabled}
          scrollKey={`${definition.id}:evidence`}
          view={view}
        />
      ) : section === 'leads' ? (
        <LeadsSection
          dispatch={dispatch}
          hapticsEnabled={hapticsEnabled}
          scrollKey={`${definition.id}:leads`}
          onToggleEvidence={toggleDeductionEvidence}
          selections={deductionSelections ?? {}}
          view={view}
        />
      ) : (
        <NotebookSection
          answers={accusationAnswers ?? {}}
          scrollKey={`${definition.id}:notebook`}
          dispatch={dispatch}
          hapticsEnabled={hapticsEnabled}
          setAnswers={setAccusationAnswers}
          view={view}
        />
      )}
    </View>
  );
}

function HubSection({
  definition,
  view,
  dispatch,
  hapticsEnabled,
  resumeEvidence,
  scrollKey,
}: {
  definition: CaseDefinition;
  view: ReturnType<typeof createInvestigationViewModel>;
  dispatch: (action: CaseAction) => void;
  hapticsEnabled: boolean;
  resumeEvidence: { id: string; title: string } | null;
  scrollKey: string;
}) {
  const scroll = useRestoredScroll(scrollKey);
  const motionEnabled = !useReduceMotion();
  if (view.phase === 'briefing') {
    return (
      <ScrollView contentContainerStyle={styles.sectionContent}>
        <AppText variant="mono" color={palette.rust}>
          {view.classification}
        </AppText>
        <AppText accessibilityRole="header" variant="display" style={styles.sectionTitle}>
          {view.title}
        </AppText>
        <AppText variant="body" color={palette.paperMuted}>
          {view.brief.summary}
        </AppText>
        <View style={styles.objectiveList}>
          {view.brief.objectives.map((objective, index) => (
            <View key={objective.id} style={styles.objectiveRow}>
              <AppText variant="mono" color={palette.rust}>
                {String(index + 1).padStart(2, '0')}
              </AppText>
              <AppText variant="body" style={styles.objectiveCopy}>
                {objective.text}
              </AppText>
            </View>
          ))}
        </View>
        <GameButton
          hapticsEnabled={hapticsEnabled}
          onPress={() => dispatch({ type: 'BEGIN_INVESTIGATION' })}
        >
          BEGIN INVESTIGATION
        </GameButton>
      </ScrollView>
    );
  }

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.sectionContent}>
      {/* The environment assembles in the order the brief left off: the scene
          the player is standing in first, then everything available from it. */}
      {resumeEvidence ? (
        <TactilePressable
          accessibilityLabel={`Resume viewing ${resumeEvidence.title}`}
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={() =>
            router.push({
              pathname: '/evidence/[evidenceId]',
              params: { evidenceId: resumeEvidence.id },
            })
          }
          style={styles.resumeStrip}
        >
          <Ionicons color={palette.brass} name="play-back-outline" size={19} />
          <View style={styles.resumeCopy}>
            <AppText variant="mono" color={palette.brass}>
              RESUME WHERE YOU STOPPED
            </AppText>
            <AppText
              variant="bodySmall"
              color={palette.paper}
              numberOfLines={2}
            >
              {resumeEvidence.title}
            </AppText>
          </View>
          <Ionicons
            color={palette.paperMuted}
            name="chevron-forward"
            size={18}
          />
        </TactilePressable>
      ) : null}

      <Animated.View entering={revealIn(motionEnabled, 0)}>
        <AppText variant="mono" color={palette.rust}>
          CURRENT SCENE
        </AppText>
        <AppText accessibilityRole="header" variant="display" style={styles.sectionTitle}>
          {view.currentScene?.title ?? definition.metadata.title}
        </AppText>
        <AppText variant="body" color={palette.paperMuted}>
          {view.currentScene?.summary ?? definition.metadata.subtitle}
        </AppText>
      </Animated.View>

      <Animated.View
        entering={revealIn(motionEnabled, 1)}
        style={styles.registryHeader}
      >
        <AppText variant="label" color={palette.paperMuted}>
          AVAILABLE SCENES
        </AppText>
        <AppText variant="mono" color={palette.moss}>
          {view.progress.visitedScenes}/{view.progress.totalScenes} VISITED
        </AppText>
      </Animated.View>
      {view.availableScenes.map((scene, index) => (
        <Animated.View
          entering={revealIn(motionEnabled, index + 2)}
          key={scene.id}
        >
          <TactilePressable
            accessibilityHint={
              scene.current ? 'You are already here' : 'Moves the investigation to this location'
            }
            accessibilityLabel={`Go to ${scene.title}. ${scene.visited ? 'Already visited' : 'Not yet visited'}.`}
            accessibilityRole="button"
            accessibilityState={{ selected: scene.current }}
            hapticsEnabled={hapticsEnabled}
            onPress={() => dispatch({ type: 'VISIT_SCENE', sceneId: scene.id })}
            pressedScale={0.99}
            style={[styles.registryRow, scene.current && styles.currentRow]}
          >
            <AppText
              variant="mono"
              color={scene.current ? palette.brass : palette.rust}
            >
              {String(index + 1).padStart(2, '0')}
            </AppText>
            <View style={styles.registryCopy}>
              <AppText variant="body">{scene.title}</AppText>
              <AppText variant="mono" color={palette.paperMuted}>
                {scene.visited ? 'VISITED' : 'UNVISITED'} ·{' '}
                {scene.kind.toUpperCase()}
              </AppText>
            </View>
            <Ionicons
              color={palette.paperMuted}
              name="chevron-forward"
              size={18}
            />
          </TactilePressable>
        </Animated.View>
      ))}

      {view.suspects.length > 0 ? (
        <View style={styles.suspectRoster}>
          <View style={styles.registryHeader}>
            <AppText variant="label" color={palette.paperMuted}>
              PERSONS OF INTEREST
            </AppText>
            <AppText variant="mono" color={palette.rust}>
              {String(view.suspects.length).padStart(2, '0')} PROFILES
            </AppText>
          </View>
          {view.suspects.map((suspect, index) => (
            <View key={suspect.id} style={styles.suspectRow}>
              <View style={styles.suspectIndex}>
                <AppText variant="mono" color={palette.brass}>
                  S{String(index + 1).padStart(2, '0')}
                </AppText>
              </View>
              <View style={styles.suspectCopy}>
                <AppText variant="title" style={styles.suspectName}>
                  {suspect.name}
                </AppText>
                <AppText variant="mono" color={palette.rust}>
                  {suspect.role.toUpperCase()}
                </AppText>
                <AppText variant="bodySmall" color={palette.paperMuted}>
                  {suspect.summary}
                </AppText>
                <View style={styles.alibiLine}>
                  <AppText variant="mono" color={palette.moss}>
                    STATED ALIBI
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color={palette.paper}
                    style={styles.alibiCopy}
                  >
                    {suspect.statedAlibi}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function EvidenceSection({
  view,
  hapticsEnabled,
  scrollKey,
}: {
  view: ReturnType<typeof createInvestigationViewModel>;
  hapticsEnabled: boolean;
  scrollKey: string;
}) {
  const scroll = useRestoredScroll(scrollKey);

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.sectionContent}>
      <AppText variant="mono" color={palette.rust}>
        EVIDENCE INDEX
      </AppText>
      <AppText variant="title" style={styles.sectionTitle}>
        Discovered material
      </AppText>
      <AppText variant="bodySmall" color={palette.paperMuted}>
        {view.progress.discoveredEvidence}/{view.progress.totalEvidence}{' '}
        recovered · {view.progress.viewedEvidence} viewed ·{' '}
        {view.progress.evidenceConnections} connected
      </AppText>

      <View style={styles.evidenceList}>
        {view.discoveredEvidence.length === 0 ? (
          <EngineMessage
            code="NO MATERIAL"
            message="Visit an available scene to discover authored evidence."
            title="Evidence index empty"
          />
        ) : (
          view.discoveredEvidence.map((evidence, index) => (
            <EvidenceIndexRow
              evidence={evidence}
              hapticsEnabled={hapticsEnabled}
              index={index}
              key={evidence.id}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

type IndexedEvidence =
  ReturnType<typeof createInvestigationViewModel>['discoveredEvidence'][number];

/**
 * PHASE 16 — a memoised row for the evidence index.
 *
 * Forty-eight of these are mounted on the Evidence tab. Viewing one artifact
 * changes one row's badges, and previously re-rendered all forty-eight because
 * the list was an inline `.map` in a section that re-renders on every engine
 * dispatch. Now one row re-renders.
 */
const EvidenceIndexRow = memo(function EvidenceIndexRow({
  evidence,
  hapticsEnabled,
  index,
}: {
  evidence: IndexedEvidence;
  hapticsEnabled: boolean;
  index: number;
}) {
  return (
    <TactilePressable
      accessibilityHint="Open full-screen evidence inspection"
      accessibilityLabel={`Open ${evidence.title}, ${evidence.type} evidence`}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      onPress={() =>
        router.push({
          pathname: '/evidence/[evidenceId]',
          params: { evidenceId: evidence.id },
        })
      }
      pressedScale={0.99}
      style={styles.evidenceRow}
    >
      <AppText variant="mono" color={palette.rust}>
        E-{String(index + 1).padStart(2, '0')}
      </AppText>
      <View style={styles.evidenceCopy}>
        <AppText variant="title" style={styles.rowTitle}>
          {evidence.title}
        </AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {evidence.type.toUpperCase()} · {evidence.source}
        </AppText>
        <AppText variant="bodySmall" color={palette.paperMuted} numberOfLines={2}>
          {evidence.summary}
        </AppText>
        <View style={styles.evidenceStates}>
          {evidence.viewed ? (
            <AppText variant="mono" color={palette.moss}>
              VIEWED
            </AppText>
          ) : null}
          {evidence.referenced ? (
            <AppText variant="mono" color={palette.brass}>
              REFERENCED
            </AppText>
          ) : null}
          {evidence.connected ? (
            <AppText variant="mono" color={palette.brass}>
              CONNECTED
            </AppText>
          ) : null}
          {evidence.usedInTheory ? (
            <AppText variant="mono" color={palette.rust}>
              IN THEORY
            </AppText>
          ) : null}
        </View>
      </View>
      <Ionicons color={palette.paperMuted} name="expand-outline" size={19} />
    </TactilePressable>
  );
});

function LeadsSection({
  view,
  dispatch,
  hapticsEnabled,
  onToggleEvidence,
  scrollKey,
  selections,
}: {
  view: ReturnType<typeof createInvestigationViewModel>;
  dispatch: (action: CaseAction) => void;
  hapticsEnabled: boolean;
  onToggleEvidence: (deductionId: DeductionId, evidenceId: EvidenceId) => void;
  scrollKey: string;
  selections: Readonly<Record<DeductionId, readonly EvidenceId[]>>;
}) {
  const scroll = useRestoredScroll(scrollKey);
  /**
   * PHASE 16 — one evidence picker is mounted at a time.
   *
   * Every unsolved deduction used to render a checkbox for every discovered
   * artifact. Late in Case 001 that is six open deductions against forty-eight
   * artifacts: 288 pressables, near 1,500 views, mounted in a single
   * ScrollView. On a mid-range Android that is a visible stall every time the
   * Leads tab is opened, and it is pure waste — a player works one deduction
   * at a time.
   *
   * Nothing is hidden and nothing is removed: the deduction being worked is
   * open, the rest are one tap away, and the first unsolved one is open by
   * default so the ordinary path is unchanged.
   */
  const [expandedDeductionId, setExpandedDeductionId] = useState<
    DeductionId | null
  >(null);
  const firstUnsolvedId =
    view.availableDeductions.find((deduction) => !deduction.solved)?.id ?? null;

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.sectionContent}>
      <AppText variant="mono" color={palette.rust}>
        DEDUCTION DESK
      </AppText>
      <AppText variant="title" style={styles.sectionTitle}>
        Test a theory
      </AppText>

      <View style={styles.boardLauncher}>
        <View style={styles.boardLauncherMark}>
          <Ionicons color={palette.brass} name="albums-outline" size={28} />
        </View>
        <View style={styles.boardLauncherCopy}>
          <AppText variant="label" color={palette.brass}>
            TOUCH EVIDENCE WALL
          </AppText>
          <AppText variant="bodySmall" color={palette.paperMuted}>
            Arrange artifacts, pull strings, mark contradictions, and build
            theory clusters.
          </AppText>
        </View>
        <TactilePressable
          accessibilityLabel="Open full-screen evidence board"
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.push('/board')}
          style={styles.boardLaunchButton}
        >
          <Ionicons color={palette.black} name="expand-outline" size={21} />
        </TactilePressable>
      </View>

      {view.knownRelationships.length > 0 ? (
        <View style={styles.relationships}>
          <View style={styles.registryHeader}>
            <AppText variant="label" color={palette.paperMuted}>
              ESTABLISHED RELATIONSHIPS
            </AppText>
            <AppText variant="mono" color={palette.brass}>
              {view.knownRelationships.length} KNOWN
            </AppText>
          </View>
          {view.knownRelationships.map((relationship) => {
            const from = view.suspects.find(
              (suspect) => suspect.id === relationship.fromSuspectId,
            );
            const to = view.suspects.find(
              (suspect) => suspect.id === relationship.toSuspectId,
            );
            return (
              <View key={relationship.id} style={styles.relationshipRow}>
                <View style={styles.relationshipNodes}>
                  <AppText
                    variant="bodySmall"
                    color={palette.paper}
                    numberOfLines={1}
                  >
                    {from?.name ?? relationship.fromSuspectId}
                  </AppText>
                  <Ionicons
                    color={palette.rust}
                    name="git-commit-outline"
                    size={18}
                  />
                  <AppText
                    variant="bodySmall"
                    color={palette.paper}
                    numberOfLines={1}
                  >
                    {to?.name ?? relationship.toSuspectId}
                  </AppText>
                </View>
                <AppText variant="label" color={palette.brass}>
                  {relationship.label.toUpperCase()}
                </AppText>
                <AppText variant="bodySmall" color={palette.paperMuted}>
                  {relationship.summary}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}

      {view.availableDeductions.map((deduction) => (
        <DeductionBlock
          deduction={deduction}
          dispatch={dispatch}
          discoveredEvidence={view.discoveredEvidence}
          expanded={
            expandedDeductionId === null
              ? deduction.id === firstUnsolvedId
              : expandedDeductionId === deduction.id
          }
          hapticsEnabled={hapticsEnabled}
          key={deduction.id}
          onToggleEvidence={onToggleEvidence}
          onToggleExpanded={setExpandedDeductionId}
          selectedEvidenceIds={selections[deduction.id] ?? EMPTY_SELECTION}
        />
      ))}

      {view.availableDeductions.length === 0 ? (
        <EngineMessage
          code="NO OPEN DEDUCTIONS"
          message="Inspect more evidence to unlock authored deduction rules."
          title="No theory available"
        />
      ) : null}
    </ScrollView>
  );
}

const EMPTY_SELECTION: readonly EvidenceId[] = [];

type AvailableDeduction =
  ReturnType<typeof createInvestigationViewModel>['availableDeductions'][number];
type DiscoveredEvidence =
  ReturnType<typeof createInvestigationViewModel>['discoveredEvidence'];

/**
 * One row of the evidence picker.
 *
 * Memoised on purpose: toggling a single checkbox used to re-render every
 * other row in the list, because the whole block was one inline `.map`.
 */
const EvidenceChoiceRow = memo(function EvidenceChoiceRow({
  deductionId,
  evidenceId,
  hapticsEnabled,
  onToggle,
  selected,
  title,
}: {
  deductionId: DeductionId;
  evidenceId: EvidenceId;
  hapticsEnabled: boolean;
  onToggle: (deductionId: DeductionId, evidenceId: EvidenceId) => void;
  selected: boolean;
  title: string;
}) {
  return (
    <TactilePressable
      accessibilityLabel={`Use ${title} in this deduction`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      hapticsEnabled={hapticsEnabled}
      onPress={() => onToggle(deductionId, evidenceId)}
      style={styles.choiceRow}
    >
      <Ionicons
        color={selected ? palette.brass : palette.line}
        name={selected ? 'checkbox' : 'square-outline'}
        size={20}
      />
      <AppText variant="bodySmall" style={styles.choiceCopy}>
        {title}
      </AppText>
    </TactilePressable>
  );
});

const DeductionBlock = memo(function DeductionBlock({
  deduction,
  discoveredEvidence,
  dispatch,
  expanded,
  hapticsEnabled,
  onToggleEvidence,
  onToggleExpanded,
  selectedEvidenceIds,
}: {
  deduction: AvailableDeduction;
  discoveredEvidence: DiscoveredEvidence;
  dispatch: (action: CaseAction) => void;
  expanded: boolean;
  hapticsEnabled: boolean;
  onToggleEvidence: (deductionId: DeductionId, evidenceId: EvidenceId) => void;
  onToggleExpanded: (deductionId: DeductionId | null) => void;
  selectedEvidenceIds: readonly EvidenceId[];
}) {
  const open = expanded && !deduction.solved;

  return (
    <View style={styles.deductionBlock}>
      <TactilePressable
        accessibilityHint={
          deduction.solved
            ? undefined
            : 'Opens the evidence for this deduction'
        }
        accessibilityLabel={deduction.prompt}
        accessibilityRole={deduction.solved ? 'text' : 'button'}
        accessibilityState={{ expanded: open }}
        disabled={deduction.solved}
        feedback="none"
        hapticsEnabled={hapticsEnabled}
        onPress={() => onToggleExpanded(open ? null : deduction.id)}
        style={styles.deductionHeading}
      >
        <AppText variant="body" style={styles.deductionPrompt}>
          {deduction.prompt}
        </AppText>
        <AppText
          variant="mono"
          color={deduction.solved ? palette.moss : palette.paperMuted}
        >
          {deduction.solved ? 'SOLVED' : `${deduction.attempts} ATTEMPTS`}
        </AppText>
      </TactilePressable>

      {deduction.hintAvailable && !deduction.solved ? (
        deduction.hintUsed ? (
          <View style={styles.hintRevealed}>
            <Ionicons color={palette.brass} name="bulb" size={16} />
            <AppText variant="bodySmall" color={palette.paper} style={styles.hintCopy}>
              {deduction.hint}
            </AppText>
          </View>
        ) : (
          <TactilePressable
            accessibilityLabel={`Spend a hint for ${deduction.prompt}`}
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => dispatch({ type: 'USE_HINT', deductionId: deduction.id })}
            style={styles.hintRequest}
          >
            <Ionicons color={palette.paperMuted} name="bulb-outline" size={16} />
            <AppText variant="mono" color={palette.paperMuted} style={styles.hintCopy}>
              SPEND A HINT
            </AppText>
          </TactilePressable>
        )
      ) : null}

      {deduction.solved ? null : open ? (
        <>
          {discoveredEvidence.map((evidence) => (
            <EvidenceChoiceRow
              deductionId={deduction.id}
              evidenceId={evidence.id}
              hapticsEnabled={hapticsEnabled}
              key={evidence.id}
              onToggle={onToggleEvidence}
              selected={selectedEvidenceIds.includes(evidence.id)}
              title={evidence.title}
            />
          ))}
          <GameButton
            accessibilityLabel={`Submit deduction: ${deduction.prompt}`}
            hapticsEnabled={hapticsEnabled}
            onPress={() =>
              dispatch({
                type: 'SUBMIT_DEDUCTION',
                deductionId: deduction.id,
                evidenceIds: selectedEvidenceIds,
              })
            }
            tone="outline"
          >
            TEST DEDUCTION
          </GameButton>
        </>
      ) : (
        <View style={styles.deductionClosed}>
          <Ionicons color={palette.paperMuted} name="chevron-down" size={15} />
          <AppText variant="mono" color={palette.paperMuted}>
            SELECT EVIDENCE
            {selectedEvidenceIds.length > 0
              ? ` · ${selectedEvidenceIds.length} HELD`
              : ''}
          </AppText>
        </View>
      )}
    </View>
  );
});


function NotebookSection({
  view,
  dispatch,
  hapticsEnabled,
  answers,
  scrollKey,
  setAnswers,
}: {
  view: ReturnType<typeof createInvestigationViewModel>;
  dispatch: (action: CaseAction) => void;
  hapticsEnabled: boolean;
  answers: Readonly<Record<QuestionId, OptionId>>;
  scrollKey: string;
  setAnswers: (value: Readonly<Record<QuestionId, OptionId>>) => void;
}) {
  const scroll = useRestoredScroll(scrollKey);

  return (
    <ScrollView {...scroll} contentContainerStyle={styles.sectionContent}>
      <AppText variant="mono" color={palette.rust}>
        CASE OBJECTIVES
      </AppText>
      {view.brief.objectives.map((objective, index) => (
        <View key={objective.id} style={styles.objectiveRow}>
          <AppText variant="mono" color={palette.paperMuted}>
            {String(index + 1).padStart(2, '0')}
          </AppText>
          <AppText variant="body" style={styles.objectiveCopy}>
            {objective.text}
          </AppText>
        </View>
      ))}

      <View style={styles.progressRule}>
        <AppText variant="mono" color={palette.moss}>
          {view.progress.solvedDeductions}/{view.progress.totalDeductions}{' '}
          DEDUCTIONS
        </AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {view.progress.discoveredEvidence}/{view.progress.totalEvidence}{' '}
          EVIDENCE
        </AppText>
      </View>

      {view.knownTimeline.length > 0 ? (
        <View style={styles.timeline}>
          <View style={styles.registryHeader}>
            <AppText variant="label" color={palette.paperMuted}>
              VERIFIED TIMELINE
            </AppText>
            <AppText variant="mono" color={palette.rust}>
              {view.knownTimeline.length} EVENTS ·{' '}
              {view.progress.pinnedTimelineEvents} PINNED
            </AppText>
          </View>
          {view.knownTimeline.map((event, index) => (
            <TimelineEventRow
              dispatch={dispatch}
              event={event}
              hapticsEnabled={hapticsEnabled}
              index={index}
              key={event.id}
            />
          ))}
        </View>
      ) : null}

      {view.accusation ? (
        <View style={styles.accusation}>
          <AppText variant="label" color={palette.rust}>
            FINAL ACCUSATION
          </AppText>
          <AppText variant="title" style={styles.sectionTitle}>
            {view.accusation.title}
          </AppText>
          <AppText variant="body" color={palette.paperMuted}>
            {view.accusation.prompt}
          </AppText>
          {view.accusation.questions.map((question) => (
            <View key={question.id} style={styles.questionBlock}>
              <AppText variant="body">{question.prompt}</AppText>
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <TactilePressable
                    key={option.id}
                    accessibilityLabel={`Answer: ${option.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    hapticsEnabled={hapticsEnabled}
                    onPress={() =>
                      setAnswers({ ...answers, [question.id]: option.id })
                    }
                    style={styles.choiceRow}
                  >
                    <Ionicons
                      color={selected ? palette.brass : palette.line}
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                    />
                    <AppText variant="bodySmall" style={styles.choiceCopy}>
                      {option.label}
                    </AppText>
                  </TactilePressable>
                );
              })}
            </View>
          ))}
          <GameButton
            accessibilityHint="Closes the case with the answers you have selected"
            accessibilityLabel="Submit conclusion"
            hapticsEnabled={hapticsEnabled}
            onPress={() => dispatch({ type: 'SUBMIT_ACCUSATION', answers })}
          >
            SUBMIT ACCUSATION
          </GameButton>
        </View>
      ) : (
        <EngineMessage
          code="ACCUSATION LOCKED"
          message="Complete the authored investigation conditions before making a final accusation."
          title="Continue investigating"
        />
      )}
    </ScrollView>
  );
}

function EngineMessage({
  code,
  title,
  message,
}: {
  code: string;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.message}>
      <AppText variant="mono" color={palette.rust}>
        {code}
      </AppText>
      <AppText variant="title" style={styles.messageTitle}>
        {title}
      </AppText>
      <AppText variant="bodySmall" color={palette.paperMuted}>
        {message}
      </AppText>
    </View>
  );
}

function TimelineEventRow({
  dispatch,
  event,
  hapticsEnabled,
  index,
}: {
  dispatch: (action: CaseAction) => void;
  event: ReturnType<
    typeof createInvestigationViewModel
  >['knownTimeline'][number];
  hapticsEnabled: boolean;
  index: number;
}) {
  const motionEnabled = !useReduceMotion();

  // Events enter once, in the order they happened. Nothing animates after that;
  // a pinned event is marked by its rule and its bookmark, not by movement.
  return (
    <Animated.View entering={revealIn(motionEnabled, index)}>
      <TactilePressable
        accessibilityLabel={
          event.pinned
            ? `Unpin ${event.title} from the notebook`
            : `Pin ${event.title} to the notebook`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: event.pinned }}
        hapticsEnabled={hapticsEnabled}
        onPress={() =>
          dispatch({
            type: 'SET_TIMELINE_EVENT_PINNED',
            timelineEventId: event.id,
            pinned: !event.pinned,
          })
        }
        pressedScale={0.995}
        style={[styles.timelineRow, event.pinned && styles.timelineRowPinned]}
      >
        <View style={styles.timelineTime}>
          <AppText variant="mono" color={palette.brass}>
            {event.timeLabel}
          </AppText>
          <View
            style={[
              styles.timelineDot,
              event.pinned && styles.timelineDotPinned,
            ]}
          />
        </View>
        <View style={styles.timelineCopy}>
          <AppText variant="body" color={palette.paper}>
            {event.title}
          </AppText>
          <AppText variant="bodySmall" color={palette.paperMuted}>
            {event.summary}
          </AppText>
        </View>
        <Ionicons
          color={event.pinned ? palette.brass : palette.line}
          name={event.pinned ? 'bookmark' : 'bookmark-outline'}
          size={17}
        />
      </TactilePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resumeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: palette.brass,
    borderRadius: radius.sm,
    backgroundColor: palette.charcoalRaised,
  },
  resumeCopy: {
    flex: 1,
    gap: 2,
  },
  hintRequest: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  hintRevealed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: palette.brass,
  },
  hintCopy: {
    flex: 1,
  },
  timelineRowPinned: {
    borderLeftWidth: 2,
    borderLeftColor: palette.brass,
    paddingLeft: spacing.xs,
  },
  root: {
    flex: 1,
  },
  channelBar: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  channelIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.moss,
    marginRight: spacing.xs,
  },
  errorBar: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#2A1916',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.rust,
  },
  errorCopy: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  objectiveList: {
    marginVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  objectiveRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  objectiveCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  registryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  registryRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    paddingHorizontal: spacing.sm,
  },
  currentRow: {
    borderLeftWidth: 2,
    borderLeftColor: palette.brass,
    backgroundColor: palette.inkSoft,
  },
  registryCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  suspectRoster: {
    marginTop: spacing.xl,
  },
  suspectRow: {
    minHeight: 144,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  suspectIndex: {
    width: 42,
    paddingTop: 3,
  },
  suspectCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  suspectName: {
    fontSize: 22,
    lineHeight: 27,
  },
  alibiLine: {
    marginTop: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: palette.moss,
    gap: 3,
  },
  alibiCopy: {
    flex: 1,
  },
  evidenceList: {
    marginTop: spacing.lg,
  },
  evidenceRow: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  evidenceCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
  evidenceStates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowTitle: {
    fontSize: 21,
    lineHeight: 27,
  },
  boardLauncher: {
    minHeight: 104,
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.inkSoft,
  },
  boardLauncherMark: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardLauncherCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  boardLaunchButton: {
    width: 52,
    height: 52,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
  },
  relationships: {
    marginBottom: spacing.lg,
  },
  relationshipRow: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  relationshipNodes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  deductionBlock: {
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  deductionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  deductionPrompt: {
    flex: 1,
  },
  deductionClosed: {
    minHeight: touch.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  choiceRow: {
    minHeight: touch.comfortableTarget,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  choiceCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  progressRule: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
  timeline: {
    marginTop: spacing.lg,
  },
  timelineRow: {
    minHeight: 86,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  timelineTime: {
    width: 76,
    paddingTop: spacing.md,
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: palette.line,
  },
  timelineDot: {
    position: 'absolute',
    top: 20,
    right: -5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.rust,
    borderWidth: 2,
    borderColor: palette.ink,
  },
  timelineDotPinned: {
    backgroundColor: palette.brass,
  },
  timelineCopy: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  accusation: {
    marginTop: spacing.xl,
  },
  questionBlock: {
    marginVertical: spacing.lg,
  },
  message: {
    minHeight: 180,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  messageTitle: {
    marginVertical: spacing.xs,
  },
  resolution: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
