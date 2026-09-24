import Ionicons from '@expo/vector-icons/Ionicons';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';

import type { CCTVEvidenceDefinition } from '@/case-engine';
import {
  resolveEvidenceImage,
  resolveEvidenceVideo,
} from '@/case-content/evidenceMediaRegistry';
import { useAmbientBed, useCueOnMount } from '@/core/audio/useGameAudio';
import { AppText } from '@/design-system/components/AppText';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';

import { SurveillanceActivate } from '../components/EvidenceReveal';
import { ZoomableSurface } from '../components/ZoomableSurface';
import { EvidenceTextBlocks } from './EvidenceTextBlocks';
import { MissingMediaSurface } from './MissingMediaSurface';

export function CCTVEvidenceViewer({
  evidence,
  hapticsEnabled,
}: {
  evidence: CCTVEvidenceDefinition;
  hapticsEnabled: boolean;
}) {
  useAmbientBed('ambient-surveillance-room');
  useCueOnMount('investigation-cctv-activate');
  const source = resolveEvidenceVideo(evidence.video);
  const posterSource = evidence.poster
    ? resolveEvidenceImage(evidence.poster)
    : null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.monitorHeader}>
        <View style={styles.recordingDot} />
        <AppText variant="mono" color={palette.paper} style={styles.cameraLabel}>
          {evidence.cameraLabel}
        </AppText>
        <AppText variant="mono" color={palette.paperMuted}>
          {evidence.recordedAtLabel}
        </AppText>
      </View>

      <SurveillanceActivate style={styles.monitor}>
        <View style={styles.scanline} />
        {source ? (
          <CCTVPlayback hapticsEnabled={hapticsEnabled} source={source} />
        ) : posterSource && evidence.poster ? (
          <View style={styles.posterFallback}>
            <ZoomableSurface hapticsEnabled={hapticsEnabled}>
              <Image
                accessibilityLabel={evidence.poster.altText}
                contentFit="cover"
                source={posterSource}
                style={styles.video}
              />
            </ZoomableSurface>
            <View pointerEvents="none" style={styles.posterLabel}>
              <AppText variant="mono" color={palette.paper}>
                ARCHIVED STILL · PINCH TO ENLARGE
              </AppText>
            </View>
          </View>
        ) : (
          <MissingMediaSurface assetId={evidence.video.assetId} kind="video" />
        )}
      </SurveillanceActivate>

      <View style={styles.controls}>
        <View style={[styles.playButton, !source && styles.playButtonIdle]}>
          <Ionicons
            color={source ? palette.ink : palette.line}
            name="play"
            size={23}
          />
        </View>
        <View style={styles.timeline}>
          <View style={styles.timelineTrack} />
          {evidence.markers.map((marker) => (
            <View
              key={marker.id}
              style={[
                styles.marker,
                { left: `${(marker.offsetSeconds / evidence.durationSeconds) * 100}%` },
              ]}
            >
              <View style={styles.markerHit} />
            <View style={styles.markerTick} />
              <AppText variant="mono" color={palette.brass} style={styles.markerLabel}>
                {marker.label}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="mono" color={palette.paperMuted}>
          {formatDuration(evidence.durationSeconds)}
        </AppText>
      </View>

      {evidence.transcript?.length ? (
        <View style={styles.transcript}>
          <AppText variant="label" color={palette.rust}>
            AUDIO TRANSCRIPT
          </AppText>
          <EvidenceTextBlocks
            blocks={evidence.transcript}
            ink={palette.paper}
            muted={palette.paperMuted}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

/**
 * PHASE 16 — the video player exists only when there is a video.
 *
 * `useVideoPlayer` was called unconditionally, so every CCTV record created a
 * native player instance even though Case 001 ships no MP4s at all: four
 * players allocated to display four still frames. Moving the hook into a child
 * that is mounted only for a real source means no decoder is created unless a
 * clip is actually going to be shown, and only ever one at a time — the
 * inspection screen presents a single record.
 *
 * It also pauses whenever the screen loses focus or the app leaves the
 * foreground, so a clip cannot keep a decoder and an audio session alive
 * behind another screen.
 */
function CCTVPlayback({
  hapticsEnabled,
  source,
}: {
  hapticsEnabled: boolean;
  source: VideoSource;
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });
  const [visible, setVisible] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      return () => {
        setVisible(false);
        player.pause();
      };
    }, [player]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') player.pause();
    });
    return () => subscription.remove();
  }, [player]);

  if (!visible) return <View style={styles.video} />;

  return (
    <>
      <VideoView
        contentFit="contain"
        nativeControls={false}
        player={player}
        style={styles.video}
        surfaceType="textureView"
      />
      <View style={styles.playbackControl}>
        <TactilePressable
          accessibilityLabel={isPlaying ? 'Pause CCTV clip' : 'Play CCTV clip'}
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={() => (isPlaying ? player.pause() : player.play())}
          style={styles.playButton}
        >
          <Ionicons color={palette.ink} name={isPlaying ? 'pause' : 'play'} size={23} />
        </TactilePressable>
      </View>
    </>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  monitorHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: palette.black,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.rust,
    marginRight: spacing.xs,
  },
  cameraLabel: {
    flex: 1,
  },
  monitor: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: palette.black,
  },
  video: {
    flex: 1,
  },
  playbackControl: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },
  playButtonIdle: {
    opacity: 0.5,
  },
  posterFallback: {
    flex: 1,
  },
  posterLabel: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(8,10,7,0.82)',
    borderLeftWidth: 2,
    borderLeftColor: palette.rust,
  },
  scanline: {
    position: 'absolute',
    zIndex: 2,
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.moss,
    opacity: 0.25,
  },
  controls: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: palette.inkSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
  },
  timeline: {
    flex: 1,
    height: 46,
    marginHorizontal: spacing.md,
    justifyContent: 'center',
  },
  timelineTrack: {
    height: 2,
    backgroundColor: palette.line,
  },
  marker: {
    position: 'absolute',
    top: 8,
    alignItems: 'center',
  },
  markerTick: {
    width: 2,
    height: 16,
    backgroundColor: palette.rust,
  },
  markerHit: {
    position: 'absolute',
    top: -14,
    left: -21,
    width: 44,
    height: 44,
  },
  markerLabel: {
    position: 'absolute',
    top: 26,
    width: 90,
    textAlign: 'center',
  },
  transcript: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
