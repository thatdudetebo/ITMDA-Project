// Splits extracted text into overlapping chunks for retrieval.
// Deliverable 3 reference: section 6.4.1

import { CHUNK_OVERLAP_TOKENS, CHUNK_SIZE_TOKENS } from '../config';
import { createMaterialChunks } from '../db/queries';

// Same 4 characters per token estimate that PromptBuilder uses for its budget.
const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_CHARS = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
const CHUNK_OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;
// A cut earlier than this fraction of the window would make chunks needlessly small.
const MIN_CUT_FRACTION = 0.5;

/** Collapses runs of spaces and blank lines so chunk sizes reflect real content. */
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** Last position in [from, to) just after a sentence end or newline, or -1. */
function findSentenceCut(text: string, from: number, to: number): number {
  for (let i = to - 1; i >= from; i--) {
    const char = text[i];
    if (char === '\n') return i + 1;
    if ((char === '.' || char === '!' || char === '?') && /\s/.test(text[i + 1] ?? ' ')) {
      return i + 1;
    }
  }
  return -1;
}

/** Last position in [from, to) just after whitespace, or -1. */
function findWhitespaceCut(text: string, from: number, to: number): number {
  for (let i = to - 1; i >= from; i--) {
    if (/\s/.test(text[i])) return i + 1;
  }
  return -1;
}

/**
 * Splits text into chunks of at most CHUNK_SIZE_TOKENS * 4 characters, each starting
 * CHUNK_OVERLAP_TOKENS * 4 characters before the previous one ended. Cuts prefer a sentence
 * end, then whitespace, and only split inside a word when there is nothing else to cut at.
 */
export function chunkText(text: string): string[] {
  const clean = normaliseWhitespace(text);
  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE_CHARS, clean.length);
    if (end < clean.length) {
      const earliest = start + Math.floor(CHUNK_SIZE_CHARS * MIN_CUT_FRACTION);
      const cut = findSentenceCut(clean, earliest, end);
      if (cut > 0) {
        end = cut;
      } else {
        const wordCut = findWhitespaceCut(clean, earliest, end);
        if (wordCut > 0) end = wordCut;
      }
      // A hard cut must not split a surrogate pair (emoji and other astral characters).
      if (isHighSurrogate(clean.charCodeAt(end - 1))) end--;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;

    // Step back for the overlap, but always move forward and never begin mid-word.
    const overlapStart = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
    let next = overlapStart;
    while (next < end && !/\s/.test(clean[next - 1])) next++;
    // Text with no spaces (CJK, long URLs) has no word to snap to: keep the overlap instead.
    if (next >= end) next = overlapStart;
    if (isLowSurrogate(clean.charCodeAt(next))) next++;
    start = next;
  }

  return chunks;
}

/** Chunks a document and writes the rows to MaterialChunk. Returns how many were stored. */
export async function chunkAndStore(materialId: number, text: string): Promise<number> {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error('This document has no readable text.');
  }
  await createMaterialChunks(
    chunks.map((ExtractedText, ChunkIndex) => ({
      MaterialID: materialId,
      ChunkIndex,
      ExtractedText,
    })),
  );
  return chunks.length;
}
