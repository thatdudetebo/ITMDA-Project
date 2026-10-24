// Assembles the prompt sent to the model.
// Deliverable 3 reference: section 6.4.2

import { AVAILABLE_CONTEXT_TOKENS, RESERVED_TEMPLATE_TOKENS } from '../config';
import type { RetrievedChunk } from '../types/models';

export type Task = 'summary' | 'flashcards' | 'questions' | 'freeform';

/** Rough token estimate: about 4 characters per token in English. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Builds a prompt from a fixed template plus retrieved context. */
export function buildPrompt(task: Task, chunks: RetrievedChunk[], userText?: string): string {
  // 1. Pick the instruction for this task.
  let instruction: string;
  switch (task) {
    case 'summary':
      instruction = 'Summarise the notes in short bullet points a student can revise from.';
      break;
    case 'flashcards':
      instruction =
        'Write 5 flashcards from the notes. Use exactly this format for each, with nothing else:\nQ: question\nA: answer';
      break;
    case 'questions':
      instruction =
        'Write 5 exam-style questions with model answers based on the notes. Use exactly this format for each, with nothing else:\nQ: question\nA: answer';
      break;
    case 'freeform':
      if (!userText?.trim()) {
        throw new Error('No user prompt supplied in freeform mode.');
      }
      instruction = `Answer this question using only the notes: ${userText.trim()}`;
      break;
    default: {
      const _never: never = task; // compile error here if a new Task is added without a case
      throw new Error(`Unknown task: ${String(_never)}`);
    }
  }

  if (estimateTokens(instruction) > RESERVED_TEMPLATE_TOKENS) {
    console.warn(
      `Instruction ~${estimateTokens(instruction)} tokens, budget is ${RESERVED_TEMPLATE_TOKENS}`,
    );
  }

  // 2. Add chunks one by one until the next one would blow the context budget.
  const included: string[] = [];
  let totalTokens = 0;
  // Free-form questions are part of the instruction, so they come out of the notes budget.
  const budget = Math.max(0, AVAILABLE_CONTEXT_TOKENS - estimateTokens(userText ?? ''));
  for (const chunk of chunks) {
    let text = chunk.ExtractedText;
    let chunkTokens = estimateTokens(text);
    if (included.length === 0 && chunkTokens > budget) {
      // One oversized chunk must not leave the notes empty: keep as much of it as fits.
      text = text.slice(0, budget * 4);
      chunkTokens = estimateTokens(text);
    }
    if (totalTokens + chunkTokens > budget) {
      break;
    }
    totalTokens += chunkTokens;
    included.push(text);
  }
  if (included.length === 0) {
    throw new Error('There is no note text to build a prompt from.');
  }

  // 3. Instruction first, then the notes.
  return `${instruction}\n\nNotes:\n${included.join('\n\n')}`;
}
