/* Reanimated shared values are intentionally mutated inside effects/worklets. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  EVIDENCE_BOARD_ITEM_HEIGHT,
  EVIDENCE_BOARD_ITEM_WIDTH,
  type EvidenceBoardGroup,
  type EvidenceConnection,
  type TheoryCluster,
} from '@/case-engine';
import { AppText } from '@/design-system/components/AppText';
import {
  curve,
  duration,
  useReduceMotion,
} from '@/design-system/motion/motionSystem';
import { motion, palette } from '@/design-system/theme/tokens';

import type { LiveBoardPlacements } from '../types';

export const BoardRelations = memo(function BoardRelations({
  connections,
  groups,
  livePlacements,
  theoryClusters,
}: {
  connections: readonly EvidenceConnection[];
  groups: readonly EvidenceBoardGroup[];
  livePlacements: SharedValue<LiveBoardPlacements>;
  theoryClusters: readonly TheoryCluster[];
}) {
  return (
    <View pointerEvents="none" style={styles.fill}>
      {theoryClusters.map((cluster) => (
        <CollectionOutline
          evidenceIds={cluster.evidenceIds}
          key={cluster.id}
          kind="theory"
          label={cluster.title}
          livePlacements={livePlacements}
        />
      ))}
      {groups.map((group) => (
        <CollectionOutline
          evidenceIds={group.evidenceIds}
          key={group.id}
          kind="group"
          label={group.label}
          livePlacements={livePlacements}
        />
      ))}
      {connections.map((connection) => (
        <ConnectionString
          connection={connection}
          key={connection.id}
          livePlacements={livePlacements}
        />
      ))}
    </View>
  );
});

const CollectionOutline = memo(function CollectionOutline({
  evidenceIds,
  kind,
  label,
  livePlacements,
}: {
  evidenceIds: readonly string[];
  kind: 'group' | 'theory';
  label: string;
  livePlacements: SharedValue<LiveBoardPlacements>;
}) {
  const outlineStyle = useAnimatedStyle(() => {
    // Runs on every frame of every drag. The old version allocated five
    // intermediate arrays per frame (`map`, `filter`, and three more `map`s
    // for the spreads); this walks the ids once and allocates nothing.
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let found = 0;

    for (let index = 0; index < evidenceIds.length; index += 1) {
      const placement = livePlacements.value[evidenceIds[index]!];
      if (!placement) continue;
      found += 1;
      if (placement.x < minX) minX = placement.x;
      if (placement.y < minY) minY = placement.y;
      if (placement.x > maxX) maxX = placement.x;
      if (placement.y > maxY) maxY = placement.y;
    }

    if (found < 2) return { opacity: 0 };
    const inset = kind === 'theory' ? 46 : 25;
    return {
      opacity: 1,
      left: minX - inset,
      top: minY - inset,
      width: maxX - minX + EVIDENCE_BOARD_ITEM_WIDTH + inset * 2,
      height: maxY - minY + EVIDENCE_BOARD_ITEM_HEIGHT + inset * 2,
    };
  });

  return (
    <Animated.View
      style={[
        styles.collection,
        kind === 'theory' ? styles.theoryCollection : styles.groupCollection,
        outlineStyle,
      ]}
    >
      <View
        style={[
          styles.collectionLabel,
          kind === 'theory' ? styles.theoryLabel : styles.groupLabel,
        ]}
      >
        <AppText
          variant="mono"
          color={kind === 'theory' ? palette.paper : palette.black}
          numberOfLines={1}
        >
          {kind === 'theory' ? 'THEORY / ' : 'GROUP / '}
          {label.toUpperCase()}
        </AppText>
      </View>
    </Animated.View>
  );
});

const ConnectionString = memo(function ConnectionString({
  connection,
  livePlacements,
}: {
  connection: EvidenceConnection;
  livePlacements: SharedValue<LiveBoardPlacements>;
}) {
  const reduceMotion = useReduceMotion();
  const contradiction = connection.kind === 'contradicts';

  // The string is pulled taut from its origin pin toward the far pin, so a new
  // connection reads as something anchored rather than something that appeared.
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const anchors = useSharedValue(reduceMotion ? 1 : 0);
  // A contradiction is noted, not celebrated: the badge settles once.
  const badgeEmphasis = useSharedValue(reduceMotion || !contradiction ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    anchors.value = withTiming(1, {
      duration: duration.brief,
      easing: curve.emerge,
    });
    draw.value = withDelay(
      90,
      withTiming(1, { duration: duration.reveal, easing: curve.settle }),
    );
    if (contradiction) {
      badgeEmphasis.value = withDelay(
        90 + duration.reveal,
        withSequence(
          withTiming(1.12, { duration: duration.flick, easing: curve.emerge }),
          withSpring(1, motion.settle),
        ),
      );
    }
  }, [anchors, badgeEmphasis, contradiction, draw, reduceMotion]);

  /**
   * PHASE 16 — the geometry of a string is computed once per frame.
   *
   * Each string used to run four animated styles, and every one of them read
   * the whole placement map and redid the same trigonometry. With twenty
   * strings pinned that was eighty map lookups and eighty square roots per
   * frame while a single card was being dragged. Now one derived value does
   * the maths and the styles just read numbers off it.
   */
  const geometry = useDerivedValue(() => {
    const from = livePlacements.value[connection.fromEvidenceId];
    const to = livePlacements.value[connection.toEvidenceId];
    if (!from || !to) {
      return { ok: false, startX: 0, startY: 0, endX: 0, endY: 0, length: 0, angle: 0 };
    }
    const startX = from.x + EVIDENCE_BOARD_ITEM_WIDTH / 2;
    const startY = from.y + 13;
    const endX = to.x + EVIDENCE_BOARD_ITEM_WIDTH / 2;
    const endY = to.y + 13;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    return {
      ok: true,
      startX,
      startY,
      endX,
      endY,
      length: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      angle: Math.atan2(deltaY, deltaX),
    };
  });

  const lineStyle = useAnimatedStyle(() => {
    const value = geometry.value;
    if (!value.ok) return { opacity: 0, width: 0 };
    return {
      opacity: 0.92 * draw.value,
      left: value.startX,
      top: value.startY,
      width: value.length,
      transform: [
        { rotateZ: `${value.angle}rad` },
        { scaleX: draw.value },
      ],
    };
  });

  const fromAnchorStyle = useAnimatedStyle(() => {
    const value = geometry.value;
    if (!value.ok) return { opacity: 0 };
    return {
      opacity: anchors.value,
      left: value.startX - 5,
      top: value.startY - 5,
      transform: [{ scale: 0.7 + anchors.value * 0.3 }],
    };
  });

  const toAnchorStyle = useAnimatedStyle(() => {
    const value = geometry.value;
    if (!value.ok) return { opacity: 0 };
    return {
      opacity: anchors.value * draw.value,
      left: value.endX - 5,
      top: value.endY - 5,
      transform: [{ scale: 0.7 + draw.value * 0.3 }],
    };
  });

  const badgeStyle = useAnimatedStyle(() => {
    const value = geometry.value;
    if (!value.ok) return { opacity: 0 };
    return {
      opacity: Math.min(1, badgeEmphasis.value),
      left: (value.startX + value.endX) / 2 - 62,
      top: (value.startY + value.endY) / 2 - 13,
      transform: [{ scale: badgeEmphasis.value }],
    };
  });

  const color = contradiction
    ? '#B34035'
    : connection.kind === 'supports'
      ? '#7D9B67'
      : connection.kind === 'sequence'
        ? '#C9B58B'
        : '#D5A84B';

  return (
    <>
      <Animated.View
        style={[styles.anchor, { borderColor: color }, fromAnchorStyle]}
      />
      <Animated.View
        style={[
          styles.string,
          {
            backgroundColor: contradiction ? 'transparent' : color,
            borderTopColor: color,
            borderTopWidth: contradiction ? 3 : 0,
            borderStyle: contradiction ? 'dashed' : 'solid',
          },
          lineStyle,
        ]}
      />
      <Animated.View
        style={[styles.anchor, { borderColor: color }, toAnchorStyle]}
      />
      {contradiction ? (
        // Colour + icon + word. A red line on its own is not a statement.
        <Animated.View style={[styles.contradictionBadge, badgeStyle]}>
          <Ionicons color={palette.white} name="close" size={13} />
          <AppText variant="mono" color={palette.white}>
            CONTRADICTION
          </AppText>
        </Animated.View>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  collection: {
    position: 'absolute',
  },
  groupCollection: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(232,221,191,0.48)',
    backgroundColor: 'rgba(232,221,191,0.035)',
  },
  theoryCollection: {
    borderWidth: 3,
    borderColor: 'rgba(169,87,69,0.70)',
    backgroundColor: 'rgba(90,31,23,0.13)',
  },
  collectionLabel: {
    position: 'absolute',
    top: -17,
    left: 18,
    maxWidth: 250,
    paddingHorizontal: 10,
    paddingVertical: 5,
    transform: [{ rotateZ: '-1deg' }],
  },
  groupLabel: {
    backgroundColor: '#D8C89F',
  },
  theoryLabel: {
    backgroundColor: '#873E34',
  },
  string: {
    position: 'absolute',
    height: 3,
    transformOrigin: 'left center',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  anchor: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 3,
    backgroundColor: '#1B1A16',
  },
  contradictionBadge: {
    position: 'absolute',
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 13,
    backgroundColor: '#9F3028',
    borderWidth: 2,
    borderColor: '#D7B6A8',
  },
});
