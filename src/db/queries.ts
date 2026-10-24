import type {
  Flashcard,
  GenerationHistoryItem,
  GenerationHistoryPreview,
  GenerationHistoryResult,
  GenerationHistoryTask,
  MaterialChunk,
  RevisionDeck,
  StudyMaterial,
  UserProfile,
} from '../types/models';
import { getDatabase } from './database';

/** Fields needed after a document has been copied into app storage. */
export type NewStudyMaterial = Pick<
  StudyMaterial,
  'UserID' | 'ModuleCode' | 'FileName' | 'FilePath'
>;

export type NewMaterialChunk = Pick<
  MaterialChunk,
  'MaterialID' | 'ChunkIndex' | 'ExtractedText'
> & { VectorEmbedding?: Uint8Array | null };

export type NewFlashcard = Pick<Flashcard, 'DeckID' | 'Question' | 'Answer'>;

/** Save this after generation succeeds; Prompt is the user's search text or question. */
/**
 * Data to save after a generation button succeeds.
 * Summary results use { kind: 'text', text }; Q&A uses { kind: 'question-answer', items };
 * flashcards use { kind: 'flashcards', deckName, cards }.
 */
export interface NewGenerationHistory {
  /** ID of the selected StudyMaterial row. */
  MaterialID: number;
  /** The screen action, used to label and filter history. */
  TaskType: GenerationHistoryTask;
  /** User-entered topic or question to show when reopening the history item. */
  Prompt: string;
  /** Generated content in the shape that matches TaskType. */
  Result: GenerationHistoryResult;
}

export interface GenerationHistoryFilters {
  /** Limit results to one source document; omit to show all materials. */
  materialId?: number;
  /** Limit results to one task type; omit to show all generated content. */
  taskType?: GenerationHistoryTask;
  /** Number of rows to load per request. Defaults to 50. */
  limit?: number;
  /** Number of rows to skip when loading the next page. Defaults to 0. */
  offset?: number;
}

interface GenerationHistoryRow extends GenerationHistoryPreview {
  ResultJson: string;
}

function isGenerationHistoryResult(value: unknown): value is GenerationHistoryResult {
  if (typeof value !== 'object' || value === null) return false;

  const result = value as Record<string, unknown>;
  if (result.kind === 'text') return typeof result.text === 'string';
  if (result.kind !== 'question-answer' && result.kind !== 'flashcards') return false;

  const items = result.kind === 'flashcards' ? result.cards : result.items;
  if (!Array.isArray(items)) return false;
  if (result.kind === 'flashcards' && typeof result.deckName !== 'string') return false;

  return items.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).question === 'string' &&
      typeof (item as Record<string, unknown>).answer === 'string',
  );
}

function parseGenerationHistoryRow(row: GenerationHistoryRow): GenerationHistoryItem {
  let result: unknown;
  try {
    result = JSON.parse(row.ResultJson);
  } catch {
    throw new Error(`Generation history item ${row.HistoryID} contains invalid result data.`);
  }
  if (!isGenerationHistoryResult(result)) {
    throw new Error(`Generation history item ${row.HistoryID} has an unsupported result format.`);
  }

  const { ResultJson: _resultJson, ...preview } = row;
  return { ...preview, Result: result };
}

const GENERATION_HISTORY_PREVIEW_SELECT = `
  SELECT h.HistoryID, h.MaterialID, COALESCE(m.ModuleCode, m.FileName) AS MaterialName,
    h.TaskType, h.Prompt, h.GeneratedDate
  FROM GenerationHistory h
  JOIN StudyMaterial m ON m.MaterialID = h.MaterialID`;

const GENERATION_HISTORY_SELECT = `
  SELECT h.HistoryID, h.MaterialID, COALESCE(m.ModuleCode, m.FileName) AS MaterialName,
         h.TaskType, h.Prompt, h.ResultJson, h.GeneratedDate
  FROM GenerationHistory h
  JOIN StudyMaterial m ON m.MaterialID = h.MaterialID`;

/** Get the local profile ID before adding material; creates the profile on first use. */
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

/** Saves the name and email shown in Settings. Empty text is stored as null. */
export async function updateUserProfile(
  userId: number,
  input: { Name: string | null; Email: string | null },
): Promise<UserProfile> {
  const database = getDatabase();
  await database.runAsync(
    'UPDATE UserProfile SET Name = ?, Email = ? WHERE UserID = ?',
    input.Name,
    input.Email,
    userId,
  );
  const profile = await database.getFirstAsync<UserProfile>(
    'SELECT UserID, Name, Email FROM UserProfile WHERE UserID = ?',
    userId,
  );
  if (!profile) throw new Error('That profile no longer exists.');
  return profile;
}

/**
 * Save a picked/copied document so screens can refer to it by MaterialID.
 * The returned row contains the ID to pass to summaries, decks, and history queries.
 */
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

/** Returns one material, or null if it was deleted. */
export async function getStudyMaterial(materialId: number): Promise<StudyMaterial | null> {
  return getDatabase().getFirstAsync<StudyMaterial>(
    'SELECT * FROM StudyMaterial WHERE MaterialID = ?',
    materialId,
  );
}

/** Rename action for a material. The title is stored in ModuleCode. */
export async function updateStudyMaterialTitle(materialId: number, title: string): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE StudyMaterial SET ModuleCode = ? WHERE MaterialID = ?',
    title,
    materialId,
  );
}

/** Lists a user's materials newest first for the study-material list. */
export async function listStudyMaterials(userId: number): Promise<StudyMaterial[]> {
  return getDatabase().getAllAsync<StudyMaterial>(
    'SELECT * FROM StudyMaterial WHERE UserID = ? ORDER BY UploadDate DESC, MaterialID DESC',
    userId,
  );
}

/** Delete action for a material; SQLite also removes its chunks, summaries, decks, cards, and history. */
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

/**
 * Call after generation succeeds so the History screen can list and reopen the result. Summaries,
 * Q&A and answers live only here. Flashcards also create a deck and cards with
 * createRevisionDeck and createFlashcards, so they can be studied and marked.
 */
export async function createGenerationHistory(
  input: NewGenerationHistory,
): Promise<GenerationHistoryItem> {
  const database = getDatabase();
  const result = await database.runAsync(
    'INSERT INTO GenerationHistory (MaterialID, TaskType, Prompt, ResultJson) VALUES (?, ?, ?, ?)',
    input.MaterialID,
    input.TaskType,
    input.Prompt,
    JSON.stringify(input.Result),
  );
  const item = await getGenerationHistoryItem(result.lastInsertRowId);
  if (!item) throw new Error('Could not create the generation history record.');
  return item;
}

/**
 * Load rows for the History screen. Use filters for one material or task; each row has
 * HistoryID, TaskType, Prompt, MaterialName, and GeneratedDate, but not the full result.
 */
export async function listGenerationHistory(
  filters: GenerationHistoryFilters = {},
): Promise<GenerationHistoryPreview[]> {
  const conditions: string[] = [];
  const parameters: (number | string)[] = [];
  if (filters.materialId !== undefined) {
    conditions.push('h.MaterialID = ?');
    parameters.push(filters.materialId);
  }
  if (filters.taskType !== undefined) {
    conditions.push('h.TaskType = ?');
    parameters.push(filters.taskType);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.max(1, Math.floor(filters.limit ?? 50));
  const offset = Math.max(0, Math.floor(filters.offset ?? 0));
  const rows = await getDatabase().getAllAsync<GenerationHistoryPreview>(
    `${GENERATION_HISTORY_PREVIEW_SELECT}${whereClause}
     ORDER BY h.GeneratedDate DESC, h.HistoryID DESC LIMIT ? OFFSET ?`,
    ...parameters,
    limit,
    offset,
  );
  return rows;
}

/** Call when a history row is tapped; returns its full result, or null if it was deleted. */
export async function getGenerationHistoryItem(
  historyId: number,
): Promise<GenerationHistoryItem | null> {
  const row = await getDatabase().getFirstAsync<GenerationHistoryRow>(
    `${GENERATION_HISTORY_SELECT} WHERE h.HistoryID = ?`,
    historyId,
  );
  return row ? parseGenerationHistoryRow(row) : null;
}

/** Delete action for one history row. Decks and cards made by the same run are not touched. */
export async function deleteGenerationHistory(historyId: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM GenerationHistory WHERE HistoryID = ?', historyId);
}

/** Create a deck first; pass its DeckID to createFlashcards to save the generated cards. */
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

/** Load a material's decks for the flashcard list; newest deck IDs come first. */
export async function listRevisionDecks(materialId: number): Promise<RevisionDeck[]> {
  return getDatabase().getAllAsync<RevisionDeck>(
    'SELECT * FROM RevisionDeck WHERE MaterialID = ? ORDER BY DeckID DESC',
    materialId,
  );
}

/** Save generated cards together; each card needs the selected deck's DeckID. */
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

/** Delete action for a deck; SQLite also removes its cards. */
export async function deleteRevisionDeck(deckId: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM RevisionDeck WHERE DeckID = ?', deckId);
}

/** Load a deck's cards for the study view, in stable order. */
export async function listFlashcards(deckId: number): Promise<Flashcard[]> {
  return getDatabase().getAllAsync<Flashcard>(
    'SELECT * FROM Flashcard WHERE DeckID = ? ORDER BY CardID',
    deckId,
  );
}

/** Call after a learner chooses a mastery option for a card. */
export async function updateFlashcardMastery(cardId: number, masteryLevel: number): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE Flashcard SET MasteryLevel = ? WHERE CardID = ?',
    masteryLevel,
    cardId,
  );
}
