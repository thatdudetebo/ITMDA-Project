// Runs the local model to produce text.
// Deliverable 3 reference: section 6.2, inference layer

import { Directory, File, Paths } from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { CONTEXT_WINDOW_TOKENS, GENERATION_MODEL, RESERVED_OUTPUT_TOKENS } from '../config';
import { stripPath } from '../utils/paths';
import { getAvailableModels } from './ModelManager';

let context: LlamaContext | null = null;
let loading: Promise<void> | null = null;
let generating = false;

/** Same folder ModelManager downloads and imports models into. */
function modelsDirectory(): Directory {
  return new Directory(Paths.document, 'models');
}

/** Returns the installed generation model file, preferring GENERATION_MODEL. */
function resolveGenerationModel(): File {
  const candidates = [
    GENERATION_MODEL,
    ...getAvailableModels()
      .filter((m) => m.role === 'generation' && m.fileName !== GENERATION_MODEL)
      .map((m) => m.fileName),
  ];
  for (const name of candidates) {
    const file = new File(modelsDirectory(), name);
    if (file.exists) return file;
  }
  throw new Error('No AI model installed. Import or download one in Settings.');
}

/** True when at least one generation model file is installed. */
export function isGenerationModelInstalled(): boolean {
  try {
    resolveGenerationModel();
    return true;
  } catch {
    return false;
  }
}

/** Loads the generation model into memory. Does nothing if one is loaded or loading. */
export async function loadGenerationModel(): Promise<void> {
  if (context) {
    console.log('[generation] model already loaded');
    return;
  }
  // Concurrent callers share one load so the model is never initialised twice.
  loading ??= (async () => {
    const file = resolveGenerationModel();
    const startTime = Date.now();
    context = await initLlama({ model: stripPath(file.uri), n_ctx: CONTEXT_WINDOW_TOKENS });
    console.log(
      `[generation] loaded ${file.name} (context ${context.id}) in ${Date.now() - startTime}ms`,
    );
  })().finally(() => {
    loading = null;
  });
  return loading;
}

/** True when a model is loaded and generate() can be called. */
export function isModelLoaded(): boolean {
  return context !== null;
}

/** Generates a completion locally, streaming tokens to onToken if supplied. */
export async function generate(prompt: string, onToken?: (t: string) => void): Promise<string> {
  if (!context) {
    throw new Error('No model currently loaded.');
  }
  const startTime = Date.now();
  generating = true;
  let result;
  try {
    result = await context.completion(
      {
        messages: [{ role: 'user', content: prompt }],
        n_predict: RESERVED_OUTPUT_TOKENS,
      },
      (data) => {
        // data.token is each piece of text output by the model
        onToken?.(data.token);
      },
    );
  } finally {
    generating = false;
  }
  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[generation] ${seconds}s, prompt tokens ${result.tokens_evaluated}, output tokens ${result.tokens_predicted}`,
  );

  return result.text;
}

/** Releases the model. Does nothing if none is loaded; refuses while generating. */
export async function unloadModel(): Promise<void> {
  if (generating) {
    throw new Error('Cannot unload the model while it is generating.');
  }
  if (!context) return;
  const toRelease = context;
  context = null;
  await toRelease.release();
}
