/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
/* eslint-disable react-hooks/immutability */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  type GestureType,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import {
  EVIDENCE_BOARD_HEIGHT,
  EVIDENCE_BOARD_ITEM_HEIGHT,
  EVIDENCE_BOARD_ITEM_WIDTH,
  EVIDENCE_BOARD_WIDTH,
  type EvidenceBoardPlacement,
  type EvidenceDefinition,
  type EvidenceMediaReference,
} from '@/case-engine';
import { resolveEvidenceImage } from '@/case-content/evidenceMediaRegistry';
import { liftFeedback, placementFeedback } from '@/core/feedback/haptics';
import { AppText } from '@/design-system/components/AppText';
import { motion, palette, spacing, touch } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

import type { LiveBoardPlacements } from '../types';

interface EvidenceArtifactProps {
  evidence: EvidenceDefinition;
  externalGestures: readonly GestureType[];
  hapticsEnabled: boolean;
  livePlacements: SharedValue<LiveBoardPlacements>;
  multiSelected: boolean;
  placement: EvidenceBoardPlacement;
  /** Source artifact of an in-progress string. */
  pendingSource: boolean;
  /** A string is being drawn and this artifact is not the source. */
  awaitingTarget: boolean;
  selected: boolean;
  viewportScale: SharedValue<number>;
  onDoubleTap: (evidenceId: string) => void;
  onLongPress: (evidenceId: string) => void;
  onMoveEnd: (
    evidenceId: string,
    x: number,
    y: number,
    rotation: number,
  ) => void;
  onTap: (evidenceId: string) => void;
}


/**
 * Screen reader identity for a card on the wall. It always answers the same
 * three questions in the same order: what is it, which artifact is it, and
 * what state is it in — never "button".
 */
export function describeArtifact(
  evidence: EvidenceDefinition,
  state: {
    selected?: boolean;
    multiSelected?: boolean;
    pendingSource?: boolean;
    awaitingTarget?: boolean;
  } = {},
): string {
  const parts = [
    `Open ${evidence.title}`,
    `${evidence.type} evidence`,
    `identifier ${readableEvidenceId(evidence.id)}`,
  ];
  if (state.pendingSource) parts.push('selected as the first card of a link');
  else if (state.awaitingTarget) parts.push('waiting to be linked');
  else if (state.multiSelected) parts.push('added to the current selection');
  else if (state.selected) parts.push('selected');
  return `${parts.join('. ')}.`;
}

/** `evidence-doc-camera-hash` reads aloud as "doc camera hash". */
export function readableEvidenceId(id: string): string {
  return id.replace(/^evidence-/, '').replace(/-/g, ' ');
}

function EvidenceArtifactComponent({
  evidence,
  externalGestures,
  hapticsEnabled,
  livePlacements,
  multiSelected,
  placement,
  pendingSource,
  awaitingTarget,
  selected,
  viewportScale,
  onDoubleTap,
  onLongPress,
  onMoveEnd,
  onTap,
}: EvidenceArtifactProps) {
  // Reduced motion: the wall keeps working exactly the same way, but the
  // paper stops swinging. Cards sit square, drags do not tilt, and springs
  // are replaced by the shortest honest movement.
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const restRotation = reduceMotion ? 0 : placement.rotation;

  const x = useSharedValue(placement.x);
  const y = useSharedValue(placement.y);
  const rotation = useSharedValue(restRotation);
  const restingRotation = useSharedValue(restRotation);
  const zIndex = useSharedValue(placement.zIndex);
  const startX = useSharedValue(placement.x);
  const startY = useSharedValue(placement.y);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const dragging = useSharedValue(false);

  useEffect(() => {
    restingRotation.value = restRotation;
    zIndex.value = placement.zIndex;
    if (dragging.value) return;
    if (reduceMotion) {
      x.value = placement.x;
      y.value = placement.y;
      rotation.value = restRotation;
      return;
    }
    x.value = withSpring(placement.x, motion.spring);
    y.value = withSpring(placement.y, motion.spring);
    rotation.value = withSpring(restRotation, motion.spring);
  }, [
    dragging,
    placement,
    reduceMotion,
    restRotation,
    restingRotation,
    rotation,
    x,
    y,
    zIndex,
  ]);

  useAnimatedReaction(
    () => ({
      x: x.value,
      y: y.value,
      rotation: rotation.value,
      zIndex: dragging.value ? 10_000 : zIndex.value,
    }),
    (next) => {
      // One card moves, one key changes. The previous version rebuilt the
      // whole placement map on every frame of every drag, on the UI thread.
      livePlacements.modify((current) => {
        'worklet';
        current[evidence.id] = next;
        return current;
      });
    },
    [evidence.id],
  );

  const gesture = useMemo(() => {
  let drag = Gesture.Pan()
    .maxPointers(1)
    .minDistance(3)
    .onBegin(() => {
      dragging.value = true;
      startX.value = x.value;
      startY.value = y.value;
      // The sheet comes off the cork: it grows, its shadow deepens.
      scale.value = reduceMotion ? 1.02 : withSpring(1.05, motion.lift);
      lift.value = reduceMotion ? 1 : withSpring(1, motion.lift);
      runOnJS(liftFeedback)(hapticsEnabled);
    })
    .onUpdate((event) => {
      x.value = clamp(
        startX.value + event.translationX / viewportScale.value,
        24,
        EVIDENCE_BOARD_WIDTH - EVIDENCE_BOARD_ITEM_WIDTH - 24,
      );
      y.value = clamp(
        startY.value + event.translationY / viewportScale.value,
        28,
        EVIDENCE_BOARD_HEIGHT - EVIDENCE_BOARD_ITEM_HEIGHT - 28,
      );
      // Paper swings behind the finger: tilt follows both travel and speed.
      // With reduced motion the card tracks the finger and nothing else.
      rotation.value = reduceMotion
        ? restingRotation.value
        : restingRotation.value +
          clamp(event.translationX / 90, -2.4, 2.4) +
          clamp(event.velocityX / 900, -3.2, 3.2);
    })
    .onEnd((event) => {
      const targetX = clamp(
        x.value + (event.velocityX / viewportScale.value) * 0.075,
        24,
        EVIDENCE_BOARD_WIDTH - EVIDENCE_BOARD_ITEM_WIDTH - 24,
      );
      const targetY = clamp(
        y.value + (event.velocityY / viewportScale.value) * 0.075,
        28,
        EVIDENCE_BOARD_HEIGHT - EVIDENCE_BOARD_ITEM_HEIGHT - 28,
      );
      // Settling uses a softer spring so the card rocks once and stops.
      x.value = withSpring(targetX, {
        ...motion.settle,
        velocity: event.velocityX / viewportScale.value,
      });
      y.value = withSpring(targetY, {
        ...motion.settle,
        velocity: event.velocityY / viewportScale.value,
      });
      rotation.value = withSpring(restingRotation.value, motion.settle);
      runOnJS(placementFeedback)(hapticsEnabled);
      runOnJS(onMoveEnd)(
        evidence.id,
        targetX,
        targetY,
        restingRotation.value,
      );
    })
    .onFinalize(() => {
      dragging.value = false;
      scale.value = withSpring(1, motion.settle);
      lift.value = withSpring(0, motion.settle);
    });

  let hold = Gesture.LongPress()
    .minDuration(touch.longPressMs)
    .maxDistance(12)
    .onStart(() => {
      scale.value = withSpring(1.06, motion.lift);
      lift.value = withSpring(1, motion.lift);
      if (!reduceMotion) {
        rotation.value = withSpring(restingRotation.value - 1.4, motion.lift);
      }
      runOnJS(liftFeedback)(hapticsEnabled);
      runOnJS(onLongPress)(evidence.id);
    })
    .onFinalize(() => {
      scale.value = withSpring(1, motion.settle);
      lift.value = withSpring(0, motion.settle);
      rotation.value = withSpring(restingRotation.value, motion.settle);
    });

  let doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(touch.doubleTapMs)
    .onEnd((_event, success) => {
      if (success) runOnJS(onDoubleTap)(evidence.id);
    });

  let tap = Gesture.Tap()
    .maxDistance(touch.slopDistance)
    .onEnd((_event, success) => {
      if (success) runOnJS(onTap)(evidence.id);
    });

  for (const externalGesture of externalGestures) {
    drag = drag.simultaneousWithExternalGesture(externalGesture);
    hold = hold.simultaneousWithExternalGesture(externalGesture);
    tap = tap.simultaneousWithExternalGesture(externalGesture);
    doubleTap = doubleTap.simultaneousWithExternalGesture(externalGesture);
  }

  return Gesture.Race(drag, hold, doubleTap, tap);
  // Rebuilding four gesture handlers on every render re-attaches them
  // natively, which is exactly how a touch gets dropped mid-drag. They are
  // rebuilt only when something they actually close over changes.
  }, [
    dragging,
    evidence.id,
    externalGestures,
    hapticsEnabled,
    lift,
    onDoubleTap,
    onLongPress,
    onMoveEnd,
    onTap,
    reduceMotion,
    restingRotation,
    rotation,
    scale,
    startX,
    startY,
    viewportScale,
    x,
    y,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    zIndex: dragging.value ? 10_000 : zIndex.value,
    shadowOpacity: 0.46 + lift.value * 0.26,
    shadowRadius: 9 + lift.value * 13,
    elevation: 12 + lift.value * 12,
    transform: [
      { rotateZ: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  const source = useMemo(() => resolveBoardImage(evidence), [evidence]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityHint="Double tap to inspect. Long press for artifact tools. Drag with one finger to move the card."
        accessibilityLabel={describeArtifact(evidence, {
          selected,
          multiSelected,
          pendingSource,
          awaitingTarget,
        })}
        accessibilityRole="button"
        accessibilityState={{ selected: selected || multiSelected }}
        style={[
          styles.artifact,
          surfaceStyle(evidence.type),
          selected && styles.selected,
          multiSelected && styles.multiSelected,
          pendingSource && styles.pendingSource,
          awaitingTarget && styles.awaitingTarget,
          animatedStyle,
        ]}
      >
        <View style={styles.shadowSheet} />
        {evidence.type === 'photo' ? (
          <PhotoFace evidence={evidence} source={source} />
        ) : evidence.type === 'receipt' ? (
          <ReceiptFace evidence={evidence} />
        ) : evidence.type === 'message' ? (
          <MessageFace evidence={evidence} />
        ) : evidence.type === 'cctv' ? (
          <CctvFace evidence={evidence} source={source} />
        ) : (
          <PaperFace evidence={evidence} source={source} />
        )}
        <View style={styles.pinOuter}>
          <View style={styles.pinInner} />
        </View>
        {multiSelected ? (
          <View style={styles.checkMark}>
            <Ionicons color={palette.black} name="checkmark" size={14} />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Artifacts re-render only when their own persisted placement or selection
 * state changes; live motion happens entirely on the UI thread.
 */
export const EvidenceArtifact = memo(EvidenceArtifactComponent);

function PhotoFace({
  evidence,
  source,
}: {
  evidence: EvidenceDefinition;
  source: ReturnType<typeof resolveEvidenceImage>;
}) {
  return (
    <View style={styles.photoPaper}>
      <View style={styles.photoFrame}>
        {source ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="low"
            recyclingKey={evidence.id}
            source={source}
            style={styles.fill}
          />
        ) : (
          <View style={styles.mediaFallback}>
            <Ionicons color={palette.paperMuted} name="image-outline" size={30} />
          </View>
        )}
      </View>
      <AppText fixedScale variant="bodySmall" color={palette.black} numberOfLines={2} style={styles.handTitle}>
        {evidence.title}
      </AppText>
      <AppText fixedScale variant="mono" color="#6A6254" numberOfLines={1}>{evidence.source}</AppText>
    </View>
  );
}

function ReceiptFace({ evidence }: { evidence: EvidenceDefinition }) {
  return (
    <View style={styles.receiptPaper}>
      <AppText fixedScale variant="mono" color="#5E574A">RECEIPT / LOG</AppText>
      <View style={styles.receiptRule} />
      <AppText fixedScale variant="title" color={palette.black} numberOfLines={2} style={styles.compactTitle}>
        {evidence.title}
      </AppText>
      <AppText fixedScale variant="mono" color="#5E574A" numberOfLines={2}>{evidence.summary}</AppText>
      <View style={styles.receiptRule} />
      <AppText fixedScale variant="mono" color="#2F2B24">{evidence.capturedAtLabel ?? evidence.source}</AppText>
    </View>
  );
}

function MessageFace({ evidence }: { evidence: EvidenceDefinition }) {
  return (
    <View style={styles.messageFace}>
      <View style={styles.phoneHeader}>
        <View style={styles.onlineDot} />
        <AppText fixedScale variant="mono" color={palette.paperMuted}>MESSAGE CAPTURE</AppText>
      </View>
      <AppText fixedScale variant="title" color={palette.white} numberOfLines={2} style={styles.compactTitle}>
        {evidence.title}
      </AppText>
      <View style={styles.messageBubble}>
        <AppText fixedScale variant="bodySmall" color={palette.white} numberOfLines={3}>{evidence.summary}</AppText>
      </View>
    </View>
  );
}

function CctvFace({
  evidence,
  source,
}: {
  evidence: EvidenceDefinition;
  source: ReturnType<typeof resolveEvidenceImage>;
}) {
  return (
    <View style={styles.cctvFace}>
      <View style={styles.cctvImage}>
        {source ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="low"
            recyclingKey={evidence.id}
            source={source}
            style={styles.fill}
          />
        ) : (
          <View style={styles.scanLines}>
            <Ionicons color={palette.paperMuted} name="videocam-outline" size={30} />
          </View>
        )}
        <View style={styles.recBadge}>
          <View style={styles.recDot} />
          <AppText fixedScale variant="mono" color={palette.white}>REC</AppText>
        </View>
      </View>
      <AppText fixedScale variant="bodySmall" color={palette.white} numberOfLines={2} style={styles.compactTitle}>
        {evidence.title}
      </AppText>
      <AppText fixedScale variant="mono" color={palette.paperMuted} numberOfLines={1}>{evidence.source}</AppText>
    </View>
  );
}

function PaperFace({
  evidence,
  source,
}: {
  evidence: EvidenceDefinition;
  source: ReturnType<typeof resolveEvidenceImage>;
}) {
  return (
    <View style={styles.paperFace}>
      <View style={styles.tape} />
      <View style={styles.paperCodeRow}>
        <AppText fixedScale variant="mono" color="#746B5A">{evidence.type.toUpperCase()}</AppText>
        <AppText fixedScale variant="mono" color="#9A493D">FILED</AppText>
      </View>
      {source ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          priority="low"
          recyclingKey={evidence.id}
          source={source}
          style={styles.paperThumbnail}
        />
      ) : null}
      <AppText fixedScale variant="title" color={palette.black} numberOfLines={2} style={styles.paperTitle}>
        {evidence.title}
      </AppText>
      <AppText fixedScale variant="bodySmall" color="#514A3F" numberOfLines={source ? 2 : 3}>
        {evidence.summary}
      </AppText>
      <View style={styles.paperFooter}>
        <AppText fixedScale variant="mono" color="#746B5A" numberOfLines={1}>{evidence.source}</AppText>
      </View>
    </View>
  );
}

function resolveBoardImage(evidence: EvidenceDefinition) {
  let media: EvidenceMediaReference | undefined;
  if (evidence.type === 'photo') media = evidence.image;
  if (evidence.type === 'cctv') media = evidence.poster;
  if (evidence.type === 'webpage') media = evidence.heroImage;
  // 'thumb' is the 420 px derivative: about 0.5 MB decoded instead of 6.3 MB.
  return media ? resolveEvidenceImage(media, 'thumb') : null;
}

function surfaceStyle(type: EvidenceDefinition['type']) {
  if (type === 'message') return styles.darkArtifact;
  if (type === 'cctv') return styles.blackArtifact;
  if (type === 'photo') return styles.photoArtifact;
  if (type === 'receipt') return styles.receiptArtifact;
  return styles.paperArtifact;
}

function clamp(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

const styles = StyleSheet.create({
  artifact: {
    position: 'absolute',
    width: EVIDENCE_BOARD_ITEM_WIDTH,
    height: EVIDENCE_BOARD_ITEM_HEIGHT,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.46,
    shadowRadius: 9,
    elevation: 12,
  },
  shadowSheet: {
    position: 'absolute',
    top: 5,
    right: -4,
    bottom: -5,
    left: 4,
    backgroundColor: 'rgba(15,12,8,0.22)',
    transform: [{ rotateZ: '1.5deg' }],
  },
  paperArtifact: { backgroundColor: '#D9CDAF' },
  photoArtifact: { backgroundColor: '#E9E0C9' },
  receiptArtifact: { width: 174, backgroundColor: '#DDD4BC' },
  darkArtifact: { backgroundColor: '#202621' },
  blackArtifact: { backgroundColor: '#111311' },
  selected: {
    shadowColor: palette.brass,
    shadowOpacity: 0.78,
    shadowRadius: 14,
  },
  pendingSource: {
    borderWidth: 3,
    borderColor: palette.rust,
  },
  awaitingTarget: {
    opacity: 0.86,
  },
  multiSelected: {
    borderWidth: 3,
    borderColor: palette.brass,
  },
  pinOuter: {
    position: 'absolute',
    top: 4,
    left: EVIDENCE_BOARD_ITEM_WIDTH / 2 - 9,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E342D',
    borderWidth: 2,
    borderColor: '#C87A67',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  pinInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F0B4A1',
  },
  checkMark: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
    borderWidth: 2,
    borderColor: palette.paper,
  },
  fill: { width: '100%', height: '100%' },
  photoPaper: { flex: 1, padding: 10, paddingTop: 13 },
  photoFrame: { height: 91, overflow: 'hidden', backgroundColor: '#272923' },
  mediaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  handTitle: { marginTop: 5, fontStyle: 'italic' },
  receiptPaper: { flex: 1, padding: spacing.sm, gap: 4, borderLeftWidth: 1, borderRightWidth: 1, borderStyle: 'dashed', borderColor: '#8C826C' },
  receiptRule: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#8C826C' },
  compactTitle: { marginVertical: 2 },
  messageFace: { flex: 1, padding: spacing.sm },
  phoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.moss },
  messageBubble: { alignSelf: 'flex-end', maxWidth: '88%', marginTop: 7, padding: 8, borderRadius: 12, borderBottomRightRadius: 2, backgroundColor: '#516547' },
  cctvFace: { flex: 1, padding: 9 },
  cctvImage: { height: 92, overflow: 'hidden', backgroundColor: '#282B28' },
  scanLines: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#454B45' },
  recBadge: { position: 'absolute', top: 5, right: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.rust },
  paperFace: { flex: 1, padding: spacing.sm, paddingTop: 14, overflow: 'hidden' },
  tape: { position: 'absolute', top: -2, left: 57, width: 76, height: 17, backgroundColor: 'rgba(213,195,151,0.72)', transform: [{ rotateZ: '-2deg' }] },
  paperCodeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  paperThumbnail: { position: 'absolute', top: 38, right: 10, width: 58, height: 48, opacity: 0.88 },
  paperTitle: { marginBottom: 4, maxWidth: '92%' },
  paperFooter: { position: 'absolute', right: spacing.sm, bottom: 8, left: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8C826C', paddingTop: 4 },
});
