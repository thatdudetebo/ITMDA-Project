// Turns text into vectors using the on-device embedding model.
// Deliverable 3 reference: section 6.2, inference layer

import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from '../config';
import { listMaterialChunks, updateChunkEmbedding } from '../db/queries';
import type { MaterialChunk } from '../types/models';
import { stripPath } from '../utils/paths';
import { normalise, toBlob } from './VectorMath';

// The embedding model reads at most 512 tokens. A full 2048-character chunk can exceed that
// (about 4 characters per token), so text is cut to a length that fits with some room to spare.
const EMBEDDING_CONTEXT_TOKENS = 512;
const MAX_EMBED_CHARS = 1800;
// Code, numbers and non-English text pack more tokens per character, so a retry uses less.
const RETRY_EMBED_CHARS = 600;

let context: LlamaContext | null = null;
let loading: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function embeddingModelFile(): File {
  return new File(new Directory(Paths.document, 'models'), EMBEDDING_MODEL);
}

/** True when the embedding model file is installed. */
export function isEmbeddingModelInstalled(): boolean {
  return embeddingModelFile().exists;
}

/** Loads the embedding model into memory. Does nothing if it is loaded or loading. */
export async function loadEmbeddingModel(): Promise<void> {
  if (context) return;
  loading ??= (async () => {
    const file = embeddingModelFile();
    if (!file.exists) {
      throw new Error('The search model is not installed. Install it in Settings.');
    }
    const startTime = Date.now();
    context = await initLlama({
      model: stripPath(file.uri),
      embedding: true,
      n_ctx: EMBEDDING_CONTEXT_TOKENS,
      n_batch: EMBEDDING_CONTEXT_TOKENS,
      n_ubatch: EMBEDDING_CONTEXT_TOKENS,
    });
    console.log(`[embedding] loaded ${file.name} in ${Date.now() - startTime}ms`);
  })().finally(() => {
    loading = null;
  });
  return loading;
}

/** Frees the embedding model so the generation model has the memory. Safe to call any time. */
export async function releaseEmbeddingModel(): Promise<void> {
  if (!context) return;
  const toRelease = context;
  context = null;
  await toRelease.release();
}

/**
 * Runs work that needs the embedding model, one caller at a time, and frees the model after.
 * Two callers can therefore never hold two embedding contexts at once.
 */
export function withEmbeddingModel<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await loadEmbeddingModel();
    try {
      return await work();
    } finally {
      await releaseEmbeddingModel();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Cuts text to MAX_EMBED_CHARS without splitting a surrogate pair. */
function fitToModel(text: string): string {
  let cut = text.trim().slice(0, MAX_EMBED_CHARS);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut;
}

/**
 * Returns a single EMBEDDING_DIMENSIONS-length unit vector for the given text.
 * The model must already be loaded, so call this inside withEmbeddingModel().
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!context) throw new Error('The embedding model is not loaded.');
  const input = fitToModel(text);
  if (!input) throw new Error('There is no text to embed.');

  const { embedding } = await context.embedding(input);
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `The embedding model returned ${embedding.length} values, expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }
  const vector = normalise(Float32Array.from(embedding));
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error('The embedding model returned an invalid vector.');
  }
  return vector;
}

/** True when a chunk has no usable stored vector (never embedded, or from a different model). */
export function needsEmbedding(vector: Uint8Array | null): boolean {
  return (
    vector === null || vector.byteLength !== EMBEDDING_DIMENSIONS * Float32Array.BYTES_PER_ELEMENT
  );
}

/** Embeds one chunk. A token-dense chunk that overflows the model is retried once, shortened. */
async function embedChunkText(text: string): Promise<Float32Array> {
  try {
    return await embed(text);
  } catch (error) {
    if (fitToModel(text).length <= RETRY_EMBED_CHARS) throw error;
    console.warn('[embedding] retrying a chunk with shorter text:', error);
    return embed(text.trim().slice(0, RETRY_EMBED_CHARS));
  }
}

/**
 * Embeds every chunk of a material that has no vector yet and saves it. Returns all the
 * material's chunks with their vectors, plus how many were embedded. A blank chunk gets an
 * all-zero vector (it can never match) so it is not retried on every question. Progress is saved
 * chunk by chunk, so an interrupted run resumes where it stopped. The model must already be
 * loaded, so call this inside withEmbeddingModel().
 */
export async function embedPendingChunks(
  materialId: number,
): Promise<{ chunks: MaterialChunk[]; embedded: number }> {
  const chunks = await listMaterialChunks(materialId);
  const startTime = Date.now();
  let embedded = 0;
  for (const chunk of chunks) {
    if (!needsEmbedding(chunk.VectorEmbedding)) continue;
    const vector = chunk.ExtractedText.trim()
      ? await embedChunkText(chunk.ExtractedText)
      : new Float32Array(EMBEDDING_DIMENSIONS);
    const blob = toBlob(vector);
    await updateChunkEmbedding(chunk.ChunkID, blob);
    chunk.VectorEmbedding = blob;
    embedded++;
  }
  if (embedded > 0) {
    console.log(`[embedding] embedded ${embedded} chunks in ${Date.now() - startTime}ms`);
  }
  return { chunks, embedded };
}

/** Embeds every chunk of a material and writes the vectors back to the database. */
export function embedMaterial(materialId: number): Promise<number> {
  return withEmbeddingModel(async () => (await embedPendingChunks(materialId)).embedded);
}
