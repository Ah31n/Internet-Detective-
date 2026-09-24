import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { availabilityLabel, type CaseAvailability } from '@/core/commerce';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';

interface ContentsEntryProps {
  availability: CaseAvailability;
  hapticsEnabled: boolean;
  onPress?: () => void;
}

/**
 * One line of the anthology's contents page.
 *
 * A published table of contents, not a product grid: the case number sits in
 * the margin, the title is set large, the logline runs beneath it, and the
 * status is a word — never a badge, a colour alone, or a price tag shouted at
 * the reader.
 */
export function ContentsEntry({
  availability,
  hapticsEnabled,
  onPress,
}: ContentsEntryProps) {
  const { entry, status } = availability;
  const playable = status === 'playable';
  const statusColor = playable
    ? palette.mossText
    : status === 'available'
      ? palette.brass
      : palette.paperMuted;

  const body = (
    <View style={styles.entry}>
      <View style={styles.margin}>
        <AppText variant="mono" color={playable ? palette.rustText : palette.line}>
          {entry.number}
        </AppText>
      </View>

      <View style={styles.copy}>
        <AppText
          variant="title"
          color={playable ? palette.paper : palette.paperMuted}
          style={styles.title}
        >
          {entry.title}
        </AppText>
        <AppText variant="bodySmall" color={palette.paperMuted} style={styles.logline}>
          {entry.logline}
        </AppText>

        <View style={styles.statusRow}>
          {/* Colour never stands alone: an icon and the word carry the state. */}
          <Ionicons
            color={statusColor}
            name={
              playable
                ? 'folder-open-outline'
                : status === 'available'
                  ? 'bookmark-outline'
                  : 'time-outline'
            }
            size={14}
          />
          <AppText variant="mono" color={statusColor}>
            {availabilityLabel(status)}
          </AppText>
          {availability.entitled && !playable ? (
            <AppText variant="mono" color={palette.mossText}>
              · IN YOUR COLLECTION
            </AppText>
          ) : null}
        </View>
      </View>

      {playable ? (
        <Ionicons color={palette.paperMuted} name="chevron-forward" size={18} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View
        accessibilityLabel={`Case ${entry.number}, ${entry.title}. ${availabilityLabel(
          status,
        )}. ${entry.logline}`}
        accessibilityRole="text"
      >
        {body}
      </View>
    );
  }

  return (
    <TactilePressable
      accessibilityHint="Open this case"
      accessibilityLabel={`Open case ${entry.number}, ${entry.title}`}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      pressedScale={0.99}
    >
      {body}
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  margin: {
    minWidth: 30,
    paddingTop: 4,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
  },
  logline: {
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
});
