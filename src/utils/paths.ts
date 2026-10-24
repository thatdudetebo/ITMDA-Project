/** Converts a file:// URI to the plain, decoded path that native modules expect. */
export function stripPath(path: string) {
  return decodeURIComponent(path.replace(/^file:\/\//, ''));
}
