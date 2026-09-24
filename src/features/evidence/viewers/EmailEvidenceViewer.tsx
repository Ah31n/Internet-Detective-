import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { EmailEvidenceDefinition, EvidenceId } from '@/case-engine';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';

import { PageLoad } from '../components/EvidenceReveal';
import { EvidenceTextBlocks } from './EvidenceTextBlocks';

export function EmailEvidenceViewer({
  evidence,
  hapticsEnabled,
  onOpenEvidence,
}: {
  evidence: EmailEvidenceDefinition;
  hapticsEnabled: boolean;
  onOpenEvidence: (evidenceId: EvidenceId) => void;
}) {
  const formatAddress = (address: { name?: string; address: string }) =>
    address.name ? `${address.name} <${address.address}>` : address.address;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <PageLoad index={0} style={styles.mailHeader}>
        <View style={styles.subjectRow}>
          <AppText variant="title" style={styles.subject}>
            {evidence.subject}
          </AppText>
          <Ionicons color={palette.brass} name="mail-open-outline" size={24} />
        </View>
        <AddressRow label="FROM" value={formatAddress(evidence.from)} />
        <AddressRow label="TO" value={evidence.to.map(formatAddress).join(', ')} />
        {evidence.cc?.length ? (
          <AddressRow label="CC" value={evidence.cc.map(formatAddress).join(', ')} />
        ) : null}
        <AddressRow label="DATE" value={evidence.sentAtLabel} />
      </PageLoad>

      <PageLoad index={1} style={styles.body}>
        <EvidenceTextBlocks blocks={evidence.body} ink={palette.paper} muted={palette.paperMuted} />
      </PageLoad>

      {evidence.attachmentEvidenceIds.length > 0 ? (
        <PageLoad index={2} style={styles.attachments}>
          <AppText variant="label" color={palette.rust}>
            LINKED ATTACHMENTS
          </AppText>
          {evidence.attachmentEvidenceIds.map((evidenceId) => (
            <TactilePressable
              key={evidenceId}
              accessibilityLabel={`Open attached evidence ${evidenceId.replace(/^evidence-/, '').replace(/-/g, ' ')}`}
              accessibilityRole="button"
              hapticsEnabled={hapticsEnabled}
              onPress={() => onOpenEvidence(evidenceId)}
              style={styles.attachmentRow}
            >
              <Ionicons color={palette.brass} name="attach" size={19} />
              <AppText variant="mono" color={palette.paper} style={styles.attachmentCopy}>
                {evidenceId}
              </AppText>
              <Ionicons color={palette.paperMuted} name="chevron-forward" size={18} />
            </TactilePressable>
          ))}
        </PageLoad>
      ) : null}
    </ScrollView>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.addressRow}>
      <AppText variant="mono" color={palette.rust} style={styles.addressLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" color={palette.paperMuted} style={styles.addressValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  mailHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  subject: {
    flex: 1,
    paddingRight: spacing.md,
  },
  addressRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  addressLabel: {
    width: 48,
  },
  addressValue: {
    flex: 1,
  },
  body: {
    padding: spacing.lg,
  },
  attachments: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  attachmentRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  attachmentCopy: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
});
