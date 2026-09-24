import type { ImageSource } from 'expo-image';

/** Static, bundled media for fictional websites. No network fallback exists. */
const FICTIONAL_INTERNET_ASSETS: Readonly<Record<string, number>> = {};

export function resolveFictionalInternetImage(
  assetId: string,
): ImageSource | number | null {
  return FICTIONAL_INTERNET_ASSETS[assetId] ?? null;
}
