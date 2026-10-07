// Reads and writes device settings, available before the database opens.
// Deliverable 3 reference: section 6.2, data layer

export interface Preferences {
  enhancedMode: boolean;
  wifiOnlyDownloads: boolean;
}

export async function getPreferences(): Promise<Preferences> {
  throw new Error('Not implemented');
}

export async function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  throw new Error('Not implemented');
}
