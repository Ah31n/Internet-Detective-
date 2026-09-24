import { ScrollView, StyleSheet, View } from 'react-native';

import type { MessageEvidenceDefinition } from '@/case-engine';
import { AppText } from '@/design-system/components/AppText';
import { palette, radius, spacing } from '@/design-system/theme/tokens';

import { ConversationReveal } from '../components/EvidenceReveal';

export function MessageEvidenceViewer({
  evidence,
}: {
  evidence: MessageEvidenceDefinition;
}) {
  const participants = new Map(
    evidence.participants.map((participant) => [participant.id, participant]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.threadHeader}>
        <View style={styles.avatar}>
          <AppText variant="label" color={palette.ink}>
            {evidence.conversationTitle.slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="body">{evidence.conversationTitle}</AppText>
          <AppText variant="mono" color={palette.paperMuted}>
            {evidence.platform} · {evidence.participants.length} PARTICIPANTS
          </AppText>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
        {evidence.messages.map((message, index) => {
          const participant = participants.get(message.senderId);
          const outgoing = participant?.isDeviceOwner ?? false;
          return (
            <ConversationReveal
              index={index}
              key={message.id}
              outgoing={outgoing}
              style={[styles.messageRow, outgoing && styles.outgoingRow]}
            >
              <AppText
                variant="mono"
                color={palette.paperMuted}
                style={outgoing ? styles.alignRight : undefined}
              >
                {participant?.displayName ?? message.senderId} · {message.sentAtLabel}
              </AppText>
              <View style={[styles.bubble, outgoing ? styles.outgoingBubble : styles.incomingBubble]}>
                <AppText variant="body" color={outgoing ? palette.ink : palette.paper}>
                  {message.body}
                </AppText>
              </View>
              {message.status ? (
                <AppText
                  variant="mono"
                  color={palette.paperMuted}
                  style={outgoing ? styles.alignRight : undefined}
                >
                  {message.status.toUpperCase()}
                </AppText>
              ) : null}
            </ConversationReveal>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121713',
  },
  threadHeader: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
  },
  headerCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  thread: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  messageRow: {
    width: '82%',
    marginBottom: spacing.md,
    gap: 4,
  },
  outgoingRow: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  incomingBubble: {
    backgroundColor: palette.charcoalRaised,
    borderBottomLeftRadius: 3,
  },
  outgoingBubble: {
    backgroundColor: palette.brass,
    borderBottomRightRadius: 3,
  },
  alignRight: {
    textAlign: 'right',
  },
});
