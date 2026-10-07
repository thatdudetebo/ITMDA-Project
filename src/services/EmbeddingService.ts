// Turns text into vectors using the on-device embedding model.
// Deliverable 3 reference: section 6.2, inference layer

/** Loads the embedding model into memory. */
export async function loadEmbeddingModel(): Promise<void> {
  throw new Error('Not implemented');
}

/** Returns a single EMBEDDING_DIMENSIONS-length vector for the given text. */
export async function embed(text: string): Promise<Float32Array> {
  throw new Error('Not implemented');
}

/** Embeds every chunk of a material and writes the vectors back to the database. */
export async function embedMaterial(materialId: number): Promise<void> {
  throw new Error('Not implemented');
}
