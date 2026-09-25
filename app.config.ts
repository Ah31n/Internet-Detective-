import type { ExpoConfig } from 'expo/config';

/**
 * INTERNET DETECTIVE
 * Native mobile application configuration.
 *
 * Production target:
 *   - iOS
 *   - Android
 *
 * This project is intentionally NOT a web application.
 * There is no PWA, WebView, HTML/CSS UI, or web target.
 */

const INK = '#121511';
const GOLD = '#D3A44B';

const config: ExpoConfig = {
  /**
   * ------------------------------------------------------------
   * IDENTITY
   * ------------------------------------------------------------
   */
  name: 'INTERNET DETECTIVE',
  slug: 'internet-detective',
  version: '1.0.0',

  /**
   * Only build for mobile platforms.
   */
  platforms: ['ios', 'android'],

  /**
   * The entire game is designed around a phone held vertically.
   */
  orientation: 'portrait',

  /**
   * App appearance.
   */
  userInterfaceStyle: 'dark',
  backgroundColor: INK,
  primaryColor: GOLD,

  /**
   * App icon.
   */
  icon: './assets/images/icon.png',

  /**
   * Deep-link / native URL scheme.
   */
  scheme: 'internetdetective',

  /**
   * No OTA content changes.
   *
   * INTERNET DETECTIVE is an authored, deterministic investigation game.
   * Case content should ship with a known application version rather than
   * silently changing underneath a player's investigation.
   */
  updates: {
    enabled: false,
  },

  /**
   * Bundle application assets.
   */
  assetBundlePatterns: ['assets/**/*'],

  /**
   * ------------------------------------------------------------
   * iOS
   * ------------------------------------------------------------
   */
  ios: {
    /**
     * IMPORTANT:
     * Verify this identifier is available in your Apple Developer account
     * before the first App Store submission.
     */
    bundleIdentifier: 'com.internetdetective.game',

    /**
     * Local fallback build number.
     * EAS production builds use remote versioning + autoIncrement.
     */
    buildNumber: '1',

    /**
     * Phone-first product.
     */
    supportsTablet: false,

    /**
     * App icon.
     */
    icon: './assets/images/icon.png',

    infoPlist: {
      /**
       * Export-compliance declaration.
       *
       * The game does not implement non-exempt encryption.
       */
      ITSAppUsesNonExemptEncryption: false,

      /**
       * Do not permit arbitrary insecure network loads.
       *
       * The game's canonical investigation content is local.
       */
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
      },

      /**
       * Status-bar appearance is controlled by the app.
       */
      UIViewControllerBasedStatusBarAppearance: false,
    },
  },

  /**
   * ------------------------------------------------------------
   * Android
   * ------------------------------------------------------------
   */
  android: {
    /**
     * IMPORTANT:
     * Verify this identifier is available in your Google Play
     * developer account before publishing.
     */
    package: 'com.internetdetective.game',

    /**
     * Local fallback version code.
     * EAS production autoIncrement handles subsequent releases.
     */
    versionCode: 1,

    /**
     * Android adaptive icon.
     */
    adaptiveIcon: {
      backgroundColor: INK,
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },

    /**
     * Support Android's predictive-back behavior.
     */
    predictiveBackGestureEnabled: true,

    /**
     * ----------------------------------------------------------
     * PERMISSION HARDENING
     * ----------------------------------------------------------
     *
     * The game does not need:
     *   - camera
     *   - microphone
     *   - contacts
     *   - location
     *   - SMS
     *   - gallery/storage access
     *   - advertising identifier
     *
     * Case content is bundled with the application.
     */

    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
    ],

    /**
     * Permissions required by the actual application/runtime.
     *
     * INTERNET is retained because React Native / native runtime tooling
     * may require it at the platform level, even though canonical gameplay
     * does not depend on an internet connection.
     *
     * VIBRATE is used for tactile feedback.
     *
     * MODIFY_AUDIO_SETTINGS supports the game's local audio presentation.
     */
    permissions: [
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ],
  },

  /**
   * ------------------------------------------------------------
   * NATIVE PLUGINS
   * ------------------------------------------------------------
   */
  plugins: [
    /**
     * Expo Router.
     */
    'expo-router',

    /**
     * Native splash screen.
     */
    [
      'expo-splash-screen',
      {
        backgroundColor: INK,
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
      },
    ],

    /**
     * Bundled custom fonts.
     */
    'expo-font',

    /**
     * Native image handling.
     */
    'expo-image',

    /**
     * Video support for future / supported CCTV footage.
     *
     * Background playback and picture-in-picture are intentionally disabled.
     * CCTV is an investigation surface, not a media-player feature.
     */
    [
      'expo-video',
      {
        supportsBackgroundPlayback: false,
        supportsPictureInPicture: false,
      },
    ],

    /**
     * Local game audio only.
     *
     * CRITICAL:
     * This game does NOT record audio.
     *
     * Therefore:
     *   - microphone permission OFF
     *   - Android recording permission OFF
     *   - background recording OFF
     *   - background playback OFF
     */
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],

    /**
     * Local/bundled asset handling.
     */
    'expo-asset',

    /**
     * Removes development-only native configuration from release builds.
     */
    './plugins/withReleaseHygiene',
  ],

  /**
   * ------------------------------------------------------------
   * EXPERIMENTAL / DEVELOPMENT FEATURES
   * ------------------------------------------------------------
   */
  experiments: {
    /**
     * Typed Expo Router routes.
     */
    typedRoutes: true,

    /**
     * React Compiler was part of the existing project configuration.
     * Preserve it rather than silently changing the project's architecture.
     */
    reactCompiler: true,
  },

  /**
   * ------------------------------------------------------------
   * EAS PROJECT LINK
   * ------------------------------------------------------------
   *
   * This is the EAS project created by `eas init`.
   *
   * Because this is a dynamic app.config.ts file, EAS could not inject
   * the project ID automatically. It must be explicitly declared here.
   */
  extra: {
    eas: {
      projectId: '0fc39900-501f-430c-b365-3bb96aecfd7b',
    },
  },
};

export default config;