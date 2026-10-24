export function formatBytes(size: number): string {
  const bytesPerMiB = 1_048_576;
  if (size >= bytesPerMiB) {
    return `${(size / bytesPerMiB).toFixed(2)}MiB`;
  }
  return `${size} Bytes`;
}

/** The name shown for a material: the user's title, or the file name if it has none. */
export function materialTitle(material: { ModuleCode: string | null; FileName: string }): string {
  return material.ModuleCode?.trim() || material.FileName;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * SQLite stores CURRENT_TIMESTAMP as UTC text like "2026-10-24 14:49:08". Converts it to the
 * device's local time as "2026-10-24 16:49", or "2026-10-24" when `dateOnly` is set.
 * Anything that is not a timestamp is returned unchanged.
 */
export function formatTimestamp(utcText: string, dateOnly = false): string {
  const iso = utcText.replace(' ', 'T');
  // Text that already names a zone (Z or +02:00) is read as written; SQLite's has none, so it is UTC.
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const parsed = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(parsed.getTime())) return utcText;
  const date = `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  return dateOnly ? date : `${date} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}
