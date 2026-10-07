// Imports a document, extracts its text, and records it in StudyMaterial.
// Deliverable 3 reference: section 6.4.1

import type { StudyMaterial } from '../types/models';

/** Opens the picker, copies the file locally and inserts a StudyMaterial row. */
export async function importDocument(): Promise<StudyMaterial> {
  throw new Error('Not implemented');
}

/** Extracts plain text from a PDF at the given local URI. */
export async function extractText(fileUri: string): Promise<string> {
  throw new Error('Not implemented');
}

export async function listMaterials(): Promise<StudyMaterial[]> {
  throw new Error('Not implemented');
}

export async function deleteMaterial(materialId: number): Promise<void> {
  throw new Error('Not implemented');
}
