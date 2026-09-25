import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { PROJECT_ROOT } from './projectRoot';

/**
 * Reads the Expo config exactly as Expo itself resolves it, plugins and all.
 *
 * The obvious way to do this is `execFileSync('npx', ['expo', …])`, and it is
 * wrong on Windows: there is no `npx` executable there, only `npx.cmd`, and
 * `execFileSync` does not apply PATHEXT the way a shell does. The call fails
 * with `spawnSync npx ENOENT` on a machine where `npx expo config` works
 * perfectly from the terminal — a test failure caused entirely by the test.
 *
 * Special-casing `npx.cmd` would fix that one platform. Resolving the CLI's
 * JavaScript entry point and running it with the Node binary already executing
 * this process fixes it everywhere, and is better for three other reasons:
 *
 *   - `process.execPath` is an absolute path to a real executable, so there is
 *     no PATH lookup and no shell to quote arguments for;
 *   - it runs the Expo CLI this project has pinned, rather than whatever `npx`
 *     decides to resolve or fetch, so the assertion is deterministic;
 *   - it skips npx's resolution step, which is the slowest part of the call.
 *
 * If a future Expo release moves that entry point, the call falls back to the
 * platform-correct `npx` binary rather than failing outright.
 */

const require = createRequire(import.meta.url);

/**
 * The `npx` executable name for a platform.
 *
 * Windows has no extensionless `npx`; it ships `npx.cmd`. A shell finds it via
 * PATHEXT, `execFileSync` does not — which is the whole reason the original
 * call failed with ENOENT on a machine where the same command worked fine in
 * PowerShell. Pure, so the Windows branch is covered from any platform.
 */
export function npxBinaryFor(platform: NodeJS.Platform | string): string {
  return platform === 'win32' ? 'npx.cmd' : 'npx';
}

/** How the Expo CLI will be invoked. Exported so a test can assert the shape. */
export function resolveExpoCliInvocation(): {
  command: string;
  leadingArgs: readonly string[];
  strategy: 'node-entry' | 'npx';
} {
  try {
    return {
      command: process.execPath,
      leadingArgs: [require.resolve('expo/bin/cli')],
      strategy: 'node-entry',
    };
  } catch {
    // `npx` is a shell script on POSIX and a .cmd shim on Windows.
    return {
      command: npxBinaryFor(process.platform),
      leadingArgs: ['expo'],
      strategy: 'npx',
    };
  }
}

/** Runs `expo <args>` from the project root and returns raw stdout. */
export function runExpoCli(args: readonly string[]): string {
  const { command, leadingArgs } = resolveExpoCliInvocation();

  return execFileSync(command, [...leadingArgs, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** The resolved public app config, as the build pipeline sees it. */
export function readExpoPublicConfig(): Record<string, unknown> {
  return JSON.parse(runExpoCli(['config', '--json', '--type', 'public'])) as Record<
    string,
    unknown
  >;
}
