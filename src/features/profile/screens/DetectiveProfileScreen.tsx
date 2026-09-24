import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAmbientBed } from '@/core/audio/useGameAudio';
import { formatFilingDate } from '@/core/progression/profileStatistics';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useRememberRoute } from '@/navigation/useRememberRoute';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';
import { getCaseDefinition } from '@/case-content/caseRegistry';

import { ShellHeader } from '../../shell/components/ShellHeader';
import { LedgerLine } from '../components/LedgerLine';
import { RankStamp } from '../components/RankStamp';
import { RecordSection } from '../components/RecordSection';
import { useDetectiveRecord } from '../useDetectiveRecord';

/**
 * THE DETECTIVE RECORD
 *
 * A personnel file, typeset. Rules, numerals, small caps, a stamped rank, and
 * a ledger of figures — the same page a department would keep on an
 * investigator.
 *
 * Explicitly *not* a dashboard: no tiles, no charts, no progress rings, no
 * percentages of completion, no streaks. The player is a detective, and this
 * is their record of work, not a quarterly review.
 */
export function DetectiveProfileScreen() {
  useAmbientBed('ambient-hotel-room');
  useRememberRoute('/profile');
  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const record = useDetectiveRecord();
  const activateCase = useCaseSessionStore((state) => state.activateCase);

  // Returning to an open investigation makes it the active one first, so the
  // brief the player lands on is the case they tapped.
  const resume = (caseId: string) => {
    const definition = getCaseDefinition(caseId);
    if (definition) activateCase(definition);
    router.push('/case-brief');
  };

  return (
    <Screen>
      <ShellHeader eyebrow="PERSONNEL" title="Detective record" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <View style={styles.mastheadRule} />
          <AppText accessibilityRole="header" variant="display" style={styles.mastheadTitle}>
            THE DETECTIVE{'\n'}RECORD
          </AppText>
          <View style={styles.mastheadFoot}>
            <AppText variant="mono" color={palette.paperMuted}>
              INTERNET DETECTIVE · FIELD SERVICE
            </AppText>
            <AppText variant="mono" color={palette.rust}>
              CONFIDENTIAL
            </AppText>
          </View>
          <View style={styles.mastheadRule} />
        </View>

        <RankStamp level={record.level} />

        <RecordSection
          aside={`${String(record.closedCases.length).padStart(2, '0')} FILED`}
          numeral="I"
          title="CASES CLOSED"
        >
          {record.closedCases.length === 0 ? (
            <AppText variant="body" color={palette.paperMuted} style={styles.empty}>
              No case has been closed. The record begins with the first verdict
              you are willing to sign.
            </AppText>
          ) : (
            record.closedCases.map((closed) => (
              <View key={closed.caseId} style={styles.entryRow}>
                <AppText variant="mono" color={palette.rustText}>
                  {closed.number}
                </AppText>
                <View style={styles.entryCopy}>
                  <AppText variant="bodySmall" color={palette.paper}>
                    {closed.title}
                  </AppText>
                  <AppText variant="mono" color={palette.paperMuted}>
                    CLOSED {formatFilingDate(closed.closedAtEpochMs)}
                  </AppText>
                </View>
                <AppText variant="mono" color={palette.brass}>
                  {closed.score === null ? '—' : `${closed.score}/100`}
                </AppText>
              </View>
            ))
          )}
        </RecordSection>

        <RecordSection
          aside={`${String(record.activeInvestigations.length).padStart(2, '0')} OPEN`}
          numeral="II"
          title="ACTIVE INVESTIGATIONS"
        >
          {record.activeInvestigations.length === 0 ? (
            <AppText variant="body" color={palette.paperMuted} style={styles.empty}>
              Nothing open on your desk.
            </AppText>
          ) : (
            record.activeInvestigations.map((investigation) => (
              <TactilePressable
                accessibilityHint="Return to this investigation"
                accessibilityLabel={`Open investigation ${investigation.number}, ${investigation.title}. ${investigation.progressLine}`}
                accessibilityRole="button"
                hapticsEnabled={hapticsEnabled}
                key={investigation.caseId}
                onPress={() => resume(investigation.caseId)}
                pressedScale={0.99}
                style={styles.openRow}
              >
                <View style={styles.openMark} />
                <View style={styles.entryCopy}>
                  <AppText variant="bodySmall" color={palette.paper}>
                    {investigation.number} · {investigation.title}
                  </AppText>
                  <AppText variant="mono" color={palette.paperMuted}>
                    {investigation.progressLine.toUpperCase()}
                  </AppText>
                </View>
                <Ionicons color={palette.paperMuted} name="chevron-forward" size={17} />
              </TactilePressable>
            ))
          )}
        </RecordSection>

        <RecordSection
          aside={`${record.awardedCount} OF ${record.commendations.length}`}
          numeral="III"
          title="COMMENDATIONS"
        >
          {record.commendations.map((commendation) => {
            const awarded = commendation.awardedAtEpochMs !== null;
            return (
              <View
                accessibilityLabel={`${commendation.definition.title}. ${
                  awarded ? 'Awarded.' : 'Not yet awarded.'
                } ${commendation.definition.description}`}
                accessibilityRole="text"
                key={commendation.definition.id}
                style={styles.commendation}
              >
                <Ionicons
                  color={awarded ? palette.brass : palette.line}
                  name={awarded ? 'ribbon' : 'ribbon-outline'}
                  size={18}
                />
                <View style={styles.entryCopy}>
                  <AppText
                    variant="bodySmall"
                    color={awarded ? palette.paper : palette.paperMuted}
                  >
                    {commendation.definition.title}
                  </AppText>
                  <AppText variant="mono" color={palette.paperMuted}>
                    {commendation.definition.description.toUpperCase()}
                  </AppText>
                </View>
                <AppText
                  variant="mono"
                  color={awarded ? palette.mossText : palette.line}
                >
                  {awarded ? formatFilingDate(commendation.awardedAtEpochMs) : 'PENDING'}
                </AppText>
              </View>
            );
          })}
        </RecordSection>

        <RecordSection numeral="IV" title="THE LEDGER">
          {record.figures.map((figure) => (
            <LedgerLine figure={figure} key={figure.id} />
          ))}
        </RecordSection>

        <View style={styles.colophon}>
          <View style={styles.mastheadRule} />
          <AppText variant="mono" color={palette.paperMuted} style={styles.colophonText}>
            THIS RECORD IS HELD ON THIS DEVICE ONLY
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  masthead: {
    paddingTop: spacing.md,
  },
  mastheadRule: {
    height: 1,
    backgroundColor: palette.lineStrong,
  },
  mastheadTitle: {
    paddingVertical: spacing.sm,
    letterSpacing: 1,
  },
  mastheadFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  entryRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  openRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  openMark: {
    width: 3,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: palette.brass,
  },
  commendation: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.sm,
    maxWidth: 380,
  },
  colophon: {
    marginTop: spacing.xxl,
  },
  colophonText: {
    paddingTop: spacing.xs,
    textAlign: 'center',
  },
});
