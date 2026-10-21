import type {
  CramSummary,
  Flashcard,
  MaterialChunk,
  RevisionDeck,
  StudyMaterial,
  UserProfile,
} from '../types/models';
import { getDatabase } from './database';

export type NewStudyMaterial = Pick<
  StudyMaterial,
  'UserID' | 'ModuleCode' | 'FileName' | 'FilePath'
>;

export type NewMaterialChunk = Pick<
  MaterialChunk,
  'MaterialID' | 'ChunkIndex' | 'ExtractedText'
> & { VectorEmbedding?: Uint8Array | null };

export type NewFlashcard = Pick<Flashcard, 'DeckID' | 'Question' | 'Answer'>;

/** Returns the app's local profile, creating it on first use. */
export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const database = getDatabase();
  const existing = await database.getFirstAsync<UserProfile>(
    'SELECT UserID, Name, Email FROM UserProfile ORDER BY UserID LIMIT 1',
  );
  if (existing) return existing;

  const result = await database.runAsync('INSERT INTO UserProfile DEFAULT VALUES');
  const created = await database.getFirstAsync<UserProfile>(
    'SELECT UserID, Name, Email FROM UserProfile WHERE UserID = ?',
    result.lastInsertRowId,
  );
  if (!created) throw new Error('Could not create the local user profile.');
  return created;
}

export async function createStudyMaterial(input: NewStudyMaterial): Promise<StudyMaterial> {
  const database = getDatabase();
  const result = await database.runAsync(
    'INSERT INTO StudyMaterial (UserID, ModuleCode, FileName, FilePath) VALUES (?, ?, ?, ?)',
    input.UserID,
    input.ModuleCode,
    input.FileName,
    input.FilePath,
  );
  const material = await database.getFirstAsync<StudyMaterial>(
    'SELECT * FROM StudyMaterial WHERE MaterialID = ?',
    result.lastInsertRowId,
  );
  if (!material) throw new Error('Could not create the study material record.');
  return material;
}

/** Lists a user's materials newest first for the study-material list. */
export async function listStudyMaterials(userId: number): Promise<StudyMaterial[]> {
  return getDatabase().getAllAsync<StudyMaterial>(
    'SELECT * FROM StudyMaterial WHERE UserID = ? ORDER BY UploadDate DESC, MaterialID DESC',
    userId,
  );
}

/** Deletes a material and its related chunks, summaries, decks, and cards. */
export async function deleteStudyMaterial(materialId: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM StudyMaterial WHERE MaterialID = ?', materialId);
}

/** Saves extracted chunks together; embeddings may be omitted until retrieval indexing. */
export async function createMaterialChunks(chunks: NewMaterialChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  const database = getDatabase();
  await database.withTransactionAsync(async () => {
    for (const chunk of chunks) {
      await database.runAsync(
        'INSERT INTO MaterialChunk (MaterialID, ChunkIndex, ExtractedText, VectorEmbedding) VALUES (?, ?, ?, ?)',
        chunk.MaterialID,
        chunk.ChunkIndex,
        chunk.ExtractedText,
        chunk.VectorEmbedding ?? null,
      );
    }
  });
}

/** Returns chunks in document order. */
export async function listMaterialChunks(materialId: number): Promise<MaterialChunk[]> {
  return getDatabase().getAllAsync<MaterialChunk>(
    'SELECT * FROM MaterialChunk WHERE MaterialID = ? ORDER BY ChunkIndex',
    materialId,
  );
}

/** Stores an embedding for a chunk after it has been generated. */
export async function updateChunkEmbedding(chunkId: number, embedding: Uint8Array): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE MaterialChunk SET VectorEmbedding = ? WHERE ChunkID = ?',
    embedding,
    chunkId,
  );
}

/** Persists a generated summary and returns it with its database ID and timestamp. */
export async function createCramSummary(
  materialId: number,
  summaryText: string,
): Promise<CramSummary> {
  const database = getDatabase();
  const result = await database.runAsync(
    'INSERT INTO CramSummary (MaterialID, SummaryText) VALUES (?, ?)',
    materialId,
    summaryText,
  );
  const summary = await database.getFirstAsync<CramSummary>(
    'SELECT * FROM CramSummary WHERE SummaryID = ?',
    result.lastInsertRowId,
  );
  if (!summary) throw new Error('Could not create the summary record.');
  return summary;
}

/** Lists a material's summaries newest first. */
export async function listCramSummaries(materialId: number): Promise<CramSummary[]> {
  return getDatabase().getAllAsync<CramSummary>(
    'SELECT * FROM CramSummary WHERE MaterialID = ? ORDER BY GeneratedDate DESC, SummaryID DESC',
    materialId,
  );
}

/** Creates a flashcard deck for a material and returns the saved deck. */
export async function createRevisionDeck(
  materialId: number,
  deckName: string,
): Promise<RevisionDeck> {
  const database = getDatabase();
  const result = await database.runAsync(
    'INSERT INTO RevisionDeck (MaterialID, DeckName) VALUES (?, ?)',
    materialId,
    deckName,
  );
  const deck = await database.getFirstAsync<RevisionDeck>(
    'SELECT * FROM RevisionDeck WHERE DeckID = ?',
    result.lastInsertRowId,
  );
  if (!deck) throw new Error('Could not create the revision deck record.');
  return deck;
}

/** Lists a material's flashcard decks. */
export async function listRevisionDecks(materialId: number): Promise<RevisionDeck[]> {
  return getDatabase().getAllAsync<RevisionDeck>(
    'SELECT * FROM RevisionDeck WHERE MaterialID = ? ORDER BY DeckID DESC',
    materialId,
  );
}

/** Saves generated cards together; new cards start at the schema's default mastery level. */
export async function createFlashcards(cards: NewFlashcard[]): Promise<void> {
  if (cards.length === 0) return;

  const database = getDatabase();
  await database.withTransactionAsync(async () => {
    for (const card of cards) {
      await database.runAsync(
        'INSERT INTO Flashcard (DeckID, Question, Answer) VALUES (?, ?, ?)',
        card.DeckID,
        card.Question,
        card.Answer,
      );
    }
  });
}

/** Returns cards in stable order for the flashcard study view. */
export async function listFlashcards(deckId: number): Promise<Flashcard[]> {
  return getDatabase().getAllAsync<Flashcard>(
    'SELECT * FROM Flashcard WHERE DeckID = ? ORDER BY CardID',
    deckId,
  );
}

/** Saves the mastery value selected by the flashcard review interaction. */
export async function updateFlashcardMastery(cardId: number, masteryLevel: number): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE Flashcard SET MasteryLevel = ? WHERE CardID = ?',
    masteryLevel,
    cardId,
  );
}
