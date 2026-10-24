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
