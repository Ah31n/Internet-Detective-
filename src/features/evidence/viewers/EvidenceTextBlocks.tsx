import { StyleSheet, View } from 'react-native';

import type { EvidenceTextBlock } from '@/case-engine';
import { AppText } from '@/design-system/components/AppText';
import { palette, spacing } from '@/design-system/theme/tokens';

export function EvidenceTextBlocks({
  blocks,
  ink = palette.ink,
  muted = palette.inkSoft,
}: {
  blocks: readonly EvidenceTextBlock[];
  ink?: string;
  muted?: string;
}) {
  return (
    <View style={styles.blocks}>
      {blocks.map((block) => {
        switch (block.kind) {
          case 'heading':
            return (
              <AppText key={block.id} variant="title" color={ink} style={styles.heading}>
                {block.text}
              </AppText>
            );
          case 'paragraph':
            return (
              <AppText key={block.id} variant="body" color={muted} style={styles.paragraph}>
                {block.text}
              </AppText>
            );
          case 'quote':
            return (
              <View key={block.id} style={styles.quote}>
                <AppText variant="body" color={muted}>
                  “{block.text}”
                </AppText>
              </View>
            );
          case 'redaction':
            return (
              <View
                key={block.id}
                accessibilityLabel="Redacted text"
                style={[
                  styles.redaction,
                  { width: Math.min(280, Math.max(48, block.characterCount * 7)) },
                ]}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {
    gap: spacing.md,
  },
  heading: {
    marginTop: spacing.sm,
  },
  paragraph: {
    letterSpacing: 0.1,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: palette.rust,
    paddingLeft: spacing.md,
  },
  redaction: {
    height: 15,
    backgroundColor: palette.black,
  },
});
