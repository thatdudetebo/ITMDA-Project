// Runs one generation end to end: pick context, generate, shape the result, save it.
// Screens call generateForMaterial() and nothing lower in the inference layer.
// Deliverable 3 reference: section 6.2, inference layer

import {
  createFlashcards,
  createGenerationHistory,
  createRevisionDeck,
  deleteRevisionDeck,
  listMaterialChunks,
} from '../db/queries';
import type {
  GenerationHistoryItem,
  GenerationHistoryResult,
  RetrievedChunk,
} from '../types/models';
import { sampleChunks } from './ChunkSampler';
import { dispatch, isRouterBusy } from './InferenceRouter';
import { parseQAPairs } from './OutputParser';
import type { Task } from './PromptBuilder';
import { retrieve } from './RetrievalService';

/** Label saved as the history prompt when the user typed nothing. */
export const TASK_LABEL: Record<Task, string> = {
  summary: 'Summary',
  flashcards: 'Flashcards',
  questions: 'Questions and answers',
  freeform: 'Free-form question',
};

// Retrieval embeds with its own model, so it must not overlap another generation either.
let running = false;

/** True while generateForMaterial() or the router is working, including retrieval and saving. */
export function isPipelineBusy(): boolean {
  return running || isRouterBusy();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date and time for a new deck's name, e.g. "2026-10-24 11:43:07". */
function deckTimestamp(now: Date): string {
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

/** Chooses the notes to send: a search for free-form questions, spread-out samples otherwise. */
async function pickContext(
  materialId: number,
  task: Task,
  question: string | undefined,
): Promise<RetrievedChunk[]> {
  if (task === 'freeform' && question) {
    try {
      const found = await retrieve(question, materialId);
      if (found.length > 0) return found;
      console.warn('[pipeline] retrieval found nothing, using sampled chunks');
    } catch (error) {
      // Sampled notes still give a usable answer, so a retrieval failure is not fatal.
      console.warn('[pipeline] retrieval failed, using sampled chunks:', error);
    }
  }
  const chunks = await listMaterialChunks(materialId);
  return sampleChunks(chunks.filter((chunk) => chunk.ExtractedText.trim() !== ''));
}

/** Turns the model's raw text into the result saved in history. Throws if it cannot be read. */
function shapeResult(task: Task, text: string): GenerationHistoryResult {
  if (task === 'summary' || task === 'freeform') {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('The AI returned no text. Please try again.');
    return { kind: 'text', text: trimmed };
  }

  const pairs = parseQAPairs(text);
  if (pairs.length === 0) throw new Error("Couldn't read the AI's answer. Please try again.");
  if (task === 'questions') return { kind: 'question-answer', items: pairs };
  return {
    kind: 'flashcards',
    deckName: `Flashcards - ${deckTimestamp(new Date())}`,
    cards: pairs,
  };
}

/** Saves a history item, creating the deck and cards first when the result is flashcards. */
async function saveResult(
  materialId: number,
  task: Task,
  prompt: string,
  result: GenerationHistoryResult,
): Promise<GenerationHistoryItem> {
  let deckId: number | null = null;
  try {
    if (result.kind === 'flashcards') {
      const deck = await createRevisionDeck(materialId, result.deckName);
      deckId = deck.DeckID;
      await createFlashcards(
        result.cards.map((card) => ({
          DeckID: deck.DeckID,
          Question: card.question,
          Answer: card.answer,
        })),
      );
    }
    return await createGenerationHistory({
      MaterialID: materialId,
      TaskType: task,
      Prompt: prompt,
      Result: result,
    });
  } catch (error) {
    // Do not leave an empty or unrecorded deck behind, or a retry would add a second one.
    if (deckId !== null) {
      await deleteRevisionDeck(deckId).catch((cleanupError) =>
        console.warn('[pipeline] could not remove deck after a failed save:', cleanupError),
      );
    }
    throw error;
  }
}

/**
 * Generates a summary, flashcards, Q&A or free-form answer for one material and saves it to
 * history. Flashcards also create a deck. Throws a readable Error for the screen to show.
 */
export async function generateForMaterial(
  materialId: number,
  task: Task,
  userText?: string,
  onToken?: (t: string) => void,
): Promise<GenerationHistoryItem> {
  if (isPipelineBusy()) {
    throw new Error('A generation is already running. Wait for it to finish.');
  }
  // Only free-form questions use the typed text; other tasks work on the whole material.
  const question = task === 'freeform' ? userText?.trim() : undefined;
  if (task === 'freeform' && !question) {
    throw new Error('Type a question first.');
  }

  running = true;
  try {
    const chunks = await pickContext(materialId, task, question);
    if (chunks.length === 0) {
      throw new Error('This material has no readable text.');
    }

    const text = await dispatch(task, chunks, question, onToken);
    const result = shapeResult(task, text);
    return await saveResult(materialId, task, question || TASK_LABEL[task], result);
  } finally {
    running = false;
  }
}
