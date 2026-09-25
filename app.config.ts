import type { ExpoConfig } from 'expo/config';

/**
 * INTERNET DETECTIVE — production application configuration.
 *
 * Replaces app.json so the store-readiness decisions can carry their reasons.
 * Every value here is either final or a clearly marked placeholder; nothing
 * account-specific is invented. See docs/STORE_READINESS.md for the submission
 * checklist and docs/PRIVACY.md for the data declarations these settings back.
 *
 * ── PLACEHOLDERS ───────────────────────────────────────────────────────────
 * The following must be filled in from your own developer accounts before a
 * real submission. They are left empty on purpose — a fabricated team id or
 * project id fails late and confusingly.
 *
 *   EAS_PROJECT_ID     `npx eas init` writes this; also sets `owner`.
 *   APPLE_TEAM_ID      Apple Developer → Membership.
 *   ASC_APP_ID         App Store Connect → App Information → Apple ID.
 *
 * Bundle and package identifiers below are real and final for this project.
 * Change them only if you own a different reverse-DNS domain.
 */

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '';

/** Marketing version. Bump for every public release. */
const VERSION = '1.0.0';

/**
 * Build numbers are managed remotely by EAS (`appVersionSource: "remote"` in
 * eas.json, with `autoIncrement` on the production profile). The literals here
 * are the local fallback for bare builds and for anything that reads the
 * config directly — the in-app build stamp, for instance.
 */
const IOS_BUILD_NUMBER = '1';
const ANDROID_VERSION_CODE = 1;

/** Ink from the design system. The launch surface must not flash white. */
const INK = '#121511';

const config: ExpoConfig = {
  name: 'INTERNET DETECTIVE',
  slug: 'internet-detective',
  version: VERSION,
  platforms: ['ios', 'android'],
  // A portrait detective game. Nothing in the evidence board, the browser, or
  // the viewers is designed to rotate, so rotation is not offered.
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'internetdetective',
  // The game has one look. Following the system theme would fight the art.
  userInterfaceStyle: 'dark',
  backgroundColor: INK,
  primaryColor: '#D3A44B',
  // No OTA updates are configured: the game ships complete and offline, and a
  // silent content swap is the wrong model for an authored mystery.
  updates: { enabled: false },
  assetBundlePatterns: ['assets/**/*'],

  ios: {
    bundleIdentifier: 'com.internetdetective.game',
    buildNumber: IOS_BUILD_NUMBER,
    // iPhone-first by design. The board, the viewers, and the typography are
    // laid out for a phone in the hand; shipping an unconsidered iPad build
    // would be worse than not shipping one.
    supportsTablet: false,
    icon: './assets/images/icon.png',
    infoPlist: {
      // The app performs no encryption beyond what the OS provides, so the
      // export-compliance question is answered here once instead of on every
      // TestFlight upload.
      ITSAppUsesNonExemptEncryption: false,
      // No arbitrary loads: the game makes no network requests at all, and
      // this makes that non-negotiable at the platform level.
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
      },
      UIViewControllerBasedStatusBarAppearance: false,
    },
  },

  android: {
    package: 'com.internetdetective.game',
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      backgroundColor: INK,
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    /**
     * PERMISSION AUDIT — removals.
     *
     * These were being added transitively by library config plugins, not by
     * anything the game does. Each is stripped from the merged manifest.
     *
     *   READ/WRITE_EXTERNAL_STORAGE  expo-image's manifest, for loading user
     *                                gallery images. Every image in this game
     *                                is bundled; none is ever read from disk.
     *   SYSTEM_ALERT_WINDOW          React Native's debug overlay.
     *
     * RECORD_AUDIO is not listed here because it is refused at the source —
     * see the expo-audio plugin options below. Blocking a permission is a
     * last resort; not requesting it is better.
     */
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    /**
     * PERMISSION AUDIT — what remains, and why.
     *
     *   INTERNET                  Required by the React Native runtime itself.
     *                             The game issues no requests; a test asserts
     *                             there is no fetch, XHR, or socket in the
     *                             source. It is a normal permission and shows
     *                             the player no prompt.
     *   VIBRATE                   Haptic feedback on the evidence board.
     *   MODIFY_AUDIO_SETTINGS     Ambient beds and interface cues.
     *
     * No contacts, microphone, camera, location, SMS, storage, or identifier
     * permission is requested.
     */
    permissions: [
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ],
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: INK,
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
      },
    ],
    'expo-font',
    'expo-image',
    [
      'expo-video',
      {
        // A case file should stop when the player puts the phone down.
        supportsBackgroundPlayback: false,
        supportsPictureInPicture: false,
      },
    ],
    [
      'expo-audio',
      {
        /**
         * The single most important block in this file.
         *
         * expo-audio's plugin defaults request the microphone on both
         * platforms and declare background audio. This game only ever plays
         * short bundled cues and room tone — it has never recorded anything.
         *
         * Left at their defaults, a store listing would have to explain why a
         * detective game wants your microphone, and iOS would show the
         * recording indicator. All four are turned off.
         *
         *   microphonePermission: false  drops NSMicrophoneUsageDescription
         *   recordAudioAndroid: false    drops RECORD_AUDIO
         *   enableBackgroundPlayback     drops UIBackgroundModes: audio and
         *     : false                    the FOREGROUND_SERVICE permissions
         */
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    'expo-asset',
    // Local: removes developer-tooling keys from a release Info.plist.
    './plugins/withReleaseHygiene',
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
};

export default config;
