import { ScrollView, StyleSheet, View } from 'react-native';

import type { ReceiptEvidenceDefinition } from '@/case-engine';
import { useCueOnMount } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

import { ArtifactEnter } from '../components/EvidenceReveal';

export function ReceiptEvidenceViewer({
  evidence,
}: {
  evidence: ReceiptEvidenceDefinition;
}) {
  useCueOnMount('ui-paper');
  return (
    <ScrollView contentContainerStyle={styles.canvas} showsVerticalScrollIndicator={false}>
      <ArtifactEnter style={styles.receipt}>
        <View style={styles.serrationTop} />
        <AppText variant="label" color={palette.ink} style={styles.center}>
          {evidence.merchant}
        </AppText>
        {evidence.addressLines.map((line) => (
          <AppText key={line} variant="mono" color={palette.inkSoft} style={styles.center}>
            {line}
          </AppText>
        ))}
        <AppText variant="mono" color={palette.inkSoft} style={styles.center}>
          {evidence.issuedAtLabel}
        </AppText>

        <View style={styles.dashedRule} />
        {evidence.lines.map((line) => (
          <View key={line.id} style={styles.lineItem}>
            <AppText variant="mono" color={palette.ink} style={styles.quantity}>
              {line.quantity}×
            </AppText>
            <AppText variant="mono" color={palette.ink} style={styles.description}>
              {line.description}
            </AppText>
            <AppText variant="mono" color={palette.ink}>
              {line.amountLabel}
            </AppText>
          </View>
        ))}
        <View style={styles.dashedRule} />
        <TotalRow label="SUBTOTAL" value={evidence.subtotalLabel} />
        {evidence.taxLabel ? <TotalRow label="TAX" value={evidence.taxLabel} /> : null}
        <View style={styles.totalRule} />
        <TotalRow label="TOTAL" value={evidence.totalLabel} strong />
        {evidence.paymentLabel ? (
          <AppText variant="mono" color={palette.inkSoft} style={styles.footerCopy}>
            PAID / {evidence.paymentLabel}
          </AppText>
        ) : null}
        {evidence.referenceLabel ? (
          <AppText variant="mono" color={palette.inkSoft} style={styles.footerCopy}>
            REF / {evidence.referenceLabel}
          </AppText>
        ) : null}
        <View style={styles.barcode}>
          {Array.from({ length: 28 }, (_, index) => (
            <View
              key={index}
              style={[styles.barcodeLine, { width: index % 3 === 0 ? 3 : 1 }]}
            />
          ))}
        </View>
      </ArtifactEnter>
    </ScrollView>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <AppText variant={strong ? 'label' : 'mono'} color={palette.ink}>
        {label}
      </AppText>
      <AppText variant={strong ? 'label' : 'mono'} color={palette.ink}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  receipt: {
    width: '92%',
    maxWidth: 360,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: '#F2EAD5',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  serrationTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: palette.paperMuted,
    opacity: 0.35,
  },
  center: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dashedRule: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: palette.paperMuted,
  },
  lineItem: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  quantity: {
    width: 30,
  },
  description: {
    flex: 1,
  },
  totalRule: {
    height: 2,
    marginVertical: spacing.sm,
    backgroundColor: palette.ink,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  footerCopy: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  barcode: {
    height: 42,
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: palette.ink,
  },
});
