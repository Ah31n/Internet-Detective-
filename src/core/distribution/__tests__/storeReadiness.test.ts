import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  PROJECT_ROOT,
  fromRoot,
  listSourceFiles,
  readProjectFile,
} from '@/test-support/projectRoot';

/**
 * PHASE 18 — STORE READINESS, ASSERTED
 *
 * Distribution problems are the expensive kind: they surface in review, days
 * later, as a rejection. These tests turn the ones that are checkable into
 * build failures instead.
 *
 * The permission assertions matter most. Every sensitive permission this
 * project ever requested was requested by a library's config-plugin defaults,
 * not by any line of game code — so nothing in the source would ever have told
 * us, and nothing but a check like this would catch a regression when a
 * dependency is upgraded.
 */

const ROOT = PROJECT_ROOT;
const read = readProjectFile;

/** The config as Expo itself resolves it, plugins and all. */
function resolvedConfig(): Record<string, unknown> {
  const raw = execFileSync('npx', ['expo', 'config', '--json', '--type', 'public'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(raw) as Record<string, unknown>;
}

const config = resolvedConfig();
const ios = config.ios as Record<string, unknown>;
const android = config.android as Record<string, unknown>;

describe('app identity', () => {
  it('is named INTERNET DETECTIVE', () => {
    expect(config.name).toBe('INTERNET DETECTIVE');
    expect(config.slug).toBe('internet-detective');
  });

  it('carries a release version and a build number on both platforms', () => {
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ios.buildNumber).toMatch(/^\d+$/);
    expect(typeof android.versionCode).toBe('number');
  });

  it('declares reverse-DNS identifiers for both stores', () => {
    expect(ios.bundleIdentifier).toBe('com.internetdetective.game');
    expect(android.package).toBe('com.internetdetective.game');
  });

  it('locks the game to portrait and to its own dark theme', () => {
    expect(config.orientation).toBe('portrait');
    expect(config.userInterfaceStyle).toBe('dark');
    expect(config.backgroundColor).toBe('#121511');
  });

  it('configures icons and a splash screen that never flashes white', () => {
    expect(config.icon).toContain('icon.png');
    expect((android.adaptiveIcon as Record<string, unknown>).foregroundImage).toBeTruthy();
    expect((android.adaptiveIcon as Record<string, unknown>).monochromeImage).toBeTruthy();

    const splash = (config.plugins as unknown[]).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    ) as [string, Record<string, unknown>];
    expect(splash[1].backgroundColor).toBe('#121511');
  });

  it('answers the export-compliance question in the config', () => {
    // Otherwise it is asked again on every single TestFlight upload.
    expect((ios.infoPlist as Record<string, unknown>).ITSAppUsesNonExemptEncryption).toBe(
      false,
    );
  });
});

describe('permissions', () => {
  const FORBIDDEN = [
    'CAMERA',
    'RECORD_AUDIO',
    'READ_CONTACTS',
    'WRITE_CONTACTS',
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'ACCESS_BACKGROUND_LOCATION',
    'READ_SMS',
    'SEND_SMS',
    'RECEIVE_SMS',
    'READ_PHONE_STATE',
    'READ_CALENDAR',
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
    'READ_MEDIA_IMAGES',
    'POST_NOTIFICATIONS',
    'AD_ID',
  ];

  it('requests only the three permissions the game actually uses', () => {
    expect(android.permissions).toEqual([
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ]);
  });

  it('requests no sensitive Android permission', () => {
    const requested = (android.permissions as string[]) ?? [];
    for (const permission of FORBIDDEN) {
      expect(
        requested.some((item) => item.endsWith(permission)),
        permission,
      ).toBe(false);
    }
  });

  it('blocks the permissions libraries add behind our back', () => {
    const blocked = (android.blockedPermissions as string[]) ?? [];
    expect(blocked).toContain('android.permission.READ_EXTERNAL_STORAGE');
    expect(blocked).toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(blocked).toContain('android.permission.SYSTEM_ALERT_WINDOW');
  });

  it('declares no iOS usage description, because it needs none', () => {
    // A usage description is a promise to the reviewer that the app uses the
    // thing. The game uses none of them, so it must declare none.
    const infoPlist = (ios.infoPlist ?? {}) as Record<string, unknown>;
    const usageKeys = Object.keys(infoPlist).filter((key) =>
      key.endsWith('UsageDescription'),
    );
    expect(usageKeys, usageKeys.join(', ')).toEqual([]);
  });

  it('turns off every microphone and background-audio default in expo-audio', () => {
    // The plugin defaults are recordAudioAndroid: true and
    // enableBackgroundPlayback: true. Both would ship permissions the game has
    // no use for, so all four options are pinned.
    const audio = (config.plugins as unknown[]).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-audio',
    ) as [string, Record<string, unknown>];

    expect(audio, 'expo-audio must be configured, not bare').toBeDefined();
    expect(audio[1].microphonePermission).toBe(false);
    expect(audio[1].recordAudioAndroid).toBe(false);
    expect(audio[1].enableBackgroundPlayback).toBe(false);
    expect(audio[1].enableBackgroundRecording).toBe(false);
  });

  it('keeps video in the foreground too', () => {
    const video = (config.plugins as unknown[]).find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-video',
    ) as [string, Record<string, unknown>];
    expect(video[1].supportsBackgroundPlayback).toBe(false);
    expect(video[1].supportsPictureInPicture).toBe(false);
  });
});

describe('offline operation', () => {
  const sources = listSourceFiles('src').map((path) => ({
    path,
    source: read(path),
  }));

  it('has enough source to make the check meaningful', () => {
    expect(sources.length).toBeGreaterThan(80);
  });

  it('makes no network request anywhere in the application', () => {
    const offenders = sources
      .filter((file) =>
        /\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource|navigator\.sendBeacon/.test(
          file.source,
        ),
      )
      .map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('contains no remote URL that could be loaded at runtime', () => {
    // Fictional sites are local case artifacts with invented domains; what
    // must not exist is an http(s) URL the app would actually open.
    const offenders = sources
      .filter((file) => /['"`]https?:\/\/[^'"`\s]+['"`]/.test(file.source))
      .map((file) => file.path);
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('depends on no networking, analytics, or auth package', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    const forbidden =
      /axios|firebase|amplitude|mixpanel|segment|sentry|analytics|supabase|openai|anthropic|auth0|posthog|appsflyer|adjust|admob|google-signin/i;
    const offenders = Object.keys(pkg.dependencies).filter((name) =>
      forbidden.test(name),
    );
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('ships every case asset inside the binary', () => {
    const registry = read('src/case-content/evidenceMediaRegistry.ts');
    const requires = registry.match(/require\('\.\.\/\.\.\/assets\//g) ?? [];
    expect(requires.length).toBeGreaterThan(20);
    // A `uri` would mean a remote or filesystem image. None is registered.
    expect(registry).not.toMatch(/uri:\s*['"]https?:/);
  });

  it('runs no over-the-air update channel', () => {
    // An offline authored mystery should not be able to change under the
    // player, and the store listing should not have to explain that it can.
    expect((config.updates as Record<string, unknown>)?.enabled).toBe(false);
  });
});

describe('build configuration', () => {
  const eas = JSON.parse(read('eas.json')) as {
    build: Record<string, Record<string, unknown>>;
    submit: Record<string, Record<string, Record<string, string>>>;
  };

  it('has a production profile that builds store artifacts', () => {
    const production = eas.build.production!;
    expect(production.autoIncrement).toBe(true);
    expect((production.android as Record<string, string>).buildType).toBe(
      'app-bundle',
    );
  });

  it('has an internal preview profile on the release code path', () => {
    expect(eas.build.preview!.distribution).toBe('internal');
  });

  it('marks account-specific submit values as placeholders, not invented data', () => {
    const submit = eas.submit.production!;
    expect(submit.ios!.appleTeamId).toMatch(/^PLACEHOLDER_/);
    expect(submit.ios!.ascAppId).toMatch(/^PLACEHOLDER_/);
    expect(submit.android!.serviceAccountKeyPath).toMatch(/^PLACEHOLDER_/);
    // First submission should land as a draft on the internal track.
    expect(submit.android!.releaseStatus).toBe('draft');
  });

  it('carries no credential material in the repository', () => {
    const files = readdirSync(ROOT);
    const secrets = files.filter((name) =>
      /\.(p8|p12|mobileprovision|keystore|jks)$/.test(name),
    );
    expect(secrets, secrets.join(', ')).toEqual([]);
  });

  it('keeps developer tooling out of production dependencies', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['expo-dev-client']).toBeUndefined();
    expect(pkg.devDependencies['expo-dev-client']).toBeTruthy();
  });
});

describe('store assets', () => {
  function dimensions(path: string): { width: number; height: number } {
    const data = readFileSync(fromRoot(path));
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }

  it('ships a 1024 square master icon, as both stores require', () => {
    const icon = dimensions('assets/images/icon.png');
    expect(icon.width).toBe(1024);
    expect(icon.height).toBe(1024);
  });

  it('ships an adaptive icon at the Android foreground size', () => {
    for (const name of ['android-icon-foreground', 'android-icon-monochrome']) {
      const layer = dimensions(`assets/images/${name}.png`);
      expect(layer.width, name).toBeGreaterThanOrEqual(432);
      expect(layer.width, name).toBe(layer.height);
    }
  });

  it('documents the listing requirements without inventing URLs', () => {
    const listing = read('docs/STORE_LISTING.md');
    expect(listing).toContain('PLACEHOLDER');
    // No real-looking URL may appear: a fabricated privacy policy link is
    // worse than an obvious blank.
    const urls = listing.match(/https?:\/\/[^\s)<>]+/g) ?? [];
    const invented = urls.filter(
      (url) => !url.includes('PLACEHOLDER') && !url.includes('example'),
    );
    expect(invented, invented.join('\n')).toEqual([]);
  });
});
