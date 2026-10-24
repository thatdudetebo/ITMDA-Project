// Decides which material is active when the app starts or the library changes.
// Pure function with no React Native imports, so it can be tested off-device.

/**
 * Returns the stored material ID if that material still exists. If nothing usable is stored,
 * returns the newest material (the list is newest first) when `fallbackToNewest` is true,
 * otherwise null. A deleted material's ID is never returned.
 */
export function resolveActiveId(
  storedId: number | null,
  materials: ReadonlyArray<{ MaterialID: number }>,
  fallbackToNewest: boolean,
): number | null {
  if (storedId !== null && materials.some((m) => m.MaterialID === storedId)) return storedId;
  if (fallbackToNewest && materials.length > 0) return materials[0].MaterialID;
  return null;
}

/** Reads a stored ID string back into a positive integer, or null if it is not one. */
export function parseStoredId(value: string | null): number | null {
  if (value === null) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
