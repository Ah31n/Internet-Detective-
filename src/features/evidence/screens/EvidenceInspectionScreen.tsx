import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVIDENCE_NOTE_MAX_LENGTH,
  type EvidenceConnectionKind,
  type EvidenceDefinition,
  type EvidenceId,
} from '@/case-engine';
import { getCaseDefinition } from '@/case-content/caseRegistry';
import { AppText } from '@/design-system/components/AppText';
import { BottomSheet } from '@/design-system/components/BottomSheet';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import {
  motion,
  palette,
  radius,
  spacing,
  touch,
} from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

import { EvidenceViewer } from '../viewers/EvidenceViewer';

const connectionKinds: readonly EvidenceConnectionKind[] = [
  'related',
  'supports',
  'contradicts',
  'sequence',
];

type OpenSheet = 'none' | 'note' | 'connections' | 'metadata';

/** Drag distance at which releasing the grab strip closes the inspector. */
const DISMISS_DISTANCE = 130;

export function EvidenceInspectionScreen() {
  const { evidenceId: routeEvidenceId } = useLocalSearchParams<{
    evidenceId: string;
  }>();
  const evidenceId = routeEvidenceId ?? '';
  const insets = useSafeAreaInsets();
  const activeCaseId = useCaseSessionStore((state) => state.activeCaseId);
  const definition = activeCaseId
    ? getCaseDefinition(activeCaseId)
    : undefined;
  const playerState = useCaseSessionStore((state) =>
    activeCaseId ? state.sessions[activeCaseId] : undefined,
  );
  const dispatchCaseAction = useCaseSessionStore(
    (state) => state.dispatchCaseAction,
  );
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const setOpenEvidence = useCaseSessionStore((state) => state.setOpenEvidence);
  const [sheet, setSheet] = useState<OpenSheet>('none');
  const [connectionKind, setConnectionKind] =
    useState<EvidenceConnectionKind>('related');

  const dragY = useSharedValue(0);

  const evidence = definition?.investigation.evidence.find(
    (item) => item.id === evidenceId,
  );
  const isDiscovered =
    playerState?.discoveredEvidenceIds.includes(evidenceId) ?? false;
  const isReferenced =
    playerState?.referencedEvidenceIds.includes(evidenceId) ?? false;
  const isUsedInTheory =
    playerState?.theoryEvidenceIds.includes(evidenceId) ?? false;
  const connections =
    playerState?.evidenceConnections.filter(
      (connection) =>
        connection.fromEvidenceId === evidenceId ||
        connection.toEvidenceId === evidenceId,
    ) ?? [];

  useEffect(() => {
    if (definition && evidence && isDiscovered) {
      dispatchCaseAction(definition, {
        type: 'VIEW_EVIDENCE',
        evidenceId: evidence.id,
      });
      // Persisted immediately so an interrupted viewing can be resumed.
      setOpenEvidence(definition.id, evidence.id);
    }
  }, [definition, dispatchCaseAction, evidence, isDiscovered, setOpenEvidence]);

  const close = () => {
    if (definition) setOpenEvidence(definition.id, null);
    if (router.canGoBack()) router.back();
    else router.replace('/investigation/evidence');
  };

  /**
   * Pull the file down by its header to put it back. The strip tracks the
   * finger one-to-one, resists upward travel, and either throws the screen
   * closed with its own velocity or springs the file back into place.
   */
  const dismissDrag = Gesture.Pan()
    .activeOffsetY([-18, 12])
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      dragY.value =
        event.translationY < 0 ? event.translationY / 4 : event.translationY;
    })
    .onEnd((event) => {
      const projected = dragY.value + event.velocityY * 0.1;
      if (projected > DISMISS_DISTANCE) {
        runOnJS(close)();
        return;
      }
      dragY.value = withSpring(0, {
        ...motion.spring,
        velocity: event.velocityY,
      });
    });

  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
    opacity: interpolate(
      dragY.value,
      [0, DISMISS_DISTANCE * 2],
      [1, 0.55],
      'clamp',
    ),
  }));

  if (!definition || !playerState || !evidence || !isDiscovered) {
    return (
      <Screen style={styles.unavailable}>
        <AppText variant="mono" color={palette.rust}>
          EVIDENCE UNAVAILABLE
        </AppText>
        <AppText variant="title">This object has not been discovered.</AppText>
        <TactilePressable
          accessibilityLabel="Return to investigation"
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={close}
          style={styles.returnButton}
        >
          <AppText variant="label" color={palette.brass}>
            RETURN TO INVESTIGATION
          </AppText>
        </TactilePressable>
      </Screen>
    );
  }

  const savedNote = playerState.evidenceNotes[evidence.id]?.text ?? '';

  const otherEvidence = definition.investigation.evidence.filter(
    (item) =>
      item.id !== evidence.id &&
      playerState.discoveredEvidenceIds.includes(item.id),
  );

  const toggleReference = () => {
    dispatchCaseAction(definition, {
      type: 'SET_EVIDENCE_REFERENCED',
      evidenceId: evidence.id,
      referenced: !isReferenced,
    });
  };

  const openLinkedEvidence = (linkedEvidenceId: EvidenceId) => {
    if (!playerState.discoveredEvidenceIds.includes(linkedEvidenceId)) return;
    router.push({
      pathname: '/evidence/[evidenceId]',
      params: { evidenceId: linkedEvidenceId },
    });
  };

  return (
    <Screen edges={['top', 'right', 'left']} style={styles.screen}>
      <Animated.View style={[styles.sheetBody, reduceMotion ? null : screenStyle]}>
        <GestureDetector gesture={dismissDrag}>
          <View>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <TactilePressable
                accessibilityLabel="Close evidence viewer"
                accessibilityRole="button"
                hapticsEnabled={hapticsEnabled}
                onPress={close}
                style={styles.headerButton}
              >
                <Ionicons color={palette.paper} name="chevron-down" size={26} />
              </TactilePressable>
              <View style={styles.headerCopy}>
                <AppText variant="label" color={palette.brass} numberOfLines={1}>
                  {evidence.type.toUpperCase()} EVIDENCE
                </AppText>
                <AppText
                  variant="mono"
                  color={palette.paperMuted}
                  numberOfLines={1}
                >
                  ID / {evidence.id}
                </AppText>
              </View>
              <TactilePressable
                accessibilityLabel={
                  isReferenced ? 'Remove evidence reference' : 'Reference evidence'
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isReferenced }}
                hapticsEnabled={hapticsEnabled}
                onPress={toggleReference}
                style={styles.headerButton}
              >
                <Ionicons
                  color={isReferenced ? palette.brass : palette.paperMuted}
                  name={isReferenced ? 'bookmark' : 'bookmark-outline'}
                  size={23}
                />
              </TactilePressable>
            </View>

            <TactilePressable
              accessibilityHint="Open the evidence metadata sheet"
              accessibilityLabel={`Details for ${evidence.title}`}
              accessibilityRole="button"
              hapticsEnabled={hapticsEnabled}
              onPress={() => setSheet('metadata')}
              pressedScale={0.995}
              style={styles.titleStrip}
            >
              <View style={styles.typeGlyph}>
                <Ionicons
                  color={palette.ink}
                  name={iconForEvidence(evidence)}
                  size={21}
                />
              </View>
              <View style={styles.titleCopy}>
                <AppText
                  variant="title"
                  numberOfLines={2}
                  style={styles.evidenceTitle}
                >
                  {evidence.title}
                </AppText>
                <AppText
                  variant="mono"
                  color={palette.paperMuted}
                  numberOfLines={1}
                >
                  SOURCE / {evidence.source}
                </AppText>
              </View>
              <Ionicons
                color={palette.paperMuted}
                name="information-circle-outline"
                size={22}
              />
            </TactilePressable>
          </View>
        </GestureDetector>

        <View style={styles.viewer}>
          <EvidenceViewer
            evidence={evidence}
            hapticsEnabled={hapticsEnabled}
            onOpenEvidence={openLinkedEvidence}
          />
        </View>

        <View
          style={[
            styles.actionRail,
            { paddingBottom: Math.max(insets.bottom, spacing.xs) },
          ]}
        >
          <RailButton
            accessibilityLabel={
              isReferenced ? 'Remove evidence reference' : 'Reference evidence'
            }
            active={isReferenced}
            hapticsEnabled={hapticsEnabled}
            icon={isReferenced ? 'bookmark' : 'bookmark-outline'}
            label="REFERENCE"
            onPress={toggleReference}
          />
          <RailButton
            accessibilityLabel="Manage evidence connections"
            active={connections.length > 0}
            badge={connections.length > 0 ? String(connections.length) : undefined}
            hapticsEnabled={hapticsEnabled}
            icon="git-compare-outline"
            label="CONNECT"
            onPress={() => setSheet('connections')}
          />
          <RailButton
            accessibilityLabel="Write an evidence note"
            active={savedNote.length > 0}
            hapticsEnabled={hapticsEnabled}
            icon={savedNote ? 'create' : 'create-outline'}
            label="NOTE"
            onPress={() => setSheet('note')}
          />
          <RailButton
            accessibilityLabel="Show evidence metadata"
            active={isUsedInTheory}
            hapticsEnabled={hapticsEnabled}
            icon="information-circle-outline"
            label="DETAILS"
            onPress={() => setSheet('metadata')}
          />
        </View>
      </Animated.View>

      {sheet === 'note' ? (
        <EvidenceNoteSheet
          hapticsEnabled={hapticsEnabled}
          initialText={savedNote}
          onClose={() => setSheet('none')}
          onSave={(text) => {
            dispatchCaseAction(definition, {
              type: 'SET_EVIDENCE_NOTE',
              evidenceId: evidence.id,
              text,
            });
          }}
          title={evidence.title}
        />
      ) : null}

      {sheet === 'metadata' ? (
        <EvidenceMetadataSheet
          connectionCount={connections.length}
          evidence={evidence}
          hapticsEnabled={hapticsEnabled}
          noteLength={savedNote.trim().length}
          onClose={() => setSheet('none')}
          referenced={isReferenced}
          usedInTheory={isUsedInTheory}
        />
      ) : null}

      {sheet === 'connections' ? (
        <ConnectionSheet
          currentEvidence={evidence}
          discoveredEvidence={otherEvidence}
          hapticsEnabled={hapticsEnabled}
          kind={connectionKind}
          onClose={() => setSheet('none')}
          onConnect={(targetEvidenceId) => {
            const result = dispatchCaseAction(definition, {
              type: 'CONNECT_EVIDENCE',
              fromEvidenceId: evidence.id,
              toEvidenceId: targetEvidenceId,
              kind: connectionKind,
            });
            if (result.ok) setSheet('none');
          }}
          onDisconnect={(connectionId) =>
            dispatchCaseAction(definition, {
              type: 'DISCONNECT_EVIDENCE',
              connectionId,
            })
          }
          onKindChange={setConnectionKind}
          connections={connections.map((connection) => ({
            ...connection,
            otherTitle:
              definition.investigation.evidence.find(
                (item) =>
                  item.id ===
                  (connection.fromEvidenceId === evidence.id
                    ? connection.toEvidenceId
                    : connection.fromEvidenceId),
              )?.title ?? 'Unknown evidence',
          }))}
        />
      ) : null}
    </Screen>
  );
}

function RailButton({
  accessibilityLabel,
  active,
  badge,
  hapticsEnabled,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  active: boolean;
  badge?: string;
  hapticsEnabled: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TactilePressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hapticsEnabled={hapticsEnabled}
      onPress={onPress}
      style={styles.railButton}
    >
      <Ionicons
        color={active ? palette.brass : palette.paperMuted}
        name={icon}
        size={20}
      />
      <AppText variant="mono" color={active ? palette.brass : palette.paperMuted}>
        {badge ? `${label} ${badge}` : label}
      </AppText>
    </TactilePressable>
  );
}

function EvidenceNoteSheet({
  title,
  initialText,
  hapticsEnabled,
  onSave,
  onClose,
}: {
  title: string;
  initialText: string;
  hapticsEnabled: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave the note while typing, then once more on close.
  useEffect(() => {
    if (text === initialText) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(text), 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [initialText, onSave, text]);

  return (
    <BottomSheet
      detents={[0.52, 0.94]}
      eyebrow="CASE NOTE"
      hapticsEnabled={hapticsEnabled}
      onClose={() => {
        onSave(text);
        onClose();
      }}
      title={`On ${title}`}
      footer={
        <View style={styles.noteFooter}>
          <AppText variant="mono" color={palette.paperMuted}>
            {text.trim().length}/{EVIDENCE_NOTE_MAX_LENGTH} · SAVED LOCALLY
          </AppText>
          <TactilePressable
            accessibilityLabel="Save note"
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => onSave(text)}
            style={styles.noteSave}
          >
            <AppText variant="label" color={palette.black}>
              SAVE NOTE
            </AppText>
          </TactilePressable>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.sheetScroll}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          accessibilityLabel="Evidence note"
          maxLength={EVIDENCE_NOTE_MAX_LENGTH}
          multiline
          onChangeText={setText}
          placeholder="What does this artifact prove, contradict, or leave open?"
          placeholderTextColor={palette.paperMuted}
          style={styles.noteInput}
          textAlignVertical="top"
          value={text}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function EvidenceMetadataSheet({
  connectionCount,
  evidence,
  hapticsEnabled,
  noteLength,
  onClose,
  referenced,
  usedInTheory,
}: {
  connectionCount: number;
  evidence: EvidenceDefinition;
  hapticsEnabled: boolean;
  noteLength: number;
  onClose: () => void;
  referenced: boolean;
  usedInTheory: boolean;
}) {
  const rows: readonly { label: string; value: string }[] = [
    { label: 'EVIDENCE ID', value: evidence.id },
    { label: 'TYPE', value: evidence.type.toUpperCase() },
    { label: 'SOURCE', value: evidence.source },
    { label: 'CAPTURED', value: evidence.capturedAtLabel ?? 'NOT RECORDED' },
    { label: 'STRINGS', value: String(connectionCount).padStart(2, '0') },
    { label: 'NOTE', value: noteLength > 0 ? `${noteLength} CHARACTERS` : 'NONE' },
    { label: 'REFERENCED', value: referenced ? 'YES' : 'NO' },
    { label: 'IN THEORY', value: usedInTheory ? 'YES' : 'NO' },
  ];

  return (
    <BottomSheet
      detents={[0.5, 0.86]}
      eyebrow="EVIDENCE METADATA"
      hapticsEnabled={hapticsEnabled}
      onClose={onClose}
      title={evidence.title}
    >
      <ScrollView contentContainerStyle={styles.sheetScroll}>
        <AppText variant="bodySmall" color={palette.paper}>
          {evidence.summary}
        </AppText>
        <View style={styles.metaTable}>
          {rows.map((row) => (
            <View key={row.label} style={styles.metaRow}>
              <AppText variant="mono" color={palette.paperMuted}>
                {row.label}
              </AppText>
              <AppText
                variant="mono"
                color={palette.paper}
                numberOfLines={1}
                style={styles.metaValue}
              >
                {row.value}
              </AppText>
            </View>
          ))}
        </View>
        {evidence.tags?.length ? (
          <View style={styles.tagRow}>
            {evidence.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <AppText variant="mono" color={palette.brass}>
                  {tag.toUpperCase()}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function ConnectionSheet({
  currentEvidence,
  discoveredEvidence,
  connections,
  kind,
  hapticsEnabled,
  onKindChange,
  onConnect,
  onDisconnect,
  onClose,
}: {
  currentEvidence: EvidenceDefinition;
  discoveredEvidence: readonly EvidenceDefinition[];
  connections: readonly {
    id: string;
    kind: EvidenceConnectionKind;
    otherTitle: string;
  }[];
  kind: EvidenceConnectionKind;
  hapticsEnabled: boolean;
  onKindChange: (kind: EvidenceConnectionKind) => void;
  onConnect: (evidenceId: EvidenceId) => void;
  onDisconnect: (connectionId: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      detents={[0.62, 0.94]}
      eyebrow="EVIDENCE CONNECTIONS"
      hapticsEnabled={hapticsEnabled}
      onClose={onClose}
      title={`From ${currentEvidence.title}`}
    >
      <View style={styles.kindRow}>
        {connectionKinds.map((item) => (
          <TactilePressable
            key={item}
            accessibilityLabel={`Link type: ${item}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: kind === item }}
            hapticsEnabled={hapticsEnabled}
            onPress={() => onKindChange(item)}
            style={[styles.kindChoice, kind === item && styles.kindChoiceActive]}
          >
            <AppText
              variant="mono"
              color={kind === item ? palette.ink : palette.paperMuted}
            >
              {item.toUpperCase()}
            </AppText>
          </TactilePressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.connectionListContent}
        style={styles.connectionList}
      >
        {connections.map((connection) => (
          <View key={connection.id} style={styles.connectionRow}>
            <View style={styles.connectionCopy}>
              <AppText variant="bodySmall">{connection.otherTitle}</AppText>
              <AppText variant="mono" color={palette.moss}>
                {connection.kind.toUpperCase()}
              </AppText>
            </View>
            <TactilePressable
              accessibilityLabel={`Remove connection to ${connection.otherTitle}`}
              accessibilityRole="button"
              hapticsEnabled={hapticsEnabled}
              onPress={() => onDisconnect(connection.id)}
              style={styles.rowAction}
            >
              <Ionicons color={palette.rust} name="remove-circle-outline" size={22} />
            </TactilePressable>
          </View>
        ))}

        {discoveredEvidence.map((item) => (
          <TactilePressable
            key={item.id}
            accessibilityLabel={`Connect to ${item.title}`}
            accessibilityRole="button"
            hapticsEnabled={hapticsEnabled}
            onPress={() => onConnect(item.id)}
            pressedScale={0.99}
            style={styles.connectionRow}
          >
            <View style={styles.connectionCopy}>
              <AppText variant="bodySmall">{item.title}</AppText>
              <AppText variant="mono" color={palette.paperMuted}>
                {item.type.toUpperCase()} · {item.id}
              </AppText>
            </View>
            <View style={styles.rowAction}>
              <Ionicons color={palette.brass} name="add-circle-outline" size={22} />
            </View>
          </TactilePressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

function iconForEvidence(
  evidence: EvidenceDefinition,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (evidence.type) {
    case 'photo':
      return 'image-outline';
    case 'document':
      return 'document-text-outline';
    case 'receipt':
      return 'receipt-outline';
    case 'message':
      return 'chatbubble-ellipses-outline';
    case 'email':
      return 'mail-outline';
    case 'cctv':
      return 'videocam-outline';
    case 'webpage':
      return 'globe-outline';
    case 'statement':
      return 'mic-outline';
  }
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.ink,
  },
  sheetBody: {
    flex: 1,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: spacing.xxs,
    borderRadius: 2,
    backgroundColor: palette.line,
  },
  unavailable: {
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  returnButton: {
    minHeight: 52,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  headerButton: {
    width: 56,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  titleStrip: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.inkSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  typeGlyph: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.brass,
  },
  titleCopy: {
    flex: 1,
  },
  evidenceTitle: {
    fontSize: 20,
    lineHeight: 25,
  },
  viewer: {
    flex: 1,
  },
  actionRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.inkSoft,
  },
  railButton: {
    flex: 1,
    minHeight: touch.comfortableTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  sheetScroll: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  noteInput: {
    minHeight: 160,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    borderRadius: radius.sm,
    color: palette.paper,
    backgroundColor: palette.charcoalRaised,
    fontSize: 15,
    lineHeight: 21,
  },
  noteFooter: {
    minHeight: touch.comfortableTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noteSave: {
    minHeight: touch.minTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: palette.brass,
  },
  metaTable: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  metaRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  metaValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.brass,
    borderRadius: radius.sm,
  },
  kindRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  kindChoice: {
    flex: 1,
    minHeight: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    borderRadius: radius.sm,
  },
  kindChoiceActive: {
    backgroundColor: palette.brass,
    borderColor: palette.brass,
  },
  connectionList: {
    flex: 1,
    marginTop: spacing.sm,
  },
  connectionListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  connectionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  connectionCopy: {
    flex: 1,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowAction: {
    width: touch.minTarget,
    height: touch.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
