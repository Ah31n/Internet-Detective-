import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locates the project root from this file's own position on disk.
 *
 * The source-auditing tests used to derive it from `process.cwd()` and strip
 * that prefix off each path:
 *
 *     path.replace(`${process.cwd()}/`, '')
 *
 * That is silently wrong whenever the runner's working directory is not the
 * project root — a CI step with the wrong `working-directory`, a monorepo
 * runner, an editor test button, `npm --prefix`. The strip then does nothing,
 * every path stays absolute, and every `startsWith('src/…')` allowlist check
 * fails at once. The tests do not error; they report every file in the project
 * as an architecture violation, which looks exactly like a real regression and
 * sends you hunting through code that was never wrong.
 *
 * Anchoring on `import.meta.url` removes the variable entirely: a module knows
 * where it is regardless of where the process was started.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

/** `<root>/src/test-support` → `<root>`. */
export const PROJECT_ROOT = join(HERE, '..', '..');

/** Absolute path to something in the project. */
export const fromRoot = (...segments: string[]) =>
  join(PROJECT_ROOT, ...segments);

/** Reads a project file by its root-relative path. */
export const readProjectFile = (relativePath: string) =>
  readFileSync(fromRoot(relativePath), 'utf8');

/**
 * Root-relative, POSIX-separated path — the form every allowlist and every
 * assertion message in the audit tests is written against.
 */
export const toProjectPath = (absolutePath: string) =>
  relative(PROJECT_ROOT, absolutePath).split(sep).join('/');

export interface SourceFileFilter {
  /** Extensions to include, with the dot. Defaults to .ts and .tsx. */
  extensions?: readonly string[];
  /** Skip test files. Defaults to true. */
  excludeTests?: boolean;
}

/**
 * Every source file under a root-relative directory, as root-relative paths.
 */
export function listSourceFiles(
  relativeDir: string,
  { extensions = ['.ts', '.tsx'], excludeTests = true }: SourceFileFilter = {},
): string[] {
  const walk = (absoluteDir: string): string[] =>
    readdirSync(absoluteDir).flatMap((entry) => {
      const absolute = join(absoluteDir, entry);
      if (statSync(absolute).isDirectory()) return walk(absolute);

      const projectPath = toProjectPath(absolute);
      if (!extensions.some((extension) => entry.endsWith(extension))) return [];
      if (
        excludeTests &&
        (projectPath.includes('__tests__') || /\.test\.tsx?$/.test(entry))
      ) {
        return [];
      }
      return [projectPath];
    });

  return walk(fromRoot(relativeDir)).sort();
}

/** Source files with their contents, ready to audit. */
export function readSourceFiles(
  relativeDir: string,
  filter?: SourceFileFilter,
): readonly { path: string; source: string }[] {
  return listSourceFiles(relativeDir, filter).map((path) => ({
    path,
    source: readProjectFile(path),
  }));
}
