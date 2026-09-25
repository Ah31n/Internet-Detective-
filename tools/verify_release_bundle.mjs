#!/usr/bin/env node
/**
 * PHASE 17 — RELEASE BUNDLE VERIFICATION
 *
 * The source-level tests prove that nothing shipped *imports* the developer
 * tools. This proves the thing that actually matters: the compiled production
 * bundle does not *contain* them.
 *
 * It exports a real production bundle and greps the compiled output for:
 *
 *   - phrases that exist only in the sealed canonical solution,
 *   - the labels of the QA tools,
 *   - the identifying strings of the console itself.
 *
 * Any hit is a failure. This is the check that would have caught the leak this
 * phase found: the canonical solution prose was shipping inside the binary,
 * readable with `strings`, because the engine's answer key shared a module
 * with it.
 *
 *     node tools/verify_release_bundle.mjs
 *     npm run verify:release
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Phrases that appear ONLY in case001.solution.ts — verified against source. */
const SEALED_SOLUTION_PHRASES = [
  'Twelve days before the gala',
  'needed to clear a concealed private debt',
  'suppressed the automated alert',
  'sealed the real Asterion inside the battery cavity',
  'The cloned conservator credential, Mara',
  'could not perform the exchange',
];

/** Strings that exist only inside the developer QA surface. */
const DEVELOPER_TOOL_STRINGS = [
  'QA CONSOLE',
  'REVEAL CANONICAL SOLUTION',
  'SIMULATE CONTRADICTION',
  'SIMULATE PREMIUM ENTITLEMENT',
  'CREATE TEST CONNECTIONS',
  'UNLOCK ALL EVIDENCE',
  'ADD ALL EVIDENCE',
  'CLEAR LOCAL SAVE',
  'JUMP TO CASE REPORT',
  'RESET EVIDENCE BOARD',
  'NOT PRESENT IN RELEASE BUILDS',
  'DETERMINISTIC SEQUENCE',
];

function bundleFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = join(root, entry.name);
    if (entry.isDirectory()) return bundleFiles(full);
    return /\.(hbc|js|map|json)$/.test(entry.name) ? [full] : [];
  });
}

function main() {
  const platform = process.argv[2] ?? 'ios';
  const output = mkdtempSync(join(tmpdir(), 'release-verify-'));

  console.log(`Exporting a production bundle for ${platform}…`);
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', platform, '--output-dir', output],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );

  const files = bundleFiles(output).filter((file) => /\.(hbc|js)$/.test(file));
  if (files.length === 0) {
    console.error('No compiled bundle found. Nothing was verified.');
    rmSync(output, { recursive: true, force: true });
    process.exit(1);
  }

  const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
  console.log(
    `Scanning ${files.length} compiled file(s), ${(totalBytes / 1048576).toFixed(1)} MB.`,
  );

  const failures = [];
  for (const file of files) {
    // Latin1 so the byte sequences of string literals are matched inside the
    // Hermes bytecode, which is not valid UTF-8 as a whole.
    const contents = readFileSync(file, 'latin1');
    for (const phrase of SEALED_SOLUTION_PHRASES) {
      if (contents.includes(phrase)) {
        failures.push(`SEALED SOLUTION  "${phrase}"  in ${file}`);
      }
    }
    for (const phrase of DEVELOPER_TOOL_STRINGS) {
      if (contents.includes(phrase)) {
        failures.push(`DEVELOPER TOOL   "${phrase}"  in ${file}`);
      }
    }
  }

  rmSync(output, { recursive: true, force: true });

  if (failures.length > 0) {
    console.error(`\nFAILED — ${failures.length} forbidden string(s) in the release bundle:\n`);
    for (const failure of failures) console.error(`  ${failure}`);
    console.error(
      '\nThe production build must contain neither the canonical solution nor the QA tools.',
    );
    process.exit(1);
  }

  console.log(
    `\nPASS — ${SEALED_SOLUTION_PHRASES.length} sealed phrases and ` +
      `${DEVELOPER_TOOL_STRINGS.length} developer strings are absent from the release bundle.`,
  );
}

main();
