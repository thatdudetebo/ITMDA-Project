// Values fixed in Deliverable 3. Change here, not inline.

export const CHUNK_SIZE_TOKENS = 512; // section 6.4.1
export const CHUNK_OVERLAP_TOKENS = 50; // section 6.4.1
export const TOP_K = 5; // section 6.4.2

export const CONTEXT_WINDOW_TOKENS = 4096; // section 6.4.2
export const RESERVED_OUTPUT_TOKENS = 600;
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
