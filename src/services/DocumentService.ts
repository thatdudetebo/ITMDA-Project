// Imports a document, extracts its text, and records it in StudyMaterial.
// Deliverable 3 reference: section 6.4.1

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  extractText as extractPdfText,
  isAvailable as isPdfExtractionAvailable,
} from 'expo-pdf-text-extract';

import {
  createStudyMaterial,
  deleteStudyMaterial,
  getOrCreateUserProfile,
  listStudyMaterials,
} from '../db/queries';
import type { StudyMaterial } from '../types/models';
import { chunkAndStore } from './ChunkingService';

const MATERIALS_DIRECTORY = `${FileSystem.documentDirectory ?? ''}materials/`;

async function ensureMaterialsDirectory(): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('App document storage is unavailable.');
  }

  const info = await FileSystem.getInfoAsync(MATERIALS_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MATERIALS_DIRECTORY, { intermediates: true });
  }
}

function createStoredFileName(fileName: string): string {
  const extension = fileName.match(/(\.[^.]+)$/)?.[1] ?? '.pdf';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
}

async function removeStoredDocument(filePath: string): Promise<void> {
  if (!filePath.startsWith(MATERIALS_DIRECTORY)) return;

  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists && !info.isDirectory) {
    await FileSystem.deleteAsync(filePath);
  }
}

/** Opens the picker, stores a PDF permanently, extracts its text, and saves its chunks. */
export async function importDocument(): Promise<StudyMaterial> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    throw new Error('Document import was cancelled.');
  }

  const file = result.assets[0];
  if (!file) {
    throw new Error('No document was selected.');
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a PDF document.');
  }

  const text = await extractText(file.uri);
  await ensureMaterialsDirectory();

  const storedPath = `${MATERIALS_DIRECTORY}${createStoredFileName(file.name)}`;
  await FileSystem.copyAsync({ from: file.uri, to: storedPath });

  let material: StudyMaterial | null = null;
  try {
    const user = await getOrCreateUserProfile();
    material = await createStudyMaterial({
      UserID: user.UserID,
      ModuleCode: null,
      FileName: file.name,
      FilePath: storedPath,
    });
    await chunkAndStore(material.MaterialID, text);
    return material;
  } catch (error) {
    if (material) await deleteStudyMaterial(material.MaterialID);
    await removeStoredDocument(storedPath);
    throw error;
  }
}

/** Extracts plain text from a PDF at the given local URI. */
export async function extractText(fileUri: string): Promise<string> {
  if (!isPdfExtractionAvailable()) {
    throw new Error(
      'PDF text extraction is unavailable. Use a development build with the PDF extractor installed.',
    );
  }

  const text = (await extractPdfText(fileUri)).trim();
  if (!text) {
    throw new Error('No text could be extracted from this PDF. It may be scanned or empty.');
  }
  return text;
}

export async function listMaterials(): Promise<StudyMaterial[]> {
  const user = await getOrCreateUserProfile();
  return listStudyMaterials(user.UserID);
}

export async function deleteMaterial(materialId: number): Promise<void> {
  if (!Number.isInteger(materialId) || materialId <= 0) {
    throw new Error('A valid material ID is required.');
  }
  const material = (await listMaterials()).find((item) => item.MaterialID === materialId);
  await deleteStudyMaterial(materialId);
  if (material) await removeStoredDocument(material.FilePath);
}
