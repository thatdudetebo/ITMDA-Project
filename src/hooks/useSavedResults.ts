// Loads saved results for a screen: the newest one for the active material, or the one a
// history row opened. Drawer screens stay mounted, so a result opened from History is shown
// only while that screen is focused and the next visit shows the newest again.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getGenerationHistoryItem, listGenerationHistory } from '../db/queries';
import { useActiveMaterial } from '../state/ActiveMaterialContext';
import type { GenerationHistoryItem, GenerationHistoryTask } from '../types/models';

export interface SavedResults {
  /** The result to show: a just-generated or opened one, else the newest saved. */
  item: GenerationHistoryItem | null;
  /** True when `item` was opened from History or just generated, not simply the newest. */
  pinned: boolean;
  loading: boolean;
  /** Stops showing an opened or just-generated result and falls back to the newest saved one. */
  hide: () => void;
  /** Shows a result straight away (for example one that was just generated). */
  show: (item: GenerationHistoryItem) => void;
  /** Reloads the newest saved result. */
  reload: () => Promise<void>;
}

/**
 * @param task which kind of result this screen shows
 * @param historyId the history row to open, from the route; cleared with `clearParam` once read
 */
export function useSavedResults(
  task: GenerationHistoryTask,
  historyId: number | undefined,
  clearParam: () => void,
): SavedResults {
  const { material } = useActiveMaterial();
  const materialId = material?.MaterialID ?? null;
  const [latest, setLatest] = useState<GenerationHistoryItem | null>(null);
  const [pinned, setPinned] = useState<GenerationHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  // The newest reload wins, so a slow load for a previous material cannot overwrite it.
  const loadId = useRef(0);
  // Refs, so clearing the route parameter (which re-renders) does not restart the focus effect,
  // whose cleanup would drop the result that was just opened.
  const clearRef = useRef(clearParam);
  clearRef.current = clearParam;
  const historyIdRef = useRef(historyId);
  historyIdRef.current = historyId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const id = ++loadId.current;
    const current = () => mounted.current && id === loadId.current;
    if (materialId === null) {
      if (current()) setLatest(null);
      return;
    }
    try {
      const [row] = await listGenerationHistory({ materialId, taskType: task, limit: 1 });
      const item = row ? await getGenerationHistoryItem(row.HistoryID) : null;
      if (current()) setLatest(item);
    } catch (error) {
      console.warn(`[${task}] could not load the saved result:`, error);
      if (current()) setLatest(null);
    }
  }, [materialId, task]);

  // A different material means a different set of results.
  useEffect(() => {
    setPinned(null);
    setLatest(null);
  }, [materialId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const openedId = historyIdRef.current;
        if (openedId !== undefined) {
          try {
            const opened = await getGenerationHistoryItem(openedId);
            clearRef.current();
            // Only the instance for this kind of result pins it; the Questions screen runs two.
            if (!cancelled && opened && opened.TaskType === task) setPinned(opened);
          } catch (error) {
            console.warn(`[${task}] could not open history item ${openedId}:`, error);
            clearRef.current();
          }
        }
        await reload();
        if (!cancelled && mounted.current) setLoading(false);
      })();
      return () => {
        cancelled = true;
        // Leaving the screen drops an opened result, so the next visit shows the newest.
        setPinned(null);
      };
    }, [task, reload]),
  );

  const show = useCallback((item: GenerationHistoryItem) => setPinned(item), []);
  const hide = useCallback(() => setPinned(null), []);

  const isPinned = pinned !== null && pinned.MaterialID === materialId;
  return { item: isPinned ? pinned : latest, pinned: isPinned, loading, show, hide, reload };
}
