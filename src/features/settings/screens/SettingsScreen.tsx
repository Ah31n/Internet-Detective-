import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { GameButton } from '@/design-system/components/GameButton';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import {
  CASE_SESSION_STORAGE_KEY,
  useCaseSessionStore,
} from '@/state/case-session.store';
import { autosaveStorage } from '@/state/persistence/autosaveStorage';
import { usePlayerState, useSaveHealth } from '@/state/playerState';

import { AccessibilityPanel } from '../components/AccessibilityPanel';
import { AudioSettingsPanel } from '../components/AudioSettingsPanel';
import { BuildStamp } from '../components/BuildStamp';

export function SettingsScreen() {
  const settings = useAppStore((state) => state.settings);
  const setSetting = useAppStore((state) => state.setSetting);
  const resetShell = useAppStore((state) => state.resetShell);
  const player = usePlayerState();
  const saveHealth = useSaveHealth();
  const recoveredCaseIds = useCaseSessionStore((state) => state.recoveredCaseIds);
  const damagedSave = saveHealth.find((record) => record.status !== 'healthy');

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="label" color={palette.brass}>
            DEVICE PROTOCOL
          </AppText>
          <AppText variant="title">Settings</AppText>
        </View>
        <TactilePressable
          accessibilityLabel="Close settings"
          accessibilityRole="button"
          hapticsEnabled={settings.hapticsEnabled}
          onPress={() => router.back()}
          style={styles.close}
        >
          <Ionicons color={palette.paper} name="close" size={26} />
        </TactilePressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AppText variant="mono" color={palette.rust}>
          INTERACTION
        </AppText>
        <View style={styles.settingList}>
          <SettingRow
            label="Haptic feedback"
            note="Physical confirmation for navigation and controls"
            onValueChange={(value) => setSetting('hapticsEnabled', value)}
            value={settings.hapticsEnabled}
          />
        </View>

        <AccessibilityPanel />

        <AudioSettingsPanel />

        {/* PHASE 19 — a six-cell LABEL/VALUE grid used to sit here: level,
            experience, achievements, cases closed, time on case, and the raw
            route path of the last screen. It was a dashboard tile grid inside
            a detective game, it printed an internal route to the player, and
            it duplicated the Detective Record — which presents the same
            figures as a typeset ledger, properly. One quiet line instead. */}
        <TactilePressable
          accessibilityHint="Your rank, closed cases, commendations, and statistics"
          accessibilityLabel="Open your detective record"
          accessibilityRole="button"
          hapticsEnabled={settings.hapticsEnabled}
          onPress={() => {
            router.back();
            router.push('/profile');
          }}
          style={styles.recordLink}
        >
          <View style={styles.recordLinkCopy}>
            <AppText variant="label" color={palette.paper}>
              DETECTIVE RECORD
            </AppText>
            <AppText variant="bodySmall" color={palette.paperMuted}>
              Rank {player.detectiveLevel.level} ·{' '}
              {player.detectiveLevel.title} · {player.completedCaseIds.length}{' '}
              case{player.completedCaseIds.length === 1 ? '' : 's'} closed
            </AppText>
          </View>
          <Ionicons color={palette.paperMuted} name="chevron-forward" size={18} />
        </TactilePressable>

        <View
          style={[
            styles.persistenceNote,
            damagedSave ? styles.persistenceNoteAlert : null,
          ]}
        >
          <Ionicons
            color={damagedSave ? palette.rust : palette.moss}
            name={damagedSave ? 'medkit-outline' : 'shield-checkmark-outline'}
            size={22}
          />
          <View style={styles.persistenceCopy}>
            <AppText
              variant="label"
              color={damagedSave ? palette.rust : palette.moss}
            >
              {damagedSave ? 'SAVE RECOVERY' : 'LOCAL CONTINUITY'}
            </AppText>
            <AppText variant="bodySmall" color={palette.paperMuted}>
              {damagedSave
                ? damagedSave.detail
                : 'Progress, notes, board layout, and your last destination are autosaved on this device and restored on relaunch. No account or connection is used.'}
            </AppText>
            {recoveredCaseIds.length > 0 ? (
              <AppText variant="bodySmall" color={palette.rust}>
                {recoveredCaseIds.length} unreadable case entr
                {recoveredCaseIds.length === 1 ? 'y was' : 'ies were'} set aside. Other
                progress was kept.
              </AppText>
            ) : null}
            {damagedSave ? (
              <GameButton
                hapticsEnabled={settings.hapticsEnabled}
                onPress={() => {
                  void autosaveStorage
                    .restoreBackup(CASE_SESSION_STORAGE_KEY)
                    .then(() => useCaseSessionStore.persist.rehydrate());
                }}
                tone="outline"
              >
                RESTORE LAST GOOD SAVE
              </GameButton>
            ) : null}
          </View>
        </View>

        {/* PHASE 17 — the developer panel used to sit here, in plain view.
            It is gone. What remains is a build stamp with a hidden tap
            gesture, and in a release build even that is an inert label. */}
        <BuildStamp
          build={String(Constants.expoConfig?.ios?.buildNumber ?? '1')}
          hapticsEnabled={settings.hapticsEnabled}
          version={String(Constants.expoConfig?.version ?? '0.0.0')}
        />
      </ScrollView>

      <View style={styles.footer}>
        <GameButton
          hapticsEnabled={settings.hapticsEnabled}
          onPress={() => {
            resetShell();
            router.dismissAll();
            router.replace('/investigation-home');
          }}
          tone="quiet"
        >
          RESET SHELL POSITION
        </GameButton>
      </View>
    </Screen>
  );
}

function SettingRow({
  label,
  note,
  onValueChange,
  value,
}: {
  label: string;
  note: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="bodySmall" color={palette.paperMuted}>
          {note}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        ios_backgroundColor={palette.line}
        onValueChange={onValueChange}
        thumbColor={value ? palette.brass : palette.paperMuted}
        trackColor={{ false: palette.line, true: palette.brassPressed }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  settingList: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  rowCopy: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 2,
  },
  groupLabel: {
    marginTop: spacing.xl,
  },
  recordLink: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  recordLinkCopy: {
    flex: 1,
    gap: 2,
  },
  persistenceNoteAlert: {
    borderTopColor: palette.rust,
  },
  persistenceNote: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.moss,
  },
  persistenceCopy: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
});
