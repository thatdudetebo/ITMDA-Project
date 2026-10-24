export function formatBytes(size: number): string {
  const bytesPerMiB = 1_048_576;
  if (size >= bytesPerMiB) {
    return `${(size / bytesPerMiB).toFixed(2)}MiB`;
  }
  return `${size} Bytes`;
}
