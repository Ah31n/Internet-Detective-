import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEV_TOOLS_ENABLED } from '@/core/dev/devMode';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';

/**
 * THE HIDDEN ENTRY POINT
 *
 * The QA console has no button. What Settings shows is a build stamp — the
 * version and build number a tester would quote in a bug report, which every
 * app has and which gives nothing away.
 *
 * Seven taps on it within three seconds opens the console. The convention is
 * borrowed from Android's build-number tap, and it is chosen because it cannot
 * be reached by accident and cannot be found by reading the interface.
 *
 * In a release build the whole mechanism is inert: `DEV_TOOLS_ENABLED` folds
 * to `false`, the counter is never armed, and the stamp is a label. It is not
 * a hidden door with the console behind it — there is nothing behind it,
 * because the console is not in the binary.
 */

const REQUIRED_TAPS = 7;
const WINDOW_MS = 3_000;

interface BuildStampProps {
  version: string;
  build: string;
  hapticsEnabled: boolean;
}

export function BuildStamp({ version, build, hapticsEnabled }: BuildStampProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const tapsRef = useRef(0);
  const firstTapRef = useRef(0);

  const stamp = `INTERNET DETECTIVE ${version} · BUILD ${build}`;

  if (!DEV_TOOLS_ENABLED) {
    // Release: a plain, unpressable label. No handler, no counter, no target.
    return (
      <View style={styles.stamp}>
        <AppText variant="mono" color={palette.line}>
          {stamp}
        </AppText>
      </View>
    );
  }

  const handleTap = () => {
    const now = Date.now();
    if (now - firstTapRef.current > WINDOW_MS) {
      firstTapRef.current = now;
      tapsRef.current = 0;
    }
    tapsRef.current += 1;

    const left = REQUIRED_TAPS - tapsRef.current;
    if (left <= 0) {
      tapsRef.current = 0;
      setRemaining(null);
      router.push('/qa');
      return;
    }
    // Stay silent until the taps are clearly deliberate.
    setRemaining(left <= 3 ? left : null);
  };

  return (
    <TactilePressable
      accessibilityLabel={stamp}
      accessibilityRole="text"
      feedback="none"
      hapticsEnabled={hapticsEnabled}
      onPress={handleTap}
      style={styles.stamp}
    >
      <AppText variant="mono" color={palette.line}>
        {stamp}
      </AppText>
      {remaining !== null ? (
        <AppText variant="mono" color={palette.rustText}>
          {remaining} MORE
        </AppText>
      ) : null}
    </TactilePressable>
  );
}

const styles = StyleSheet.create({
  stamp: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: spacing.lg,
  },
});
