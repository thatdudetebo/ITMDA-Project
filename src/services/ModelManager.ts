// Downloads, verifies and locates the GGUF model files.
// Deliverable 3 reference: section 6.1 and 6.2

export interface ModelStatus {
  name: string;
  present: boolean;
  localPath: string | null;
  sizeBytes: number | null;
}

export async function getStatus(): Promise<ModelStatus[]> {
  throw new Error('Not implemented');
}

/** Downloads a model on first launch. Resumable, Wi-Fi only by default. */
export async function downloadModel(
  name: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  throw new Error('Not implemented');
}
