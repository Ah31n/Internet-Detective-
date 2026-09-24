// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

/**
 * PHASE 17 — DEVELOPER TOOLS ARE EXCLUDED AT THE BUNDLER, NOT AT RUNTIME.
 *
 * A guard like `if (__DEV__) require('./devTools')` does not keep anything out
 * of a release build. Metro collects dependencies from the syntax tree before
 * any minifier gets a chance to delete the dead branch, so the module is still
 * resolved, still transformed, and still written into the bundle. Verified
 * here rather than assumed: with only the runtime guard in place, a production
 * export contained every QA tool label and the complete canonical solution,
 * greppable with `strings`.
 *
 * So the exclusion happens where it can actually be enforced. In a production
 * build (`context.dev === false`, which Metro derives from the build mode, not
 * from an environment variable an operator could get wrong), every request for
 * a developer-only module resolves to an empty stub. The real files are never
 * read, so their contents cannot reach the binary.
 *
 * `devMode.ts` is deliberately NOT stubbed: shipped code imports it to learn
 * that the gate is shut, and it must keep answering.
 */

const DEV_ONLY_MODULES = [
  path.join('src', 'core', 'dev', 'qaTools'),
  path.join('src', 'core', 'dev', 'qaInspectors'),
  path.join('src', 'core', 'dev', 'canonicalReveal'),
  path.join('src', 'features', 'qa'),
  // The sealed narrative solution. The engine's answer key lives in
  // case001.truth.ts and ships normally; this file is the prose and must not.
  path.join('src', 'case-content', 'cases', 'case001', 'case001.solution'),
];

const ALIAS_PREFIXES = [
  '@/core/dev/qaTools',
  '@/core/dev/qaInspectors',
  '@/core/dev/canonicalReveal',
  '@/features/qa',
  '@/case-content/cases/case001/case001.solution',
];

const STUB = path.resolve(__dirname, 'src/core/dev/devOnlyStub.js');

function isDeveloperOnly(moduleName, resolvedPath) {
  if (ALIAS_PREFIXES.some((prefix) => moduleName.startsWith(prefix))) return true;
  if (!resolvedPath) return false;
  const normalized = path.normalize(resolvedPath);
  return DEV_ONLY_MODULES.some((fragment) => normalized.includes(fragment));
}

const config = getDefaultConfig(__dirname);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;

  if (!context.dev) {
    // Cheap check first: catches the aliased specifiers without resolving.
    if (isDeveloperOnly(moduleName, null)) {
      return { type: 'sourceFile', filePath: STUB };
    }

    const resolution = resolve(context, moduleName, platform);
    if (
      resolution.type === 'sourceFile' &&
      isDeveloperOnly(moduleName, resolution.filePath)
    ) {
      return { type: 'sourceFile', filePath: STUB };
    }
    return resolution;
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
