import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Switch, View } from 'react-native';

import { playCue } from '@/core/audio/audioEngine';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore, type AudioSettings } from '@/state/app.store';

/**
 * AUDIO — four controls, no more.
 *
 * Master mute is absolute. The three volumes are stepped rather than
 * continuous: a detective's console has detents, and a stepped control is a
 * far better touch target than a hairline slider thumb. Every change previews
 * itself with a cue from the layer being adjusted, so the player hears the
 * setting instead of guessing at it.
 */

const STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

type VolumeKey = Extract<
  keyof AudioSettings,
  'musicVolume' | 'effectsVolume' | 'ambientVolume'
>;

const LAYER_PREVIEW: Record<VolumeKey, Parameters<typeof playCue>[0]> = {
  musicVolume: 'completion-case-closed',
  effectsVolume: 'ui-evidence-place',
  ambientVolume: 'ui-paper',
};

export function AudioSettingsPanel() {
  const audio = useAppStore((state) => state.settings.audio);
  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const setAudioSetting = useAppStore((state) => state.setAudioSetting);

  return (
    <View>
      <AppText variant="mono" color={palette.rust} style={styles.groupLabel}>
        AUDIO
      </AppText>

      <View style={styles.list}>
        <TactilePressable
          accessibilityLabel="Mute all audio"
          accessibilityRole="switch"
          accessibilityState={{ checked: audio.masterMuted }}
          hapticsEnabled={hapticsEnabled}
          onPress={() => setAudioSetting('masterMuted', !audio.masterMuted)}
          pressedScale={0.995}
          style={styles.row}
        >
          <View style={styles.rowCopy}>
            <AppText variant="body">Mute all audio</AppText>
            <AppText variant="bodySmall" color={palette.paperMuted}>
              Silences every layer. Haptics and the investigation continue.
            </AppText>
          </View>
          <Switch
            ios_backgroundColor={palette.charcoalRaised}
            onValueChange={(value) => setAudioSetting('masterMuted', value)}
            pointerEvents="none"
            thumbColor={palette.paper}
            trackColor={{
              false: palette.charcoalRaised,
              true: palette.brassPressed,
            }}
            value={audio.masterMuted}
          />
        </TactilePressable>

        <VolumeRow
          disabled={audio.masterMuted}
          hapticsEnabled={hapticsEnabled}
          label="Music"
          note="Scored cues, including the closing of a case"
          onChange={(value) => {
            setAudioSetting('musicVolume', value);
            playCue(LAYER_PREVIEW.musicVolume);
          }}
          value={audio.musicVolume}
        />
        <VolumeRow
          disabled={audio.masterMuted}
          hapticsEnabled={hapticsEnabled}
          label="Effects"
          note="Interface and investigation sounds"
          onChange={(value) => {
            setAudioSetting('effectsVolume', value);
            playCue(LAYER_PREVIEW.effectsVolume);
          }}
          value={audio.effectsVolume}
        />
        <VolumeRow
          disabled={audio.masterMuted}
          hapticsEnabled={hapticsEnabled}
          label="Ambience"
          note="Room tone, weather, and equipment beds"
          onChange={(value) => {
            setAudioSetting('ambientVolume', value);
            playCue(LAYER_PREVIEW.ambientVolume);
          }}
          value={audio.ambientVolume}
        />
      </View>
    </View>
  );
}

function VolumeRow({
  disabled,
  hapticsEnabled,
  label,
  note,
  onChange,
  value,
}: {
  disabled: boolean;
  hapticsEnabled: boolean;
  label: string;
  note: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const activeStep = nearestStep(value);

  return (
    <View
      accessibilityLabel={`${label} volume`}
      accessibilityRole="adjustable"
      accessibilityValue={{ now: Math.round(value * 100), min: 0, max: 100 }}
      style={styles.row}
    >
      <View style={styles.rowCopy}>
        <AppText variant="body" color={disabled ? palette.paperMuted : palette.paper}>
          {label}
        </AppText>
        <AppText variant="bodySmall" color={palette.paperMuted}>
          {note}
        </AppText>
      </View>
      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const filled = index <= activeStep;
          return (
            <TactilePressable
              accessibilityLabel={`Set ${label} volume to ${Math.round(step * 100)} percent`}
              accessibilityRole="button"
              disabled={disabled}
              feedback="none"
              hapticsEnabled={hapticsEnabled}
              key={step}
              onPress={() => onChange(step)}
              pressedScale={0.94}
              style={styles.stepTarget}
            >
              {index === 0 ? (
                <Ionicons
                  color={
                    disabled
                      ? palette.line
                      : activeStep === 0
                        ? palette.rust
                        : palette.paperMuted
                  }
                  name="volume-mute-outline"
                  size={17}
                />
              ) : (
                <View
                  style={[
                    styles.stepBar,
                    { height: 8 + index * 4 },
                    filled && !disabled ? styles.stepBarFilled : null,
                  ]}
                />
              )}
            </TactilePressable>
          );
        })}
      </View>
    </View>
  );
}

function nearestStep(value: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  STEPS.forEach((step, index) => {
    const distance = Math.abs(step - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

const styles = StyleSheet.create({
  groupLabel: {
    marginTop: spacing.xl,
  },
  list: {
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
  steps: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  stepTarget: {
    width: 30,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBar: {
    width: 4,
    backgroundColor: palette.charcoalRaised,
  },
  stepBarFilled: {
    backgroundColor: palette.brass,
  },
});
