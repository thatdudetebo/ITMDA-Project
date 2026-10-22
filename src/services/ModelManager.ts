// Imports and locates the GGUF model files.
// Deliverable 3 reference: section 6.1 and 6.2

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import type { DownloadPauseState } from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';

import { EMBEDDING_MODEL, GENERATION_MODEL } from '../config';
import { getPreferences } from './PreferencesService';

export type ModelId = 'smollm2-135m' | 'llama-3.2-1b' | 'bge-small-en-v1.5-q8';
export type ModelRole = 'generation' | 'embedding';
export type ModelDownloadState = 'available' | 'downloading' | 'paused' | 'installed';

export interface ModelDefinition {
  id: ModelId;
  name: string;
  fileName: string;
  role: ModelRole;
  repository: string;
  downloadUrl: string;
}

export interface ModelStatus {
  name: string;
  present: boolean;
  localPath: string | null;
  sizeBytes: number | null;
}

const MODEL_DIRECTORY = `${FileSystem.documentDirectory ?? ''}models/`;
const REQUIRED_MODELS = [GENERATION_MODEL, EMBEDDING_MODEL];
const DOWNLOAD_STATE_KEY = 'studybee.model-download.';
const MODEL_CATALOG: ModelDefinition[] = [
  {
    id: 'smollm2-135m',
    name: 'SmolLM2 135M Instruct (Development)',
    fileName: 'SmolLM2-135M-Instruct-Q4_K_M.gguf',
    role: 'generation',
    repository: 'bartowski/SmolLM2-135M-Instruct-GGUF',
    downloadUrl:
      'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B Instruct',
    fileName: GENERATION_MODEL,
    role: 'generation',
    repository: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    downloadUrl: `https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/${GENERATION_MODEL}`,
  },
  {
    id: 'bge-small-en-v1.5-q8',
    name: 'BGE Small English v1.5 Q8_0',
    fileName: EMBEDDING_MODEL,
    role: 'embedding',
    repository: 'CompendiumLabs/bge-small-en-v1.5-gguf',
    downloadUrl: `https://huggingface.co/CompendiumLabs/bge-small-en-v1.5-gguf/resolve/main/${EMBEDDING_MODEL}`,
  },
];
const activeDownloads = new Map<ModelId, FileSystem.DownloadResumable>();

function getModel(modelId: ModelId): ModelDefinition {
  const model = MODEL_CATALOG.find((entry) => entry.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  return model;
}

function getModelPath(fileName: string): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }
  return `${MODEL_DIRECTORY}${fileName}`;
}

async function ensureModelDirectory(): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }
  const info = await FileSystem.getInfoAsync(MODEL_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIRECTORY, { intermediates: true });
  }
}

async function ensureDownloadNetwork(): Promise<void> {
  const preferences = await getPreferences();
  const state = await Network.getNetworkStateAsync();
  if (state.isConnected === false || state.isInternetReachable === false) {
    throw new Error('No internet connection is available.');
  }
  if (preferences.wifiOnlyDownloads && state.type !== Network.NetworkStateType.WIFI) {
    throw new Error('Connect to Wi-Fi or turn off Wi-Fi-only downloads in Settings.');
  }
}

function getResumeKey(modelId: ModelId): string {
  return `${DOWNLOAD_STATE_KEY}${modelId}`;
}

// Invalid or mismatched state is non-resumable; the caller handles cleanup.
function parseResumeState(
  storedState: string | null,
  url: string,
  fileUri: string,
): DownloadPauseState | null {
  if (!storedState) return null;

  try {
    const parsed: unknown = JSON.parse(storedState);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const state = parsed as DownloadPauseState;
    if (state.url !== url || state.fileUri !== fileUri) return null;
    return state;
  } catch {
    return null;
  }
}

/** Returns the supported Hugging Face GGUF files that can be downloaded in the app. */
export function getAvailableModels(): ModelDefinition[] {
  return MODEL_CATALOG.map((model) => ({ ...model }));
}

/** Returns a model's install/download state for Settings controls. */
export async function getDownloadState(modelId: ModelId): Promise<ModelDownloadState> {
  const model = getModel(modelId);
  if (activeDownloads.has(modelId)) return 'downloading';
  if (await AsyncStorage.getItem(getResumeKey(modelId))) return 'paused';

  const modelInfo = await FileSystem.getInfoAsync(getModelPath(model.fileName));
  if (modelInfo.exists && !modelInfo.isDirectory) return 'installed';
  return 'available';
}

/** Lists expected models and any other installed GGUF files for a model status view. */
export async function getStatus(): Promise<ModelStatus[]> {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }

  const requiredStatuses = await Promise.all(
    REQUIRED_MODELS.map(async (name) => {
      const localPath = `${MODEL_DIRECTORY}${name}`;
      const info = await FileSystem.getInfoAsync(localPath);
      const present = info.exists && !info.isDirectory;
      return {
        name,
        present,
        localPath: present ? localPath : null,
        sizeBytes: present ? (info.size ?? null) : null,
      };
    }),
  );

  const directoryInfo = await FileSystem.getInfoAsync(MODEL_DIRECTORY);
  if (!directoryInfo.exists) return requiredStatuses;

  const requiredNames = new Set(REQUIRED_MODELS);
  const installedNames = await FileSystem.readDirectoryAsync(MODEL_DIRECTORY);
  const additionalStatuses = await Promise.all(
    installedNames
      .filter((name) => name.toLowerCase().endsWith('.gguf') && !requiredNames.has(name))
      .map(async (name) => {
        const localPath = `${MODEL_DIRECTORY}${name}`;
        const info = await FileSystem.getInfoAsync(localPath);
        const present = info.exists && !info.isDirectory;
        return {
          name,
          present,
          localPath: present ? localPath : null,
          sizeBytes: present ? (info.size ?? null) : null,
        };
      }),
  );
  return [...requiredStatuses, ...additionalStatuses];
}

/** Opens the system picker and copies a GGUF into app storage; returns null if canceled. */
export async function importModel(): Promise<string | null> {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const selectedModel = result.assets[0];
  if (!selectedModel.name.toLowerCase().endsWith('.gguf')) {
    throw new Error('Choose a GGUF model file.');
  }

  const directoryInfo = await FileSystem.getInfoAsync(MODEL_DIRECTORY);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIRECTORY, { intermediates: true });
  }

  const destination = `${MODEL_DIRECTORY}${selectedModel.name}`;
  await FileSystem.copyAsync({ from: selectedModel.uri, to: destination });
  return destination;
}

/** Downloads a catalog model, resuming a previously paused transfer when available. */
export async function downloadModel(
  modelId: ModelId,
  onProgress?: (fraction: number) => void,
): Promise<string | null> {
  if (activeDownloads.has(modelId)) {
    throw new Error('This model is already downloading.');
  }

  const model = getModel(modelId);
  await ensureDownloadNetwork();
  await ensureModelDirectory();

  const destination = getModelPath(model.fileName);
  const partialPath = `${destination}.download`;
  const resumeKey = getResumeKey(modelId);
  const storedState = await AsyncStorage.getItem(resumeKey);
  const resumeState = parseResumeState(storedState, model.downloadUrl, partialPath);

  if (storedState && !resumeState) {
    await AsyncStorage.removeItem(resumeKey);
    const partialInfo = await FileSystem.getInfoAsync(partialPath);
    if (partialInfo.exists) await FileSystem.deleteAsync(partialPath);
  }

  const task = FileSystem.createDownloadResumable(
    model.downloadUrl,
    partialPath,
    resumeState?.options,
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
    resumeState?.resumeData,
  );
  activeDownloads.set(modelId, task);

  try {
    const result = await task.downloadAsync();
    if (!result) return null;
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Model download failed with HTTP ${result.status}.`);
    }

    const partialInfo = await FileSystem.getInfoAsync(partialPath);
    if (!partialInfo.exists || partialInfo.isDirectory || !partialInfo.size) {
      throw new Error('The downloaded model file is empty or unavailable.');
    }

    const destinationInfo = await FileSystem.getInfoAsync(destination);
    if (destinationInfo.exists) await FileSystem.deleteAsync(destination);
    await FileSystem.moveAsync({ from: partialPath, to: destination });
    await AsyncStorage.removeItem(resumeKey);
    onProgress?.(1);
    return destination;
  } finally {
    if (activeDownloads.get(modelId) === task) activeDownloads.delete(modelId);
  }
}

/** Pauses an active transfer and saves its resume data for a later app session. */
export async function pauseDownloadModel(modelId: ModelId): Promise<boolean> {
  const task = activeDownloads.get(modelId);
  if (!task) return false;

  const state = await task.pauseAsync();
  await AsyncStorage.setItem(getResumeKey(modelId), JSON.stringify(state));
  return true;
}

/** Cancels a transfer and removes its partial file and saved resume state. */
export async function cancelDownloadModel(modelId: ModelId): Promise<void> {
  const task = activeDownloads.get(modelId);
  if (task) {
    await task.cancelAsync();
    activeDownloads.delete(modelId);
  }

  await AsyncStorage.removeItem(getResumeKey(modelId));
  const partialPath = `${getModelPath(getModel(modelId).fileName)}.download`;
  const partialInfo = await FileSystem.getInfoAsync(partialPath);
  if (partialInfo.exists) await FileSystem.deleteAsync(partialPath);
}

/** Removes a downloaded catalog model without affecting other model files. */
export async function deleteModel(modelId: ModelId): Promise<void> {
  if (activeDownloads.has(modelId)) {
    throw new Error('Pause or cancel the model download before deleting it.');
  }

  const model = getModel(modelId);
  const modelPath = getModelPath(model.fileName);
  const info = await FileSystem.getInfoAsync(modelPath);
  if (info.exists) await FileSystem.deleteAsync(modelPath);

  await AsyncStorage.removeItem(getResumeKey(modelId));
  const partialPath = `${modelPath}.download`;
  const partialInfo = await FileSystem.getInfoAsync(partialPath);
  if (partialInfo.exists) await FileSystem.deleteAsync(partialPath);
}
