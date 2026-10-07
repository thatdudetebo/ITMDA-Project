// Runs the local model to produce text.
// Deliverable 3 reference: section 6.2, inference layer

/** Loads the generation model into memory. */
export async function loadGenerationModel(): Promise<void> {
  throw new Error('Not implemented');
}

/** Generates a completion locally, streaming tokens to onToken if supplied. */
export async function generate(prompt: string, onToken?: (t: string) => void): Promise<string> {
  throw new Error('Not implemented');
}

export async function unloadModel(): Promise<void> {
  throw new Error('Not implemented');
}
