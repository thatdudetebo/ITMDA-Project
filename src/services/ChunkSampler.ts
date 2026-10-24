// Picks chunks spread across a whole document for tasks that have no search query.
// Pure logic with no React Native imports, so it can be tested off-device.
// Deliverable 3 reference: section 6.4.2

import { AVAILABLE_CONTEXT_TOKENS } from '../config';
import type { MaterialChunk, RetrievedChunk } from '../types/models';
import { estimateTokens } from './PromptBuilder';

/**
 * Chooses evenly spaced chunks that fit AVAILABLE_CONTEXT_TOKENS, returned in reading order.
 * Short documents are returned whole. Similarity is fixed at 1 because nothing was scored.
 */
export function sampleChunks(
  chunks: MaterialChunk[],
  budgetTokens: number = AVAILABLE_CONTEXT_TOKENS,
): RetrievedChunk[] {
  const ordered = [...chunks].sort((a, b) => a.ChunkIndex - b.ChunkIndex);
  const cost = (chunk: MaterialChunk) => estimateTokens(chunk.ExtractedText);
  const total = ordered.reduce((sum, chunk) => sum + cost(chunk), 0);

  // Evenly spaced picks for a given count, in reading order.
  const pick = (count: number) =>
    Array.from({ length: count }, (_, i) => ordered[Math.floor((i * ordered.length) / count)]);
  const fits = (count: number) =>
    pick(count).reduce((sum, chunk) => sum + cost(chunk), 0) <= budgetTokens;

  let picked = ordered;
  if (total > budgetTokens && ordered.length > 0) {
    // Binary search for the largest count that fits, then step down if unevenness breaks it.
    let low = 1;
    let high = ordered.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (fits(mid)) low = mid;
      else high = mid - 1;
    }
    while (low > 1 && !fits(low)) low -= 1;
    picked = pick(low);
  }
  return picked.map((chunk) => ({ ...chunk, similarity: 1 }));
}
