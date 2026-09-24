import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { EmptyInstrument } from '@/features/shell/components/EmptyInstrument';
import { ShellHeader } from '@/features/shell/components/ShellHeader';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import {
  type InvestigationRoute,
  useAppStore,
} from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import {
  CaseInvestigationRenderer,
  type InvestigationSection,
} from '../components/CaseInvestigationRenderer';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface InvestigationSectionScreenProps {
  route: InvestigationRoute;
  section: string;
  code: string;
  title: string;
  message: string;
  icon: IconName;
}

export function InvestigationSectionScreen({
  route,
  section,
  code,
  title,
  message,
  icon,
}: InvestigationSectionScreenProps) {
  useRememberRoute(route);
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const activeDefinition = activeCaseId
    ? getCaseDefinition(activeCaseId)
    : undefined;
  const engineSection: InvestigationSection =
    route === '/investigation'
      ? 'hub'
      : route === '/investigation/evidence'
        ? 'evidence'
        : route === '/investigation/leads'
          ? 'leads'
          : 'notebook';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ShellHeader
        backHref="/investigation-home"
        eyebrow="INVESTIGATION ROOM"
        title={section}
      />
      {activeDefinition ? (
        <CaseInvestigationRenderer
          definition={activeDefinition}
          section={engineSection}
        />
      ) : (
        <>
          <View style={styles.channelBar}>
            <View style={styles.channelStatus}>
              <View style={styles.offlineDot} />
              <AppText variant="mono" color={palette.paperMuted}>
                CASE CHANNEL / IDLE
              </AppText>
            </View>
            <AppText variant="mono" color={palette.rust}>
              NO FILE
            </AppText>
          </View>

          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(260)}
            style={styles.instrument}
          >
            <EmptyInstrument
              code={code}
              icon={icon}
              message={message}
              title={title}
            />
          </Animated.View>

          <TactilePressable
            accessibilityLabel="Select a case from the library"
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => router.push('/case-library')}
            style={styles.libraryLink}
          >
            <Ionicons color={palette.brass} name="library-outline" size={18} />
            <AppText
              variant="label"
              color={palette.brass}
              style={styles.libraryCopy}
            >
              SELECT CASE FROM LIBRARY
            </AppText>
            <Ionicons color={palette.brass} name="arrow-forward" size={18} />
          </TactilePressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  channelBar: {
    minHeight: 42,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  channelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.line,
    marginRight: spacing.xs,
  },
  instrument: {
    flex: 1,
  },
  libraryLink: {
    minHeight: 54,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  libraryCopy: {
    marginHorizontal: spacing.sm,
  },
});
