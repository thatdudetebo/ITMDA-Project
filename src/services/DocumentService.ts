// Imports a document, extracts its text, and records it in StudyMaterial.
// Deliverable 3 reference: section 6.4.1

import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import {
  extractText as extractPdfText,
  isAvailable as isPdfExtractorAvailable,
} from 'expo-pdf-text-extract';

import {
  createStudyMaterial,
  deleteStudyMaterial,
  getOrCreateUserProfile,
  listStudyMaterials,
} from '../db/queries';
import type { StudyMaterial } from '../types/models';
import { toMessage } from '../utils/errors';
import { toSafeFileStem } from '../utils/paths';
import { chunkAndStore } from './ChunkingService';

/** A PDF the user picked but has not yet named or imported. */
export interface PickedDocument {
  uri: string;
  name: string;
  size: number | null;
}

/** Steps reported while a document is imported, in the order they happen. */
export type ImportStage = 'copying' | 'extracting' | 'saving' | 'chunking';

export const MAX_TITLE_LENGTH = 80;

/** Folder inside app storage that holds a permanent copy of every imported PDF. */
function materialsDirectory(): Directory {
  return new Directory(Paths.document, 'materials');
}

/** Removes a file if it is there. A failed cleanup is logged, never thrown over the real error. */
function removeFile(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[documents] could not remove', file.uri, toMessage(error));
  }
}

/** Deletes the picker's temporary copy once the document is safely stored. Only touches cache. */
function removePickerCopy(uri: string): void {
  if (uri.startsWith(Paths.cache.uri)) removeFile(new File(uri));
}

/** Opens the system picker for one PDF. Returns null if the user cancels. */
export async function pickDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const isPdf = asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    removeFile(new File(asset.uri));
    throw new Error('Choose a PDF document.');
  }
  return { uri: asset.uri, name: asset.name, size: asset.size ?? null };
}

/** Extracts plain text from a PDF at the given local URI. Throws a readable error on failure. */
export async function extractText(fileUri: string): Promise<string> {
  if (!isPdfExtractorAvailable()) {
    throw new Error('PDF reading is not available in this build of the app.');
  }

  let text: string;
  try {
    text = await extractPdfText(fileUri);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (
      code === 'PASSWORD_REQUIRED' ||
      code === 'INCORRECT_PASSWORD' ||
      /password|encrypted/i.test(toMessage(error))
    ) {
      throw new Error('This PDF is password protected. Remove the password and try again.');
    }
    if (code === 'CORRUPT_PDF') {
      throw new Error('This PDF could not be read. The file may be damaged.');
    }
    throw error;
  }

  if (!text.trim()) {
    throw new Error("This PDF has no selectable text (scanned PDFs aren't supported).");
  }
  return text;
}

/**
 * Copies a picked PDF into app storage, extracts and chunks its text, and saves it as a
 * StudyMaterial titled by the user (stored in ModuleCode). If any step fails nothing is left
 * behind: no row, no chunks and no copied file.
 */
export async function importDocument(
  doc: PickedDocument,
  title: string,
  onProgress?: (stage: ImportStage) => void,
): Promise<StudyMaterial> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('Enter a title for this material.');
  if (cleanTitle.length > MAX_TITLE_LENGTH) {
    throw new Error(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);
  }

  const directory = materialsDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const copy = new File(
    directory,
    `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${toSafeFileStem(doc.name)}.pdf`,
  );
  let material: StudyMaterial | null = null;

  try {
    onProgress?.('copying');
    await new File(doc.uri).copy(copy);

    onProgress?.('extracting');
    const text = await extractText(copy.uri);

    onProgress?.('saving');
    const user = await getOrCreateUserProfile();
    material = await createStudyMaterial({
      UserID: user.UserID,
      ModuleCode: cleanTitle,
      FileName: doc.name,
      FilePath: copy.uri,
    });

    onProgress?.('chunking');
    await chunkAndStore(material.MaterialID, text);
    removePickerCopy(doc.uri);
    return material;
  } catch (error) {
    if (material) {
      await deleteStudyMaterial(material.MaterialID).catch((cleanupError) =>
        console.warn('[documents] could not remove the unfinished material:', cleanupError),
      );
    }
    removeFile(copy);
    throw error;
  }
}

/** The current user's materials, newest first. */
export async function listMaterials(): Promise<StudyMaterial[]> {
  const user = await getOrCreateUserProfile();
  return listStudyMaterials(user.UserID);
}

/** Deletes a material with its chunks, decks, summaries and history, and its stored PDF. */
export async function deleteMaterial(materialId: number): Promise<void> {
  const material = (await listMaterials()).find((item) => item.MaterialID === materialId);
  if (!material) throw new Error('That material no longer exists.');

  await deleteStudyMaterial(materialId);
  removeFile(new File(material.FilePath));
}
