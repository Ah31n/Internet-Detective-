import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PhotoEvidenceDefinition } from '@/case-engine';
import { resolveEvidenceImage } from '@/case-content/evidenceMediaRegistry';
import { useCueOnMount } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, radius, spacing, touch } from '@/design-system/theme/tokens';

import { PhotoReveal } from '../components/EvidenceReveal';
import { ZoomableSurface } from '../components/ZoomableSurface';
import { MissingMediaSurface } from './MissingMediaSurface';

export function PhotoEvidenceViewer({
  evidence,
  hapticsEnabled = true,
}: {
  evidence: PhotoEvidenceDefinition;
  hapticsEnabled?: boolean;
}) {
  useCueOnMount('investigation-camera-shutter');
  const source = resolveEvidenceImage(evidence.image);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  return (
    <View style={styles.root}>
      {source ? (
        <ZoomableSurface hapticsEnabled={hapticsEnabled} onZoomChange={setZoomed}>
          <PhotoReveal>
          <Image
            accessibilityLabel={evidence.image.altText}
            contentFit="contain"
            source={source}
            style={styles.image}
            transition={180}
          />
          {annotationsVisible
            ? evidence.annotations.map((annotation) => (
                <View
                  key={annotation.id}
                  pointerEvents="none"
                  style={[
                    styles.annotation,
                    {
                      left: `${annotation.xPercent}%`,
                      top: `${annotation.yPercent}%`,
                    },
                  ]}
                >
                  <View style={styles.annotationDot} />
                  <AppText
                    variant="mono"
                    color={palette.paper}
                    style={styles.annotationLabel}
                  >
                    {annotation.label}
                  </AppText>
                </View>
              ))
            : null}
          </PhotoReveal>
        </ZoomableSurface>
      ) : (
        <View style={styles.missing}>
          <MissingMediaSurface assetId={evidence.image.assetId} kind="image" />
        </View>
      )}

      {evidence.annotations.length > 0 && source ? (
        <TactilePressable
          accessibilityLabel={
            annotationsVisible ? 'Hide photo markings' : 'Show photo markings'
          }
          accessibilityRole="switch"
          accessibilityState={{ checked: annotationsVisible }}
          hapticsEnabled={hapticsEnabled}
          onPress={() => setAnnotationsVisible((visible) => !visible)}
          style={styles.markingsToggle}
        >
          <Ionicons
            color={annotationsVisible ? palette.brass : palette.paperMuted}
            name={annotationsVisible ? 'eye' : 'eye-off-outline'}
            size={19}
          />
          <AppText
            variant="mono"
            color={annotationsVisible ? palette.brass : palette.paperMuted}
          >
            MARKINGS
          </AppText>
        </TactilePressable>
      ) : null}

      <View style={styles.caption}>
        <AppText variant="bodySmall" color={palette.paper}>
          {evidence.caption}
        </AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {zoomed
            ? 'DRAG TO EXAMINE · DOUBLE TAP TO FIT'
            : 'PINCH TO ENLARGE · DOUBLE TAP TO INSPECT DETAIL'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
  },
  missing: {
    flex: 1,
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  annotation: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  annotationDot: {
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.brass,
    backgroundColor: palette.rust,
  },
  annotationLabel: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    backgroundColor: 'rgba(8,10,7,0.82)',
  },
  markingsToggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minHeight: touch.minTarget,
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(17,20,15,0.88)',
  },
  caption: {
    minHeight: 74,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
});
