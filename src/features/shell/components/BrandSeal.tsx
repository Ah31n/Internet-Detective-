import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { palette, radius } from '@/design-system/theme/tokens';

interface BrandSealProps {
  size?: number;
  muted?: boolean;
}

export function BrandSeal({ size = 44, muted = false }: BrandSealProps) {
  const color = muted ? palette.line : palette.brass;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
      ]}
    >
      <Ionicons color={color} name="search" size={size * 0.5} />
      <View style={[styles.signal, { backgroundColor: muted ? color : palette.rust }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signal: {
    position: 'absolute',
    top: 1,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
});
