// Finds the chunks most relevant to a query by cosine similarity.
// Deliverable 3 reference: section 6.4.2

import type { RetrievedChunk } from '../types/models';

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  throw new Error('Not implemented');
}

/** Returns the TOP_K closest chunks, re-sorted by ChunkIndex for reading order. */
export async function retrieve(query: string, materialId?: number): Promise<RetrievedChunk[]> {
  throw new Error('Not implemented');
}
