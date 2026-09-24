/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
/* eslint-disable react-hooks/immutability */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVIDENCE_BOARD_HEIGHT,
  EVIDENCE_BOARD_MAX_SCALE,
  EVIDENCE_BOARD_MIN_SCALE,
  EVIDENCE_BOARD_WIDTH,
  type CaseAction,
  type CaseDefinition,
  type CasePlayerState,
  type EvidenceConnectionKind,
} from '@/case-engine';
import {
  confirmationFeedback,
  liftFeedback,
  selectionFeedback,
} from '@/core/feedback/haptics';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { motion, palette, spacing, touch } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import type {
  BoardInteractionMode,
  LiveBoardPlacements,
} from '../types';
import { BoardRelations } from './BoardRelations';
import { EvidenceArtifact } from './EvidenceArtifact';

const CORK_SPECKS = Array.from({ length: 72 }, (_, index) => ({
  id: index,
  left: (index * 193 + 71) % EVIDENCE_BOARD_WIDTH,
  top: (index * 137 + 43) % EVIDENCE_BOARD_HEIGHT,
  size: 1 + (index % 3),
  opacity: 0.1 + (index % 4) * 0.035,
}));

/**
 * The cork itself: a base, eight seams, and seventy-two specks — eighty-one
 * views that never change for the life of the screen. Rendered through `memo`
 * with no props, React reconciles them exactly once instead of rebuilding the
 * element tree on every selection, mode change, and dispatch.
 */
const CorkSurface = memo(function CorkSurface() {
  return (
    <>
      <View style={styles.corkBase} />
      {Array.from({ length: 8 }, (_, index) => (
        <View
          key={`seam-${index}`}
          style={[styles.corkSeam, { top: 96 + index * 174 }]}
        />
      ))}
      {CORK_SPECKS.map((speck) => (
        <View
          key={speck.id}
          style={[
            styles.corkSpeck,
            {
              left: speck.left,
              top: speck.top,
              width: speck.size,
              height: speck.size,
              opacity: speck.opacity,
            },
          ]}
        />
      ))}
    </>
  );
});


/** Spoken summary of the wall, read as one sentence rather than three chips. */
export function describeBoardTally(
  items: number,
  strings: number,
  contradictions: number,
): string {
  const base = `${items} evidence ${items === 1 ? 'card' : 'cards'} on the board, ${strings} ${strings === 1 ? 'string' : 'strings'} pinned`;
  if (contradictions === 0) return `${base}. No contradictions marked.`;
  return `${base}. ${contradictions} ${contradictions === 1 ? 'contradiction' : 'contradictions'} marked.`;
}

export function EvidenceBoard({
  definition,
  playerState,
}: {
  definition: CaseDefinition;
  playerState: CasePlayerState;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const dispatchCaseAction = useCaseSessionStore(
    (state) => state.dispatchCaseAction,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardInteractionMode | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const discoveredEvidence = useMemo(
    () =>
      definition.investigation.evidence.filter((evidence) =>
        playerState.discoveredEvidenceIds.includes(evidence.id),
      ),
    [definition, playerState.discoveredEvidenceIds],
  );
  const contradictionCount = useMemo(
    () =>
      playerState.evidenceConnections.filter(
        (connection) => connection.kind === 'contradicts',
      ).length,
    [playerState.evidenceConnections],
  );
  const persistedPlacements = playerState.evidenceBoard.placements;
  const livePlacements = useSharedValue<LiveBoardPlacements>(
    Object.fromEntries(
      Object.entries(persistedPlacements).map(([id, placement]) => [
        id,
        {
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
          zIndex: placement.zIndex,
        },
      ]),
    ),
  );

  const viewportX = useSharedValue(playerState.evidenceBoard.viewport.x);
  const viewportY = useSharedValue(playerState.evidenceBoard.viewport.y);
  const viewportScale = useSharedValue(playerState.evidenceBoard.viewport.scale);
  const panStartX = useSharedValue(viewportX.value);
  const panStartY = useSharedValue(viewportY.value);
  const pinchStartScale = useSharedValue(viewportScale.value);
  const pinchWorldX = useSharedValue(0);
  const pinchWorldY = useSharedValue(0);
  const pinching = useSharedValue(false);

  /**
   * PHASE 16 — every callback handed to a card is stabilised.
   *
   * `EvidenceArtifact` is wrapped in `memo`, but that was doing nothing: the
   * parent rebuilt `onTap`, `onMoveEnd`, `onLongPress`, `onDoubleTap`, and the
   * `externalGestures` array on every render, so every prop compared unequal
   * and all forty-eight cards re-rendered on a single tap. With stable
   * identities, selecting a card re-renders exactly the two cards whose
   * `selected` prop actually changed.
   */
  const dispatch = useCallback(
    (action: CaseAction) => {
      const result = dispatchCaseAction(definition, action);
      setEngineError(result.ok ? null : result.error.message);
      return result;
    },
    [definition, dispatchCaseAction],
  );

  useEffect(() => {
    dispatchCaseAction(definition, {
      type: 'PLACE_DISCOVERED_EVIDENCE_ON_BOARD',
    });
  }, [definition, dispatchCaseAction, playerState.discoveredEvidenceIds]);

  useEffect(() => {
    // `modify` mutates the shared object in place on the UI thread. The old
    // spread rebuilt the whole placement map, which is the kind of allocation
    // that shows up as a dropped frame the moment a card lands.
    livePlacements.modify((current) => {
      'worklet';
      for (const id in persistedPlacements) {
        const placement = persistedPlacements[id]!;
        current[id] = {
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
          zIndex: placement.zIndex,
        };
      }
      return current;
    });
  }, [livePlacements, persistedPlacements]);

  useEffect(() => {
    const viewport = playerState.evidenceBoard.viewport;
    viewportX.value = reduceMotion
      ? viewport.x
      : withSpring(viewport.x, motion.spring);
    viewportY.value = reduceMotion
      ? viewport.y
      : withSpring(viewport.y, motion.spring);
    viewportScale.value = reduceMotion
      ? viewport.scale
      : withSpring(viewport.scale, motion.spring);
  }, [
    playerState.evidenceBoard.viewport,
    reduceMotion,
    viewportScale,
    viewportX,
    viewportY,
  ]);

  const persistViewport = useCallback(
    (x: number, y: number, scale: number) => {
      dispatchCaseAction(definition, {
        type: 'SET_EVIDENCE_BOARD_VIEWPORT',
        x,
        y,
        scale,
      });
    },
    [definition, dispatchCaseAction],
  );

  // Keep at least a third of the wall on screen at any zoom level.
  const minVisible = Math.min(windowWidth, windowHeight) / 3;

  // Memoised for the same reason as the card gestures: a rebuilt detector is
  // a re-attached native handler, and re-attaching mid-pan drops the pan.
  const twoFingerPan = useMemo(() => Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .averageTouches(true)
    .onBegin(() => {
      panStartX.value = viewportX.value;
      panStartY.value = viewportY.value;
    })
    .onUpdate((event) => {
      if (pinching.value) return;
      // Rubber-banded live tracking keeps the wall under the fingers but
      // never lets it be flung out of reach.
      viewportX.value = rubberBand(
        panStartX.value + event.translationX,
        -EVIDENCE_BOARD_WIDTH * viewportScale.value + minVisible,
        110,
      );
      viewportY.value = rubberBand(
        panStartY.value + event.translationY,
        -EVIDENCE_BOARD_HEIGHT * viewportScale.value + minVisible,
        110,
      );
    })
    .onEnd((event) => {
      if (pinching.value) return;
      const targetX = clamp(
        viewportX.value + event.velocityX * 0.055,
        -EVIDENCE_BOARD_WIDTH * viewportScale.value + minVisible,
        110,
      );
      const targetY = clamp(
        viewportY.value + event.velocityY * 0.055,
        -EVIDENCE_BOARD_HEIGHT * viewportScale.value + minVisible,
        110,
      );
      viewportX.value = withSpring(targetX, {
        ...motion.spring,
        velocity: event.velocityX,
      });
      viewportY.value = withSpring(targetY, {
        ...motion.spring,
        velocity: event.velocityY,
      });
      runOnJS(persistViewport)(targetX, targetY, viewportScale.value);
    }), [
    minVisible,
    panStartX,
    panStartY,
    persistViewport,
    pinching,
    viewportScale,
    viewportX,
    viewportY,
  ]);

  const pinch = useMemo(() => Gesture.Pinch()
    .onStart((event) => {
      pinching.value = true;
      pinchStartScale.value = viewportScale.value;
      pinchWorldX.value =
        (event.focalX - viewportX.value) / viewportScale.value;
      pinchWorldY.value =
        (event.focalY - viewportY.value) / viewportScale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(
        pinchStartScale.value * event.scale,
        EVIDENCE_BOARD_MIN_SCALE,
        EVIDENCE_BOARD_MAX_SCALE,
      );
      viewportScale.value = nextScale;
      viewportX.value = event.focalX - pinchWorldX.value * nextScale;
      viewportY.value = event.focalY - pinchWorldY.value * nextScale;
    })
    .onEnd(() => {
      const targetScale = clamp(
        viewportScale.value,
        EVIDENCE_BOARD_MIN_SCALE,
        EVIDENCE_BOARD_MAX_SCALE,
      );
      viewportScale.value = withSpring(targetScale, motion.spring);
      viewportX.value = withSpring(viewportX.value, motion.spring);
      viewportY.value = withSpring(viewportY.value, motion.spring);
      runOnJS(persistViewport)(viewportX.value, viewportY.value, targetScale);
    })
    .onFinalize(() => {
      pinching.value = false;
    }), [
    persistViewport,
    pinchStartScale,
    pinchWorldX,
    pinchWorldY,
    pinching,
    viewportScale,
    viewportX,
    viewportY,
  ]);

  const viewportGesture = useMemo(
    () => Gesture.Simultaneous(twoFingerPan, pinch),
    [pinch, twoFingerPan],
  );
  const boardGestures = useMemo(
    () => [twoFingerPan, pinch],
    [pinch, twoFingerPan],
  );
  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: viewportX.value },
      { translateY: viewportY.value },
      { scale: viewportScale.value },
    ],
  }));

  const handleMoveEnd = useCallback(
    (evidenceId: string, x: number, y: number, rotation: number) => {
      dispatch({
        type: 'MOVE_EVIDENCE_ON_BOARD',
        evidenceId,
        x,
        y,
        rotation,
      });
    },
    [dispatch],
  );

  const finishConnection = useCallback((
    sourceId: string,
    targetId: string,
    kind: EvidenceConnectionKind,
  ) => {
    const result = dispatch({
      type: 'CONNECT_EVIDENCE',
      fromEvidenceId: sourceId,
      toEvidenceId: targetId,
      kind,
    });
    if (result.ok) {
      // The feedback bridge plays the string / contradiction haptic.
      setMode(null);
      setSelectedId(targetId);
    }
  }, [dispatch]);

  const handleTap = useCallback((evidenceId: string) => {
    selectionFeedback(hapticsEnabled);
    setEngineError(null);
    if (mode?.kind === 'connect' || mode?.kind === 'contradict') {
      if (evidenceId === mode.sourceId) {
        setMode(null);
        return;
      }
      finishConnection(
        mode.sourceId,
        evidenceId,
        mode.kind === 'contradict' ? 'contradicts' : 'related',
      );
      return;
    }
    if (mode?.kind === 'group' || mode?.kind === 'theory') {
      const selectedIds = mode.selectedIds.includes(evidenceId)
        ? mode.selectedIds.filter((id) => id !== evidenceId)
        : [...mode.selectedIds, evidenceId];
      setMode({ ...mode, selectedIds });
      return;
    }
    setSelectedId((current) => (current === evidenceId ? null : evidenceId));
  }, [finishConnection, hapticsEnabled, mode]);

  const handleLongPress = useCallback((evidenceId: string) => {
    setMode(null);
    setSelectedId(evidenceId);
  }, []);

  const handleDoubleTap = useCallback((evidenceId: string) => {
    liftFeedback(hapticsEnabled);
    router.push({
      pathname: '/evidence/[evidenceId]',
      params: { evidenceId },
    });
  }, [hapticsEnabled]);

  const startMode = (kind: BoardInteractionMode['kind']) => {
    if (!selectedId) return;
    selectionFeedback(hapticsEnabled);
    setEngineError(null);
    if (kind === 'connect' || kind === 'contradict') {
      setMode({ kind, sourceId: selectedId });
    } else {
      setMode({ kind, selectedIds: [selectedId] });
    }
    setSelectedId(null);
  };

  const confirmCollection = () => {
    if (mode?.kind !== 'group' && mode?.kind !== 'theory') return;
    const sequence =
      mode.kind === 'group'
        ? playerState.evidenceBoard.groups.length + 1
        : playerState.evidenceBoard.theoryClusters.length + 1;
    const result = dispatch(
      mode.kind === 'group'
        ? {
            type: 'CREATE_EVIDENCE_BOARD_GROUP',
            label: `GROUP ${String(sequence).padStart(2, '0')}`,
            evidenceIds: mode.selectedIds,
          }
        : {
            type: 'CREATE_THEORY_CLUSTER',
            title: `THEORY ${String(sequence).padStart(2, '0')}`,
            evidenceIds: mode.selectedIds,
          },
    );
    if (result.ok) {
      confirmationFeedback(hapticsEnabled);
      setMode(null);
    }
  };

  const resetViewport = () => {
    const viewport = { x: 24, y: 24, scale: 0.82 };
    viewportX.value = withSpring(viewport.x, motion.spring);
    viewportY.value = withSpring(viewport.y, motion.spring);
    viewportScale.value = withSpring(viewport.scale, motion.spring);
    persistViewport(viewport.x, viewport.y, viewport.scale);
    selectionFeedback(hapticsEnabled);
  };

  const trayInset = Math.max(insets.bottom, spacing.sm);

  const selectedGroup = selectedId
    ? playerState.evidenceBoard.groups.find((group) =>
        group.evidenceIds.includes(selectedId),
      )
    : undefined;
  const selectedTheory = selectedId
    ? playerState.evidenceBoard.theoryClusters.find((cluster) =>
        cluster.evidenceIds.includes(selectedId),
      )
    : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TactilePressable
          accessibilityLabel="Close evidence board"
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons color={palette.paper} name="close" size={23} />
        </TactilePressable>
        <View style={styles.headerTitle}>
          <View style={styles.headerEyebrow}>
            <View style={styles.liveDot} />
            <AppText variant="mono" color={palette.brass}>TOUCH EVIDENCE WALL</AppText>
          </View>
          <AppText variant="title" color={palette.paper}>Evidence Board</AppText>
        </View>
        <View
          accessibilityLabel={describeBoardTally(
            discoveredEvidence.length,
            playerState.evidenceConnections.length,
            contradictionCount,
          )}
          accessibilityRole="summary"
          style={styles.headerCounts}
        >
          <AppText variant="mono" color={palette.paperMuted}>
            {discoveredEvidence.length} ITEMS · {playerState.evidenceConnections.length} STRINGS
          </AppText>
          {contradictionCount > 0 ? (
            // Colour, icon, and word together: the count is never only red.
            <View style={styles.contradictionTally}>
              <Ionicons color={palette.rustText} name="alert-circle" size={13} />
              <AppText variant="mono" color={palette.rust}>
                {contradictionCount} CONTRADICTION
                {contradictionCount === 1 ? '' : 'S'}
              </AppText>
            </View>
          ) : null}
        </View>
        <TactilePressable
          accessibilityLabel="Recenter evidence board"
          hapticsEnabled={hapticsEnabled}
          onPress={resetViewport}
          style={styles.headerButton}
        >
          <Ionicons color={palette.brass} name="scan-outline" size={22} />
        </TactilePressable>
      </View>

      <GestureDetector gesture={viewportGesture}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.canvas, canvasStyle]}>
            <CorkSurface />

            <BoardRelations
              connections={playerState.evidenceConnections}
              groups={playerState.evidenceBoard.groups}
              livePlacements={livePlacements}
              theoryClusters={playerState.evidenceBoard.theoryClusters}
            />

            {discoveredEvidence.map((evidence) => {
              const placement = persistedPlacements[evidence.id];
              if (!placement) return null;
              const multiSelected =
                (mode?.kind === 'group' || mode?.kind === 'theory') &&
                mode.selectedIds.includes(evidence.id);
              const linking =
                mode?.kind === 'connect' || mode?.kind === 'contradict';
              return (
                <EvidenceArtifact
                  awaitingTarget={linking && mode.sourceId !== evidence.id}
                  evidence={evidence}
                  externalGestures={boardGestures}
                  hapticsEnabled={hapticsEnabled}
                  key={evidence.id}
                  livePlacements={livePlacements}
                  multiSelected={multiSelected}
                  onDoubleTap={handleDoubleTap}
                  onLongPress={handleLongPress}
                  onMoveEnd={handleMoveEnd}
                  onTap={handleTap}
                  pendingSource={linking && mode.sourceId === evidence.id}
                  placement={placement}
                  selected={selectedId === evidence.id}
                  viewportScale={viewportScale}
                />
              );
            })}
          </Animated.View>

          {engineError ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Ionicons color={palette.rust} name="warning" size={17} />
              <AppText variant="bodySmall" color={palette.paper} style={styles.errorCopy}>
                {engineError}
              </AppText>
              <TactilePressable
                accessibilityLabel="Dismiss error"
                hapticsEnabled={hapticsEnabled}
                onPress={() => setEngineError(null)}
                style={styles.dismissError}
              >
                <Ionicons color={palette.paperMuted} name="close" size={18} />
              </TactilePressable>
            </View>
          ) : null}

          {mode ? (
            <ModeTray
              bottomInset={trayInset}
              hapticsEnabled={hapticsEnabled}
              mode={mode}
              onCancel={() => setMode(null)}
              onConfirm={confirmCollection}
            />
          ) : selectedId ? (
            <ActionTray
              bottomInset={trayInset}
              hasGroup={Boolean(selectedGroup)}
              hasTheory={Boolean(selectedTheory)}
              hapticsEnabled={hapticsEnabled}
              onAction={startMode}
              onClose={() => setSelectedId(null)}
              onDeleteGroup={() => {
                if (!selectedGroup) return;
                dispatch({
                  type: 'DELETE_EVIDENCE_BOARD_GROUP',
                  groupId: selectedGroup.id,
                });
              }}
              onDeleteTheory={() => {
                if (!selectedTheory) return;
                dispatch({
                  type: 'DELETE_THEORY_CLUSTER',
                  clusterId: selectedTheory.id,
                });
              }}
              onInspect={() =>
                router.push({
                  pathname: '/evidence/[evidenceId]',
                  params: { evidenceId: selectedId },
                })
              }
            />
          ) : (
            <View
              pointerEvents="none"
              style={[styles.gestureLegend, { bottom: trayInset }]}
            >
              <AppText variant="mono" color={palette.paper}>
                DRAG ARTIFACT
              </AppText>
              <View style={styles.legendRule} />
              <AppText variant="mono" color={palette.paperMuted}>
                TWO FINGERS MOVE WALL · PINCH SCALES · HOLD FOR TOOLS · DOUBLE TAP INSPECTS
              </AppText>
            </View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

function ActionTray({
  bottomInset,
  hasGroup,
  hasTheory,
  hapticsEnabled,
  onAction,
  onClose,
  onDeleteGroup,
  onDeleteTheory,
  onInspect,
}: {
  bottomInset: number;
  hasGroup: boolean;
  hasTheory: boolean;
  hapticsEnabled: boolean;
  onAction: (kind: BoardInteractionMode['kind']) => void;
  onClose: () => void;
  onDeleteGroup: () => void;
  onDeleteTheory: () => void;
  onInspect: () => void;
}) {
  return (
    <View style={[styles.actionTray, { paddingBottom: bottomInset }]}>
      <View style={styles.trayHeading}>
        <AppText variant="mono" color={palette.brass}>ARTIFACT TOOLS</AppText>
        <TactilePressable
          accessibilityLabel="Close artifact tools"
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={onClose}
          style={styles.trayClose}
        >
          <Ionicons color={palette.paperMuted} name="close" size={19} />
        </TactilePressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionScroll}>
        <ActionButton hapticsEnabled={hapticsEnabled} icon="expand-outline" label="INSPECT" onPress={onInspect} />
        <ActionButton hapticsEnabled={hapticsEnabled} icon="git-commit-outline" label="CONNECT" onPress={() => onAction('connect')} />
        <ActionButton danger hapticsEnabled={hapticsEnabled} icon="flash-outline" label="CONTRADICT" onPress={() => onAction('contradict')} />
        <ActionButton hapticsEnabled={hapticsEnabled} icon="albums-outline" label="GROUP" onPress={() => onAction('group')} />
        <ActionButton hapticsEnabled={hapticsEnabled} icon="bulb-outline" label="THEORY" onPress={() => onAction('theory')} />
        {hasGroup ? <ActionButton hapticsEnabled={hapticsEnabled} icon="layers-outline" label="UNGROUP" onPress={onDeleteGroup} /> : null}
        {hasTheory ? <ActionButton hapticsEnabled={hapticsEnabled} icon="trash-outline" label="DROP THEORY" onPress={onDeleteTheory} /> : null}
      </ScrollView>
    </View>
  );
}

function ModeTray({
  bottomInset,
  hapticsEnabled,
  mode,
  onCancel,
  onConfirm,
}: {
  bottomInset: number;
  hapticsEnabled: boolean;
  mode: BoardInteractionMode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const selecting = mode.kind === 'group' || mode.kind === 'theory';
  const count = selecting ? mode.selectedIds.length : 1;
  const title =
    mode.kind === 'connect'
      ? 'SELECT AN ARTIFACT TO CONNECT'
      : mode.kind === 'contradict'
        ? 'SELECT THE CONTRADICTING ARTIFACT'
        : mode.kind === 'group'
          ? 'TAP ARTIFACTS FOR THIS GROUP'
          : 'TAP ARTIFACTS FOR THIS THEORY';
  return (
    <View style={[styles.modeTray, { bottom: bottomInset }]}>
      <View style={styles.modeCopy}>
        <AppText variant="label" color={mode.kind === 'contradict' ? palette.rust : palette.brass}>{title}</AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {selecting ? `${count} SELECTED · MINIMUM 2` : 'TAP SOURCE AGAIN TO CANCEL'}
        </AppText>
      </View>
      {selecting ? (
        <TactilePressable
          accessibilityLabel="Confirm selection"
          disabled={count < 2}
          hapticsEnabled={hapticsEnabled}
          onPress={onConfirm}
          style={[styles.confirmButton, count < 2 && styles.disabled]}
        >
          <Ionicons color={palette.black} name="checkmark" size={20} />
        </TactilePressable>
      ) : null}
      <TactilePressable accessibilityLabel="Cancel board action" hapticsEnabled={hapticsEnabled} onPress={onCancel} style={styles.cancelButton}>
        <Ionicons color={palette.paper} name="close" size={20} />
      </TactilePressable>
    </View>
  );
}

function ActionButton({
  danger = false,
  hapticsEnabled,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  hapticsEnabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TactilePressable
      accessibilityLabel={`${label.toLowerCase()} selected evidence`}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={styles.actionButton}
    >
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons color={danger ? palette.rust : palette.brass} name={icon} size={20} />
      </View>
      <AppText variant="mono" color={danger ? palette.rust : palette.paper}>{label}</AppText>
    </TactilePressable>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

/** Overscroll resistance so the wall feels attached to something. */
function rubberBand(value: number, minimum: number, maximum: number) {
  'worklet';
  if (value > maximum) return maximum + (value - maximum) / 3.2;
  if (value < minimum) return minimum + (value - minimum) / 3.2;
  return value;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  header: { minHeight: 70, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.ink },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, paddingHorizontal: spacing.xs },
  headerEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.rust },
  contradictionTally: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerCounts: { alignItems: 'flex-end', marginRight: 2 },
  viewport: { flex: 1, overflow: 'hidden', backgroundColor: '#3A2519' },
  canvas: { position: 'absolute', width: EVIDENCE_BOARD_WIDTH, height: EVIDENCE_BOARD_HEIGHT, transformOrigin: 'left top' },
  corkBase: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#70482F', borderWidth: 18, borderColor: '#39251A' },
  corkSeam: { position: 'absolute', left: 20, right: 20, height: 1, backgroundColor: 'rgba(47,27,17,0.18)' },
  corkSpeck: { position: 'absolute', borderRadius: 2, backgroundColor: '#28150D' },
  errorBanner: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#2A1916', borderWidth: 1, borderColor: palette.rust },
  errorCopy: { flex: 1 },
  dismissError: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  gestureLegend: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, minHeight: 54, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,20,15,0.91)', borderWidth: 1, borderColor: palette.line },
  legendRule: { width: 1, height: 25, marginHorizontal: spacing.sm, backgroundColor: palette.line },
  actionTray: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: 0, paddingTop: spacing.sm, backgroundColor: 'rgba(17,20,15,0.97)', borderTopWidth: 2, borderTopColor: palette.brass, shadowColor: palette.black, shadowOffset: { width: 0, height: -7 }, shadowOpacity: 0.5, shadowRadius: 12 },
  trayHeading: { minHeight: touch.minTarget, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trayClose: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  actionScroll: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  actionButton: { minWidth: 76, height: 70, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: 5, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: palette.line },
  actionIcon: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: palette.brass },
  actionIconDanger: { borderBottomColor: palette.rust },
  modeTray: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm, minHeight: 68, paddingLeft: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,20,15,0.97)', borderWidth: 1, borderColor: palette.brass },
  modeCopy: { flex: 1, gap: 3 },
  confirmButton: { width: 58, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brass },
  cancelButton: { width: 54, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: palette.line },
  disabled: { opacity: 0.3 },
});
