import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { selectionFeedback } from '@/core/feedback/haptics';
import { palette, touch, typography } from '@/design-system/theme/tokens';
import { useAppStore } from '@/state/app.store';

export default function InvestigationTabsLayout() {
  const reduceMotion = useAppStore((state) => state.settings.reduceMotion);
  const hapticsEnabled = useAppStore(
    (state) => state.settings.hapticsEnabled,
  );

  return (
    <Tabs
      backBehavior="history"
      screenListeners={{
        tabPress: () => selectionFeedback(hapticsEnabled),
      }}
      screenOptions={{

        headerShown: false,
        animation: reduceMotion ? 'none' : 'fade',
        sceneStyle: { backgroundColor: palette.ink },
        tabBarActiveTintColor: palette.brass,
        tabBarInactiveTintColor: palette.paperMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.inkSoft,
          borderTopColor: palette.line,
          borderTopWidth: 1,
        },
        tabBarItemStyle: {
          minHeight: touch.comfortableTarget,
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontFamily: typography.family.sans,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.6,
        },
        // The tab bar grows with the label instead of clipping it.
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'CASE',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="scan-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="evidence"
        options={{
          title: 'EVIDENCE',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="layers-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'LEADS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="git-network-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'NOTES',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="create-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="internet"
        options={{
          title: 'CASE NET',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="globe-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
