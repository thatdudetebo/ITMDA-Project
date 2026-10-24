/** Converts a file:// URI to the plain, decoded path that native modules expect. */
export function stripPath(path: string) {
  return decodeURIComponent(path.replace(/^file:\/\//, ''));
}

/** Turns a user-visible file name into a safe stored stem: no extension, no path characters. */
export function toSafeFileStem(name: string, maxLength = 40): string {
  const stem = name.replace(/\.[^./\\]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  return stem.replace(/^_+|_+$/g, '').slice(0, maxLength) || 'document';
}
