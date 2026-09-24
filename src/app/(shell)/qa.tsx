import { Redirect } from 'expo-router';

import { DEV_TOOLS_ENABLED } from '@/core/dev/devMode';

/**
 * The QA console route.
 *
 * In a release build `DEV_TOOLS_ENABLED` is the literal `false`, so this file
 * redirects and the `require` below is dead code: the console, the tool
 * registry, the inspectors, and the sealed solution they read are never pulled
 * into the bundle. A deep link to `/qa` on a shipped build lands the player on
 * the desk, not on a blank screen.
 */
export default function QARoute() {
  if (!DEV_TOOLS_ENABLED) return <Redirect href="/investigation-home" />;

  const { QAConsoleScreen } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/features/qa/screens/QAConsoleScreen') as typeof import('@/features/qa/screens/QAConsoleScreen');

  return <QAConsoleScreen />;
}
