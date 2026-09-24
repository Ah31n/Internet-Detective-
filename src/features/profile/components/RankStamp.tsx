import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { palette, radius, spacing } from '@/design-system/theme/tokens';
import type { DetectiveLevel } from '@/core/progression/progression';

interface RankStampProps {
  level: DetectiveLevel;
}

/**
 * The rank block: a stamped numeral and the rank it carries.
 *
 * Progress toward the next rank is a hairline rule that fills, with the
 * remainder stated in words. No XP bar, no glow, no "+120!" — a detective is
 * promoted on their record, and the record is printed beneath.
 */
export function RankStamp({ level }: RankStampProps) {
  const remaining =
    level.experienceForNextLevel === null
      ? null
      : Math.max(0, level.experienceForNextLevel - level.experienceIntoLevel);

  const filled =
    level.experienceForNextLevel === null
      ? 1
      : Math.min(1, level.experienceIntoLevel / level.experienceForNextLevel);

  return (
    <View
      accessibilityLabel={`Rank ${level.title}, grade ${level.level}. ${
        remaining === null
          ? 'Highest grade on the register.'
          : `${remaining} points to the next grade.`
      }`}
      accessibilityRole="summary"
      style={styles.block}
    >
      <View style={styles.stamp}>
        <AppText variant="mono" color={palette.rustText}>
          GRADE
        </AppText>
        <AppText variant="display" color={palette.paper} style={styles.numeral}>
          {String(level.level).padStart(2, '0')}
        </AppText>
      </View>

      <View style={styles.copy}>
        <AppText variant="title" style={styles.rank}>
          {level.title}
        </AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {level.experience} SERVICE POINTS
        </AppText>

        <View style={styles.meter}>
          <View style={[styles.meterFill, { flex: Math.max(filled, 0.001) }]} />
          <View style={{ flex: Math.max(1 - filled, 0.001) }} />
        </View>

        <AppText variant="bodySmall" color={palette.paperMuted}>
          {remaining === null
            ? 'Highest grade on the register.'
            : `${remaining} points to the next grade.`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  stamp: {
    minWidth: 92,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.rust,
    borderRadius: radius.sm,
    backgroundColor: palette.inkSoft,
  },
  numeral: {
    marginTop: spacing.xxs,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  rank: {
    fontSize: 24,
    lineHeight: 30,
  },
  meter: {
    height: 3,
    flexDirection: 'row',
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
    backgroundColor: palette.line,
  },
  meterFill: {
    backgroundColor: palette.brass,
  },
});
