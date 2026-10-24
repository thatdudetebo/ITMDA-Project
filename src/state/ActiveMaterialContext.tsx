// Holds the library and which material the screens are working on.
// The choice survives restarts; a deleted material is never kept as active.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { listMaterials } from '../services/DocumentService';
import type { StudyMaterial } from '../types/models';
import { parseStoredId, resolveActiveId } from '../utils/activeMaterial';

const STORAGE_KEY = 'studybee.activeMaterialId';

interface ActiveMaterialValue {
  /** The selected material, or null when the library is empty or nothing is chosen. */
  material: StudyMaterial | null;
  /** Every material of the current user, newest first. */
  materials: StudyMaterial[];
  /** False until the first load has finished. */
  loaded: boolean;
  /** Selects a material (or clears the selection with null) and remembers it. */
  setActiveMaterial: (id: number | null) => Promise<void>;
  /** Reloads the library after an import, rename or delete. */
  refresh: () => Promise<void>;
}

const ActiveMaterialContext = createContext<ActiveMaterialValue | null>(null);

async function readStoredId(): Promise<number | null> {
  try {
    return parseStoredId(await AsyncStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('[active-material] could not read the saved choice:', error);
    return null;
  }
}

async function writeStoredId(id: number | null): Promise<void> {
  try {
    if (id === null) await AsyncStorage.removeItem(STORAGE_KEY);
    else await AsyncStorage.setItem(STORAGE_KEY, String(id));
  } catch (error) {
    console.warn('[active-material] could not save the choice:', error);
  }
}

export function ActiveMaterialProvider({ children }: { children: ReactNode }) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  // True once the first load has decided the selection. After that, a refresh keeps the current
  // choice (or clears it if that material was deleted) and never jumps to the newest one.
  const decided = useRef(false);
  // The selection lives in a ref as well as state, so two refreshes that run back to back both
  // see the latest choice without waiting for a re-render.
  const activeRef = useRef<number | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const select = useCallback((id: number | null) => {
    activeRef.current = id;
    setActiveId(id);
  }, []);

  const doRefresh = useCallback(async () => {
    const list = await listMaterials();
    const firstLoad = !decided.current;
    const stored = firstLoad ? await readStoredId() : activeRef.current;
    const next = resolveActiveId(stored, list, firstLoad);
    decided.current = true;
    setMaterials(list);
    select(next);
    if (next !== stored) await writeStoredId(next);
    setLoaded(true);
  }, [select]);

  // Refreshes run one after another: the provider and the Home screen both ask at startup.
  const refresh = useCallback(() => {
    const run = queue.current.then(doRefresh, doRefresh);
    queue.current = run.catch(() => undefined);
    return run;
  }, [doRefresh]);

  useEffect(() => {
    refresh().catch((error) => {
      console.warn('[active-material] first load failed:', error);
      setLoaded(true);
    });
  }, [refresh]);

  // Runs after any refresh already in progress, so a refresh cannot overwrite the choice.
  const setActiveMaterial = useCallback(
    (id: number | null) => {
      const task = async () => {
        let list = materials;
        // A material imported a moment ago may not be in state yet.
        if (id !== null && !list.some((m) => m.MaterialID === id)) {
          list = await listMaterials();
          setMaterials(list);
        }
        const next = resolveActiveId(id, list, false);
        decided.current = true;
        select(next);
        await writeStoredId(next);
      };
      const run = queue.current.then(task, task);
      queue.current = run.catch(() => undefined);
      return run;
    },
    [materials, select],
  );

  const value = useMemo<ActiveMaterialValue>(
    () => ({
      material: materials.find((m) => m.MaterialID === activeId) ?? null,
      materials,
      loaded,
      setActiveMaterial,
      refresh,
    }),
    [materials, activeId, loaded, setActiveMaterial, refresh],
  );

  return <ActiveMaterialContext.Provider value={value}>{children}</ActiveMaterialContext.Provider>;
}

export function useActiveMaterial(): ActiveMaterialValue {
  const value = useContext(ActiveMaterialContext);
  if (!value) throw new Error('useActiveMaterial must be used inside ActiveMaterialProvider.');
  return value;
}
