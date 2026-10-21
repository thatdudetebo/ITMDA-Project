// Reads and writes device settings, available before the database opens.
// Deliverable 3 reference: section 6.2, data layer

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Preferences {
  enhancedMode: boolean;
  wifiOnlyDownloads: boolean;
}

const STORAGE_KEY = 'studybee.preferences';

const DEFAULT_PREFERENCES: Preferences = {
  enhancedMode: false,
  wifiOnlyDownloads: true,
};

/** Loads saved settings, or defaults for first launch or invalid stored data. */
export async function getPreferences(): Promise<Preferences> {
  const storedPreferences = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedPreferences) return DEFAULT_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(storedPreferences);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;

    const values = parsed as Partial<Preferences>;
    return {
      enhancedMode:
        typeof values.enhancedMode === 'boolean'
          ? values.enhancedMode
          : DEFAULT_PREFERENCES.enhancedMode,
      wifiOnlyDownloads:
        typeof values.wifiOnlyDownloads === 'boolean'
          ? values.wifiOnlyDownloads
          : DEFAULT_PREFERENCES.wifiOnlyDownloads,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persists one settings control without resetting the other preference. */
export async function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  const preferences = await getPreferences();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, [key]: value }));
}
