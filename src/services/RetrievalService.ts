// Finds the chunks most relevant to a query by cosine similarity.
// Deliverable 3 reference: section 6.4.2

import { TOP_K } from '../config';
import type { RetrievedChunk } from '../types/models';
import { embed, embedPendingChunks, needsEmbedding, withEmbeddingModel } from './EmbeddingService';
import { cosineSimilarity, fromBlob } from './VectorMath';

export { cosineSimilarity };

/**
 * Returns the TOP_K chunks of a material closest in meaning to the query, re-sorted by
 * ChunkIndex for reading order. Chunks are embedded on first use and the vectors are reused.
 * The embedding model is freed before returning, so the generation model has the memory.
 */
export async function retrieve(query: string, materialId: number): Promise<RetrievedChunk[]> {
  const question = query.trim();
  if (!question) throw new Error('Type a question first.');

  return withEmbeddingModel(async () => {
    const { chunks } = await embedPendingChunks(materialId);
    const queryVector = await embed(question);

    const scored: RetrievedChunk[] = [];
    for (const chunk of chunks) {
      if (needsEmbedding(chunk.VectorEmbedding)) continue;
      const similarity = cosineSimilarity(
        queryVector,
        fromBlob(chunk.VectorEmbedding as Uint8Array),
      );
      if (Number.isFinite(similarity)) scored.push({ ...chunk, similarity });
    }
    const best = scored.sort((a, b) => b.similarity - a.similarity).slice(0, TOP_K);
    console.log(
      `[retrieval] top ${best.length} of ${scored.length}: ` +
        best.map((c) => `#${c.ChunkIndex}=${c.similarity.toFixed(3)}`).join(' '),
    );
    return best.sort((a, b) => a.ChunkIndex - b.ChunkIndex);
  });
}
