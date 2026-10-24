// Values fixed in Deliverable 3. Change here, not inline.

export const CHUNK_SIZE_TOKENS = 512; // section 6.4.1
export const CHUNK_OVERLAP_TOKENS = 50; // section 6.4.1
export const TOP_K = 5; // section 6.4.2

export const CONTEXT_WINDOW_TOKENS = 4096; // section 6.4.2
export const RESERVED_OUTPUT_TOKENS = 600;
// Creativity of the on-device model, per task. Flashcards and Q&A must follow the Q:/A: format, and a
// hot small model strays from it (it once copied the template word instead of writing questions),
// so they run coldest. Summaries and answers can afford a little more variety.
export const TASK_TEMPERATURE = {
  summary: 0.5,
  freeform: 0.4,
  flashcards: 0.3,
  questions: 0.3,
} as const;
export const DEFAULT_TEMPERATURE = 0.4;

// Flashcards and Q&A: ask for 5, accept at most 5 (the model may run on and be cut off mid-answer)
// and refuse a result with fewer than 2 usable pairs (one pair means the format was not followed).
export const MAX_QA_PAIRS = 5;
export const MIN_QA_PAIRS = 2;
export const RESERVED_TEMPLATE_TOKENS = 150;
export const AVAILABLE_CONTEXT_TOKENS =
  CONTEXT_WINDOW_TOKENS - RESERVED_OUTPUT_TOKENS - RESERVED_TEMPLATE_TOKENS;

export const GENERATION_MODEL = 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';
export const EMBEDDING_MODEL = 'bge-small-en-v1.5-q8_0.gguf';
export const EMBEDDING_DIMENSIONS = 384;

// Cloud ("enhanced mode") endpoint, section 6.5. Leave empty until a backend exists:
// an empty URL means dispatch() always runs on-device.
export const CLOUD_ENDPOINT_URL = '';
export const CLOUD_TIMEOUT_MS = 30_000;
