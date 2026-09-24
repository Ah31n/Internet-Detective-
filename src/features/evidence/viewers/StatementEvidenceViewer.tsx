import { ScrollView, StyleSheet, View } from 'react-native';

import type { StatementEvidenceDefinition } from '@/case-engine';
import { useCueOnMount } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

import { DocumentUnfold } from '../components/EvidenceReveal';
import { EvidenceTextBlocks } from './EvidenceTextBlocks';

export function StatementEvidenceViewer({
  evidence,
}: {
  evidence: StatementEvidenceDefinition;
}) {
  useCueOnMount('ui-paper');
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <DocumentUnfold index={0} style={styles.formHeader}>
        <AppText variant="mono" color={palette.rustInk}>
          RECORDED STATEMENT
        </AppText>
        <AppText variant="title" color={palette.ink} style={styles.speaker}>
          {evidence.speakerName}
        </AppText>
        {evidence.speakerRole ? (
          <AppText variant="mono" color={palette.inkSoft}>
            {evidence.speakerRole.toUpperCase()}
          </AppText>
        ) : null}
        <View style={styles.metaRule}>
          <AppText variant="mono" color={palette.inkSoft}>
            {evidence.recordedAtLabel}
          </AppText>
          {evidence.locationLabel ? (
            <AppText variant="mono" color={palette.inkSoft}>
              {evidence.locationLabel}
            </AppText>
          ) : null}
        </View>
      </DocumentUnfold>

      <DocumentUnfold index={1} style={styles.transcript}>
        <AppText variant="label" color={palette.rustInk}>
          TRANSCRIPT
        </AppText>
        <EvidenceTextBlocks blocks={evidence.paragraphs} />
      </DocumentUnfold>

      {evidence.signedBy ? (
        <DocumentUnfold index={2} style={styles.signatureArea}>
          <View style={styles.signatureLine} />
          <AppText variant="title" color={palette.ink} style={styles.signature}>
            {evidence.signedBy}
          </AppText>
          <AppText variant="mono" color={palette.inkSoft}>
            SIGNED STATEMENT
          </AppText>
        </DocumentUnfold>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    margin: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: palette.paper,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 7,
  },
  formHeader: {
    borderBottomWidth: 2,
    borderBottomColor: palette.rust,
    paddingBottom: spacing.lg,
  },
  speaker: {
    marginTop: spacing.sm,
  },
  metaRule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  transcript: {
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  signatureArea: {
    marginTop: spacing.xl,
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 180,
    height: 1,
    backgroundColor: palette.ink,
  },
  signature: {
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
