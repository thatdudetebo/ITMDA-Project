// Runs one kind of generation for the active material and reports progress to a screen.
// Wraps generateForMaterial() so every screen shows errors and progress the same way.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isGenerationModelInstalled } from '../services/GenerationService';
import { generateForMaterial, isPipelineBusy } from '../services/GenerationPipeline';
import type { Task } from '../services/PromptBuilder';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import type { GenerationHistoryItem } from '../types/models';
import { toMessage } from '../utils/errors';

/** How often streamed text is pushed to the screen. Updating on every token would stall the UI. */
const STREAM_FLUSH_MS = 250;

/** `preparing` is everything before the first word appears: searching notes, loading the model. */
export type GenerationStatus = 'idle' | 'preparing' | 'generating';

export interface UseGeneration {
  /** Starts a generation. Resolves to the saved item, or null if it failed (see `error`). */
  run: (userText?: string) => Promise<GenerationHistoryItem | null>;
  status: GenerationStatus;
  /** Text streamed so far in the current run. Cleared when the run ends. */
  streamed: string;
  error: string | null;
  clearError: () => void;
  busy: boolean;
}

export function useGeneration(task: Task): UseGeneration {
  const { material } = useActiveMaterial();
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [streamed, setStreamed] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const buffer = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const stopFlushing = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const run = useCallback(
    async (userText?: string): Promise<GenerationHistoryItem | null> => {
      setError(null);
      if (!material) {
        setError('Choose a material on the Home screen first.');
        return null;
      }
      if (!isGenerationModelInstalled()) {
        setError('No AI model is installed. Install one in Settings.');
        return null;
      }
      if (isPipelineBusy()) {
        setError('Another generation is still running. Wait for it to finish.');
        return null;
      }

      buffer.current = '';
      setStreamed('');
      setStatus('preparing');
      try {
        const item = await generateForMaterial(material.MaterialID, task, userText, (token) => {
          buffer.current += token;
          if (!mounted.current) return;
          setStatus('generating');
          // Collect tokens and show them a few times a second.
          timer.current ??= setTimeout(() => {
            timer.current = null;
            if (mounted.current) setStreamed(buffer.current);
          }, STREAM_FLUSH_MS);
        });
        return item;
      } catch (e) {
        // A half-written answer next to an error message would be confusing, so drop it.
        if (mounted.current) setError(toMessage(e));
        return null;
      } finally {
        stopFlushing();
        buffer.current = '';
        if (mounted.current) {
          setStreamed('');
          setStatus('idle');
        }
      }
    },
    [material, task],
  );

  const clearError = useCallback(() => setError(null), []);

  // An old error (for example "No AI model is installed") should not outlive a visit to Settings.
  useFocusEffect(clearError);

  return { run, status, streamed, error, clearError, busy: status !== 'idle' };
}
