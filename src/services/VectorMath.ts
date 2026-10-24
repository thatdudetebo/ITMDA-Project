// Vector helpers shared by embedding and retrieval.
// Pure functions with no React Native imports, so they can be tested off-device.
// Deliverable 3 reference: section 6.4.2

/** Scales a vector to unit length. A zero vector is returned unchanged. */
export function normalise(vector: Float32Array): Float32Array {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

/** Cosine similarity between two equal-length vectors. Returns 0 if either has no length. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} and ${b.length}.`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Copies a vector's bytes for storage as a BLOB. Always a fresh buffer, never a shared view. */
export function toBlob(vector: Float32Array): Uint8Array {
  return new Uint8Array(
    vector.buffer.slice(vector.byteOffset, vector.byteOffset + vector.byteLength),
  );
}

/**
 * Reads a stored BLOB back into a vector. SQLite can hand back a view that starts at an offset
 * that is not a multiple of 4, so this copies into a fresh aligned buffer first.
 */
export function fromBlob(blob: Uint8Array): Float32Array {
  if (blob.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error(
      `Stored vector has ${blob.byteLength} bytes, which is not a whole number of floats.`,
    );
  }
  return new Float32Array(blob.slice().buffer);
}
