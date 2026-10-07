// Decides whether a request runs locally or against the cloud endpoint.
// Deliverable 3 reference: section 6.5

import type { Task } from './PromptBuilder';
import type { RetrievedChunk } from '../types/models';

/**
 * Retrieval happens before this call, so context is identical on both branches
 * and only the executor differs. A failed cloud call falls back to local.
 */
export async function dispatch(
  task: Task,
  chunks: RetrievedChunk[],
  userText?: string,
): Promise<string> {
  throw new Error('Not implemented');
}
