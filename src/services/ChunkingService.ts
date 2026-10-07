// Splits extracted text into overlapping chunks for retrieval.
// Deliverable 3 reference: section 6.4.1

/** Splits text into CHUNK_SIZE_TOKENS pieces with CHUNK_OVERLAP_TOKENS overlap. */
export function chunkText(text: string): string[] {
  throw new Error('Not implemented');
}

/** Chunks a document and writes the rows to MaterialChunk. */
export async function chunkAndStore(materialId: number, text: string): Promise<number> {
  throw new Error('Not implemented');
}
