import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing, touch } from '@/design-system/theme/tokens';
import { useAppStore, type TextScale } from '@/state/app.store';

/**
 * ACCESSIBILITY
 *
 * Three settings, each of which changes how the game reads without changing
 * what it is: text size, contrast, and motion. Everything here is previewed in
 * place — the sample line below the text size control is rendered with the
 * scale that is actually selected.
 */

const TEXT_SCALES: { value: TextScale; label: string; sample: string }[] = [
  { value: 'standard', label: 'Standard', sample: 'A' },
  { value: 'large', label: 'Large', sample: 'A' },
  { value: 'larger', label: 'Larger', sample: 'A' },
];

export function AccessibilityPanel() {
  const settings = useAppStore((state) => state.settings);
  const setSetting = useAppStore((state) => state.setSetting);

  return (
    <View>
      <AppText variant="mono" color={palette.rust} style={styles.groupLabel}>
        ACCESSIBILITY
      </AppText>

      <View style={styles.list}>
        <View
          accessibilityLabel="Text size"
          accessibilityRole="radiogroup"
          style={styles.stackedRow}
        >
          <View style={styles.rowCopy}>
            <AppText variant="body">Text size</AppText>
            <AppText variant="bodySmall" color={palette.paperMuted}>
              Applied on top of your device text size. Case files, evidence, and
              metadata all scale together.
            </AppText>
          </View>
          <View style={styles.choices}>
            {TEXT_SCALES.map((option, index) => {
              const selected = settings.textScale === option.value;
              return (
                <TactilePressable
                  accessibilityLabel={`Set text size to ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  hapticsEnabled={settings.hapticsEnabled}
                  key={option.value}
                  onPress={() => setSetting('textScale', option.value)}
                  style={[styles.choice, selected && styles.choiceSelected]}
                >
                  <AppText
                    color={selected ? palette.ink : palette.paper}
                    style={{ fontSize: 15 + index * 4 }}
                  >
                    {option.sample}
                  </AppText>
                  <AppText
                    variant="mono"
                    color={selected ? palette.ink : palette.paperMuted}
                  >
                    {option.label.toUpperCase()}
                  </AppText>
                </TactilePressable>
              );
            })}
          </View>
        </View>

        <ToggleRow
          hapticsEnabled={settings.hapticsEnabled}
          icon="contrast-outline"
          label="High contrast"
          note="Raises text, metadata, and evidence identifiers to maximum legibility"
          onValueChange={(value) => setSetting('highContrast', value)}
          value={settings.highContrast}
        />

        <ToggleRow
          hapticsEnabled={settings.hapticsEnabled}
          icon="accessibility-outline"
          label="Reduce motion"
          note="Immediate transitions, no spring movement, and evidence cards sit square on the board"
          onValueChange={(value) => setSetting('reduceMotion', value)}
          value={settings.reduceMotion}
        />
      </View>
    </View>
  );
}

function ToggleRow({
  hapticsEnabled,
  icon,
  label,
  note,
  onValueChange,
  value,
}: {
  hapticsEnabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  note: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <TactilePressable
      accessibilityHint={`Double tap to turn ${label.toLowerCase()} ${value ? 'off' : 'on'}`}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hapticsEnabled={hapticsEnabled}
      onPress={() => onValueChange(!value)}
      pressedScale={0.995}
      style={styles.row}
    >
      <Ionicons
        color={value ? palette.brass : palette.paperMuted}
        name={icon}
        size={21}
        style={styles.rowIcon}
      />
      <View style={styles.rowCopy}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="bodySmall" color={palette.paperMuted}>
          {note}
        </AppText>
      </View>
      <Switch
        ios_backgroundColor={palette.charcoalRaised}
        onValueChange={onValueChange}
        pointerEvents="none"
        thumbColor={palette.paper}
        trackColor={{ false: palette.charcoalRaised, true: palette.brassPressed }}
        value={value}
      />
    </TactilePressable>
  );
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
    // minHeight, never height: a row has to be able to grow with its text.
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  stackedRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
    gap: spacing.sm,
  },
  rowIcon: {
    width: 30,
  },
  rowCopy: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 2,
  },
  choices: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  choice: {
    flex: 1,
    minHeight: touch.comfortableTarget + 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: palette.line,
  },
  choiceSelected: {
    backgroundColor: palette.brass,
    borderColor: palette.brass,
  },
});
