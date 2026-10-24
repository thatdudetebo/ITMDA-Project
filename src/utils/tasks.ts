// Names and destinations for each kind of generated result, shared by Home and History.

import type { GenerationHistoryTask } from '../types/models';

/** Short label shown on badges and history rows. */
export const TASK_BADGE: Record<GenerationHistoryTask, string> = {
  summary: 'Summary',
  flashcards: 'Flashcards',
  questions: 'Q&A',
  freeform: 'Question asked',
};

/** The screen that shows each kind of result. */
export const SCREEN_FOR_TASK: Record<
  GenerationHistoryTask,
  'Summary' | 'Flashcards' | 'Questions'
> = {
  summary: 'Summary',
  flashcards: 'Flashcards',
  questions: 'Questions',
  freeform: 'Questions',
};
