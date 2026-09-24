import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, radius, spacing } from '@/design-system/theme/tokens';

/**
 * THE CASE FILE ON THE DESK
 *
 * The front door of the game: one physical object, one thing to do with it.
 *
 * It replaces a numbered registry of five destinations that read like a site
 * map and left a new player guessing which of three routes started the game.
 * A player opening this app should not have to make a navigation decision
 * before they have made an investigative one — they should see a case file and
 * open it.
 *
 * It is paper on a dark desk, the same stock the briefing dossier is printed
 * on, so opening it is continuous with what happens next rather than a jump to
 * another screen.
 */

export type CaseFileState = 'sealed' | 'briefed' | 'open' | 'closed';

interface DeskCaseFileProps {
  number: string;
  title: string;
  classification: string;
  /** The state of the work, in words. Never a percentage. */
  statusLine: string;
  state: CaseFileState;
  hapticsEnabled: boolean;
  onPress: () => void;
}

const ACTION: Record<CaseFileState, string> = {
  sealed: 'OPEN THE CASE FILE',
  briefed: 'READ THE BRIEF',
  open: 'RESUME INVESTIGATION',
  closed: 'READ THE CASE REPORT',
};

export function DeskCaseFile({
  number,
  title,
  classification,
  statusLine,
  state,
  hapticsEnabled,
  onPress,
}: DeskCaseFileProps) {
  return (
    <TactilePressable
      accessibilityHint={ACTION[state].toLowerCase()}
      accessibilityLabel={`Case ${number}, ${title}. ${statusLine}.`}
      accessibilityRole="button"
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      pressedScale={0.985}
      style={styles.press}
    >
      {/* The folder tab, cut into the top edge of the file. */}
      <View style={styles.tabRow}>
        <View style={styles.tab}>
          <AppText fixedScale variant="mono" color={palette.rustInk}>
            CASE {number}
          </AppText>
        </View>
      </View>

      <View style={styles.folder}>
        <View style={styles.stampRow}>
          <AppText fixedScale variant="mono" color={palette.rustInk}>
            {classification}
          </AppText>
          {state === 'closed' ? (
            <View style={styles.closedStamp}>
              <AppText fixedScale variant="mono" color={palette.mossInk}>
                CLOSED
              </AppText>
            </View>
          ) : null}
        </View>

        <AppText
          accessibilityRole="header"
          color={palette.black}
          style={styles.title}
          variant="display"
        >
          {title}
        </AppText>

        <View style={styles.rule} />

        <AppText fixedScale variant="mono" color="#6B6354">
          {statusLine}
        </AppText>

        {/* The action reads as a line on the document, not a web button. */}
        <View style={styles.actionRow}>
          <AppText fixedScale variant="label" color={palette.rustInk}>
            {ACTION[state]}
          </AppText>
          <Ionicons color={palette.rustInk} name="arrow-forward" size={17} />
        </View>
      </View>
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  press: {
    marginTop: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.paperMuted,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  folder: {
    padding: spacing.lg,
    backgroundColor: palette.paper,
    borderRadius: radius.sm,
    // The file sits on the desk rather than floating in a layout.
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  stampRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  closedStamp: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: palette.mossInk,
    transform: [{ rotateZ: '-3deg' }],
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  rule: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: 'rgba(17,20,15,0.22)',
  },
  actionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
