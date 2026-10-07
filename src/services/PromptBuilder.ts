// Assembles the prompt sent to the model.
// Deliverable 3 reference: section 6.4.2

import type { RetrievedChunk } from '../types/models';

export type Task = 'summary' | 'flashcards' | 'questions' | 'freeform';

/** Builds a prompt from a fixed template plus retrieved context. */
export function buildPrompt(task: Task, chunks: RetrievedChunk[], userText?: string): string {
  throw new Error('Not implemented');
}
