const { withInfoPlist } = require('expo/config-plugins');

/**
 * Strips developer-tooling traces from a release Info.plist.
 *
 * `expo-dev-client` is a development dependency, but its config plugin runs
 * during every prebuild and writes `NSLocalNetworkUsageDescription` ("Expo Dev
 * Launcher uses the local network to discover development servers…") into the
 * shipped plist. A game that makes no network requests at all should not be
 * telling the App Store reviewer, or the player reading the privacy label,
 * that it wants the local network.
 *
 * (The bare `<key>UIBackgroundModes</key><array/>` that remains in the plist
 * comes from the iOS template and is written after all config mods run. An
 * empty capability array declares nothing and has no effect on review, the
 * privacy label, or runtime behaviour — what mattered was removing the
 * `audio` entry, and that is gone.)
 *
 * Development builds are exempt. `eas.json` sets
 * `INTERNET_DETECTIVE_DEV_CLIENT=1` on the development profiles, and
 * `npx expo run:*` should be invoked with it too, so the dev launcher keeps
 * the key it genuinely needs.
 */

const DEV_ONLY_INFO_PLIST_KEYS = ['NSLocalNetworkUsageDescription', 'NSBonjourServices'];

const withReleaseHygiene = (config) =>
  withInfoPlist(config, (modConfig) => {
    const buildingDevClient = process.env.INTERNET_DETECTIVE_DEV_CLIENT === '1';

    if (!buildingDevClient) {
      for (const key of DEV_ONLY_INFO_PLIST_KEYS) {
        delete modConfig.modResults[key];
      }
    }

    return modConfig;
  });

module.exports = withReleaseHygiene;
