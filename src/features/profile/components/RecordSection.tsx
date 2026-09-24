import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

interface RecordSectionProps {
  /** Printed section number, e.g. `II`. */
  numeral: string;
  title: string;
  /** Right-hand count or note, set in mono. */
  aside?: string;
}

/**
 * A section of the record: a rule, a numeral, a heading set in small caps.
 * The page is typeset, not laid out in cards — the whole point of the profile
 * is that it reads like a document a detective would be handed.
 */
export function RecordSection({
  numeral,
  title,
  aside,
  children,
}: PropsWithChildren<RecordSectionProps>) {
  return (
    <View style={styles.section}>
      <View style={styles.rule} />
      <View style={styles.heading}>
        <AppText variant="mono" color={palette.rust}>
          {numeral}
        </AppText>
        <AppText accessibilityRole="header" variant="label" style={styles.title}>
          {title}
        </AppText>
        {aside ? (
          <AppText variant="mono" color={palette.paperMuted}>
            {aside}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  rule: {
    height: 1,
    backgroundColor: palette.line,
  },
  heading: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    flex: 1,
  },
});
