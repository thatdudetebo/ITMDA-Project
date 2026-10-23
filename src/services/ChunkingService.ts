// Splits extracted text into overlapping chunks for retrieval.
// Deliverable 3 reference: section 6.4.1

import { createMaterialChunks } from '../db/queries';

// The project requires approximately 512 model tokens per slice with a 50-token overlap.
// Whitespace-separated words are used as a practical approximation: 380 words is about
// 500 tokens and 38 words is about 50 tokens.
const CHUNK_SIZE_WORDS = 380;
const CHUNK_OVERLAP_WORDS = 38;

/** Splits text into 380-word slices with a 38-word overlap. */
export function chunkText(text: string): string[] {
  const words = text.match(/\S+/g) ?? [];
  if (words.length === 0) return [];

  const chunks: string[] = [];
  const step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;

  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + CHUNK_SIZE_WORDS).join(' '));
    if (start + CHUNK_SIZE_WORDS >= words.length) break;
  }

  return chunks;
}

/** Chunks a document and writes the rows to MaterialChunk. */
export async function chunkAndStore(materialId: number, text: string): Promise<number> {
  if (!Number.isInteger(materialId) || materialId <= 0) {
    throw new Error('A valid material ID is required.');
  }

  const chunks = chunkText(text);
  await createMaterialChunks(
    chunks.map((ExtractedText, ChunkIndex) => ({
      MaterialID: materialId,
      ChunkIndex,
      ExtractedText,
    })),
  );
  return chunks.length;
}
