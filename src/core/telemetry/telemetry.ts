export type TelemetryEvent =
  | { name: 'shell_destination_opened'; route: string }
  | { name: 'settings_changed'; setting: string };

export interface TelemetryClient {
  track(event: TelemetryEvent): void;
}

/** Vendor-neutral boundary; intentionally no-op until consent is designed. */
export const telemetry: TelemetryClient = {
  track: () => undefined,
};
