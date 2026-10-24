// Decides whether a request runs locally or against the cloud endpoint.
// Deliverable 3 reference: section 6.5

import { CLOUD_ENDPOINT_URL, CLOUD_TIMEOUT_MS, TASK_TEMPERATURE } from '../config';
import type { RetrievedChunk } from '../types/models';
import {
  generate,
  isModelLoaded,
  lastGenerationWasCut,
  loadGenerationModel,
} from './GenerationService';
import { getPreferences } from './PreferencesService';
import { buildPrompt, type Task } from './PromptBuilder';

// Only one generation at a time: a small on-device model cannot run two at once,
// and a double-tap on a button would otherwise try.
let busy = false;
let lastCut = false;

/** True if the text from the last dispatch() was cut off by the output limit (never for the cloud). */
export function lastDispatchWasCut(): boolean {
  return lastCut;
}

/** True while a dispatch() call is running. */
export function isRouterBusy(): boolean {
  return busy;
}

/**
 * Sends the prompt to the cloud endpoint and returns the generated text.
 * Assumed contract (change here only if the backend differs):
 *   POST CLOUD_ENDPOINT_URL  { "prompt": string }  ->  { "text": string }
 */
async function runCloud(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  try {
    const response = await fetch(CLOUD_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Cloud request failed with status ${response.status}`);
    }
    const body: unknown = await response.json();
    const text = (body as { text?: unknown } | null)?.text;
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error('Cloud response had no text');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs the prompt on the on-device model, loading it first if needed. */
async function runLocal(
  prompt: string,
  task: Task,
  onToken?: (t: string) => void,
): Promise<string> {
  if (!isModelLoaded()) {
    await loadGenerationModel();
  }
  const text = await generate(prompt, onToken, TASK_TEMPERATURE[task]);
  lastCut = lastGenerationWasCut();
  return text;
}

/**
 * Retrieval happens before this call, so context is identical on both branches
 * and only the executor differs. A failed cloud call falls back to local.
 */
export async function dispatch(
  task: Task,
  chunks: RetrievedChunk[],
  userText?: string,
  onToken?: (t: string) => void,
): Promise<string> {
  if (busy) {
    throw new Error('A generation is already running. Wait for it to finish.');
  }
  busy = true;
  lastCut = false;
  try {
    const prompt = buildPrompt(task, chunks, userText);

    const { enhancedMode } = await getPreferences();
    if (enhancedMode && CLOUD_ENDPOINT_URL) {
      try {
        const text = await runCloud(prompt);
        onToken?.(text);
        console.log('[dispatch] ran on cloud');
        return text;
      } catch (error) {
        console.warn('[dispatch] cloud failed, falling back to local:', error);
      }
    }

    console.log('[dispatch] running on device');
    return await runLocal(prompt, task, onToken);
  } finally {
    busy = false;
  }
}
