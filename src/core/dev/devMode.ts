/**
 * THE DEVELOPER-MODE GATE
 *
 * One constant decides whether the QA system exists at all. Everything else in
 * `src/core/dev` and `src/features/qa` is reached only through it.
 *
 * The rule, stated precisely:
 *
 *   An environment variable can only ever TURN THESE TOOLS OFF.
 *   Nothing can turn them on in a release build.
 *
 * `__DEV__` is substituted by Metro as a literal `false` in any production
 * bundle, so `DEV_TOOLS_ENABLED` folds to `false` at build time and every
 * `if (DEV_TOOLS_ENABLED)` branch becomes unreachable code that the minifier
 * deletes. That is why the QA surface is loaded through `require` inside such
 * a branch rather than imported at the top of a file: an import is a graph
 * edge Metro must follow and bundle, a dead-code-eliminated require is not.
 *
 * The consequence is the property the phase actually needs — the production
 * binary does not *contain* the developer tools, the canonical solution text
 * they can reveal, or the strings that name them. It is not a hidden button.
 * There is nothing behind the button to hide.
 *
 * `EXPO_PUBLIC_DEV_TOOLS=off` additionally silences them inside a development
 * build, for recording footage or handing a debug build to a playtester.
 */

/** True only in a development bundle. Metro folds this to `false` on release. */
const BUILD_IS_DEVELOPMENT: boolean =
  typeof __DEV__ !== 'undefined' && __DEV__ === true;

/**
 * Opt-out only. Deliberately not an opt-in: a flag that can *enable* developer
 * tooling is a flag that can be set by accident on a shipped build.
 */
const SILENCED_BY_ENVIRONMENT: boolean =
  process.env.EXPO_PUBLIC_DEV_TOOLS === 'off';

export const DEV_TOOLS_ENABLED: boolean =
  BUILD_IS_DEVELOPMENT && !SILENCED_BY_ENVIRONMENT;

/** Printed on the console so a build can never be misidentified in a screenshot. */
export const DEV_BUILD_LABEL = BUILD_IS_DEVELOPMENT
  ? 'DEVELOPMENT BUILD'
  : 'RELEASE BUILD';

/**
 * Pure form of the same decision, so the rule itself is testable rather than
 * only observable. `resolveDevToolsEnabled` is what the constant above means.
 */
export function resolveDevToolsEnabled(input: {
  isDevelopmentBuild: boolean;
  devToolsEnv?: string | undefined;
}): boolean {
  return input.isDevelopmentBuild && input.devToolsEnv !== 'off';
}

/**
 * Guard for every QA action. Returning a value rather than throwing keeps a
 * misrouted call harmless: in production it simply does nothing.
 */
export function withDevTools<T>(run: () => T): T | null {
  if (!DEV_TOOLS_ENABLED) return null;
  return run();
}
