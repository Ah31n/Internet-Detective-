import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';
import type { RecordFigure } from '@/core/progression/profileStatistics';

interface LedgerLineProps {
  figure: RecordFigure;
}

/**
 * One line of the ledger: label, a hairline leader, the figure.
 *
 * This is the contents-page convention — the eye tracks the rule across to the
 * number. It is the reason the statistics do not need boxes drawn around them.
 */
export function LedgerLine({ figure }: LedgerLineProps) {
  return (
    <View
      accessibilityLabel={`${figure.label.toLowerCase()}: ${figure.value}${
        figure.footnote ? `, ${figure.footnote}` : ''
      }`}
      accessibilityRole="text"
      style={styles.line}
    >
      <View style={styles.row}>
        <AppText variant="label" color={palette.paper}>
          {figure.label}
        </AppText>
        <View style={styles.leader} />
        <AppText variant="mono" color={palette.brass} style={styles.value}>
          {figure.value}
        </AppText>
      </View>
      {figure.footnote ? (
        <AppText variant="bodySmall" color={palette.paperMuted}>
          {figure.footnote}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    paddingVertical: spacing.xs,
  },
  row: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  leader: {
    flex: 1,
    height: 1,
    marginBottom: 5,
    backgroundColor: palette.line,
  },
  value: {
    fontSize: 15,
  },
});
