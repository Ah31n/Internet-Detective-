import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getCaseDefinition } from '@/case-content/caseRegistry';
import { useEntitlementSnapshot } from '@/core/commerce';
import {
  loadCanonicalReveal,
  loadDependencyGraph,
} from '@/core/dev/canonicalReveal';
import { DEV_BUILD_LABEL, DEV_TOOLS_ENABLED } from '@/core/dev/devMode';
import {
  inspectCaseState,
  inspectConnectionState,
  inspectEntitlementState,
  inspectEvidenceIds,
  inspectPlayerState,
  inspectTheoryState,
  inspectTimelineState,
  type InspectorSection,
} from '@/core/dev/qaInspectors';
import {
  QA_CATEGORY_LABELS,
  QA_TOOLS,
  type QAToolCategory,
} from '@/core/dev/qaTools';
import { AppText } from '@/design-system/components/AppText';
import { Screen } from '@/design-system/components/Screen';
import { TactilePressable } from '@/design-system/components/TactilePressable';
import { palette, spacing } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';
import { useCaseSessionStore } from '@/state/case-session.store';

/**
 * THE QA CONSOLE
 *
 * A developer instrument, and it looks like one on purpose: monospace, dense,
 * high contrast, no editorial styling. Nobody should be able to mistake a
 * screenshot of this for the game.
 *
 * It is never reachable in production. The route that renders it returns a
 * dead end when `DEV_TOOLS_ENABLED` is false, the entry gesture is inert, and
 * the tools and the canonical solution they read are eliminated from the
 * bundle entirely.
 */

const CASE_ID = 'case-001-missing-diamond';

type Tab = 'tools' | 'inspect' | 'truth';

export function QAConsoleScreen() {
  const [tab, setTab] = useState<Tab>('tools');
  const [log, setLog] = useState<readonly string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [truthVisible, setTruthVisible] = useState(false);

  const hapticsEnabled = useAppStore((state) => state.settings.hapticsEnabled);
  const session = useCaseSessionStore((state) => state.sessions[CASE_ID] ?? null);
  const entitlements = useEntitlementSnapshot();

  const definition = getCaseDefinition(CASE_ID);

  const sections: readonly InspectorSection[] = useMemo(() => {
    if (!definition) return [];
    return [
      inspectCaseState(definition, session),
      inspectPlayerState(definition, session),
      inspectEntitlementState(entitlements),
      inspectConnectionState(session),
      inspectTheoryState(session),
      inspectTimelineState(definition, session),
      inspectEvidenceIds(definition, session),
    ];
  }, [definition, entitlements, session]);

  const dependencies = useMemo(
    () => loadDependencyGraph(CASE_ID, session?.discoveredEvidenceIds ?? []) ?? [],
    [session?.discoveredEvidenceIds],
  );

  const reveal = useMemo(
    () => (truthVisible ? loadCanonicalReveal(CASE_ID) : null),
    [truthVisible],
  );

  // Belt and braces. The route already refuses to mount this in production.
  if (!DEV_TOOLS_ENABLED) return null;

  const append = (line: string) =>
    setLog((current) => [`${timestamp()} ${line}`, ...current].slice(0, 40));

  const invoke = (toolId: string) => {
    const tool = QA_TOOLS.find((candidate) => candidate.id === toolId);
    if (!tool) return;
    if (tool.destructive && confirming !== tool.id) {
      setConfirming(tool.id);
      return;
    }
    setConfirming(null);
    const result = tool.run();
    append(`${result.ok ? 'OK  ' : 'FAIL'} ${tool.label} — ${result.message}`);
  };

  const categories: readonly QAToolCategory[] = [
    'case',
    'evidence',
    'board',
    'account',
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="mono" color={palette.rustText}>
            QA CONSOLE · {DEV_BUILD_LABEL}
          </AppText>
          <AppText variant="mono" color={palette.paperMuted}>
            NOT PRESENT IN RELEASE BUILDS
          </AppText>
        </View>
        <TactilePressable
          accessibilityLabel="Close the QA console"
          accessibilityRole="button"
          hapticsEnabled={hapticsEnabled}
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons color={palette.paper} name="close" size={22} />
        </TactilePressable>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ['tools', 'TOOLS'],
            ['inspect', 'INSPECT'],
            ['truth', 'TRUTH'],
          ] as const
        ).map(([id, label]) => (
          <TactilePressable
            accessibilityLabel={`${label} tab`}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            hapticsEnabled={hapticsEnabled}
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabActive]}
          >
            <AppText
              variant="mono"
              color={tab === id ? palette.ink : palette.paperMuted}
            >
              {label}
            </AppText>
          </TactilePressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'tools' ? (
          <>
            {categories.map((category) => (
              <View key={category} style={styles.group}>
                <AppText variant="mono" color={palette.brass}>
                  {QA_CATEGORY_LABELS[category]}
                </AppText>
                {QA_TOOLS.filter((tool) => tool.category === category).map((tool) => (
                  <TactilePressable
                    accessibilityHint={tool.description}
                    accessibilityLabel={
                      confirming === tool.id
                        ? `Confirm ${tool.label.toLowerCase()}`
                        : tool.label
                    }
                    accessibilityRole="button"
                    hapticsEnabled={hapticsEnabled}
                    key={tool.id}
                    onPress={() => invoke(tool.id)}
                    style={[
                      styles.tool,
                      confirming === tool.id && styles.toolConfirming,
                    ]}
                  >
                    <View style={styles.toolCopy}>
                      <AppText
                        variant="mono"
                        color={
                          confirming === tool.id ? palette.rustText : palette.paper
                        }
                      >
                        {confirming === tool.id
                          ? `CONFIRM · ${tool.label}`
                          : tool.label}
                      </AppText>
                      <AppText variant="bodySmall" color={palette.paperMuted}>
                        {tool.description}
                      </AppText>
                    </View>
                    {tool.destructive ? (
                      <Ionicons
                        color={palette.rustText}
                        name="warning-outline"
                        size={16}
                      />
                    ) : null}
                  </TactilePressable>
                ))}
              </View>
            ))}

            <View style={styles.group}>
              <AppText variant="mono" color={palette.brass}>
                LOG
              </AppText>
              {log.length === 0 ? (
                <AppText variant="mono" color={palette.line}>
                  NO ACTIONS RUN
                </AppText>
              ) : (
                log.map((line, index) => (
                  <AppText
                    color={line.includes('FAIL') ? palette.rustText : palette.mossText}
                    key={`${line}-${index}`}
                    variant="mono"
                  >
                    {line}
                  </AppText>
                ))
              )}
            </View>
          </>
        ) : tab === 'inspect' ? (
          <>
            {sections.map((section) => (
              <View key={section.id} style={styles.group}>
                <AppText variant="mono" color={palette.brass}>
                  {section.title}
                </AppText>
                {section.rows.length === 0 ? (
                  <AppText variant="mono" color={palette.line}>
                    {section.empty ?? 'EMPTY'}
                  </AppText>
                ) : (
                  section.rows.map((row, index) => (
                    <View key={`${section.id}-${row.label}-${index}`} style={styles.row}>
                      <AppText variant="mono" color={palette.paperMuted} style={styles.rowLabel}>
                        {row.label}
                      </AppText>
                      <View style={styles.rowValue}>
                        <AppText variant="mono" color={palette.paper}>
                          {row.value}
                        </AppText>
                        {row.detail ? (
                          <AppText variant="mono" color={palette.line}>
                            {row.detail}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            ))}

            <View style={styles.group}>
              <AppText variant="mono" color={palette.brass}>
                EVIDENCE DEPENDENCIES · {dependencies.length} STAGES
              </AppText>
              {dependencies.map((stage) => (
                <View key={stage.id} style={styles.stage}>
                  <AppText
                    variant="mono"
                    color={
                      stage.held === stage.requiredEvidenceIds.length
                        ? palette.mossText
                        : palette.paper
                    }
                  >
                    {stage.id} · {stage.held}/{stage.requiredEvidenceIds.length}
                  </AppText>
                  <AppText variant="bodySmall" color={palette.paperMuted}>
                    {stage.purpose}
                  </AppText>
                  <AppText variant="mono" color={palette.line}>
                    NEEDS {stage.requiredEvidenceIds.join(', ')}
                  </AppText>
                  <AppText variant="mono" color={palette.line}>
                    UNLOCKS {stage.unlocks.join(', ')}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.group}>
            <View style={styles.spoilerWarning}>
              <Ionicons color={palette.rustText} name="eye-off-outline" size={18} />
              <AppText variant="bodySmall" color={palette.paper} style={styles.warningCopy}>
                The canonical solution to Case 001. This text is loaded from the
                sealed authoring record and exists only in development builds.
              </AppText>
            </View>

            {truthVisible ? null : (
              <TactilePressable
                accessibilityLabel="Reveal canonical solution"
                accessibilityRole="button"
                hapticsEnabled={hapticsEnabled}
                onPress={() => setTruthVisible(true)}
                style={styles.revealButton}
              >
                <AppText variant="mono" color={palette.rustText}>
                  REVEAL CANONICAL SOLUTION
                </AppText>
              </TactilePressable>
            )}

            {reveal?.sections.map((section) => (
              <View key={section.id} style={styles.stage}>
                <AppText variant="mono" color={palette.brass}>
                  {section.heading}
                </AppText>
                {section.lines.map((line, index) => (
                  <AppText
                    color={palette.paper}
                    key={`${section.id}-${index}`}
                    variant="bodySmall"
                  >
                    {line}
                  </AppText>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function timestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: palette.rust,
  },
  headerCopy: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: palette.brass,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  group: {
    marginBottom: spacing.lg,
    gap: spacing.xxs,
  },
  tool: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  toolConfirming: {
    backgroundColor: palette.inkSoft,
  },
  toolCopy: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stage: {
    paddingVertical: spacing.xs,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  spoilerWarning: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.rust,
    backgroundColor: palette.inkSoft,
  },
  warningCopy: {
    flex: 1,
  },
  revealButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.rust,
  },
});
