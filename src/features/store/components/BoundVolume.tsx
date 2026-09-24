import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { ShelfEntry } from '@/core/commerce';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';

interface BoundVolumeProps {
  entry: ShelfEntry;
  busy: boolean;
  hapticsEnabled: boolean;
  onAcquire: () => void;
}

/**
 * A collected edition, presented as a bound volume on a shelf: a spine rule,
 * the title, what it contains, and the price set quietly in the margin.
 *
 * There is no "BEST VALUE" flag, no struck-through price, no countdown, and no
 * comparison table. The reader is trusted to decide which volume they want.
 */
export function BoundVolume({
  entry,
  busy,
  hapticsEnabled,
  onAcquire,
}: BoundVolumeProps) {
  const { product, owned, purchasable, price } = entry;

  return (
    <View style={styles.volume}>
      <View style={styles.spine} />

      <View style={styles.body}>
        <View style={styles.headRow}>
          <View style={styles.headCopy}>
            <AppText variant="title" style={styles.title}>
              {product.title}
            </AppText>
            <AppText variant="mono" color={palette.rustText}>
              {product.shelfLine}
            </AppText>
          </View>
          {owned ? null : (
            <AppText variant="mono" color={palette.brass} style={styles.price}>
              {price}
            </AppText>
          )}
        </View>

        <AppText variant="bodySmall" color={palette.paperMuted} style={styles.blurb}>
          {product.description}
        </AppText>

        {owned ? (
          <View style={styles.ownedRow}>
            <Ionicons color={palette.mossText} name="checkmark-circle-outline" size={16} />
            <AppText variant="mono" color={palette.mossText}>
              IN YOUR COLLECTION
            </AppText>
          </View>
        ) : purchasable ? (
          <TactilePressable
            accessibilityLabel={`Acquire ${product.title.toLowerCase()} for ${price}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            hapticsEnabled={hapticsEnabled}
            onPress={onAcquire}
            style={[styles.acquire, busy && styles.acquireBusy]}
          >
            <AppText variant="label" color={palette.brass}>
              {busy ? 'WORKING…' : 'ACQUIRE'}
            </AppText>
          </TactilePressable>
        ) : (
          <View style={styles.pendingRow}>
            <Ionicons color={palette.line} name="time-outline" size={15} />
            <AppText variant="mono" color={palette.paperMuted}>
              NOT YET PUBLISHED
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  volume: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  spine: {
    width: 5,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: palette.brass,
    backgroundColor: palette.rust,
  },
  body: {
    flex: 1,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headCopy: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  price: {
    fontSize: 15,
    paddingTop: 4,
  },
  blurb: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 30,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 30,
  },
  acquire: {
    minHeight: 46,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.brass,
  },
  acquireBusy: {
    opacity: 0.6,
  },
});
