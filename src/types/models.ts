// Entity types mirroring the ERD in Deliverable 3, section 7.1.
// Keep these in sync with src/db/schema.ts.

export interface UserProfile {
  UserID: number;
  Name: string | null;
  Email: string | null;
}

export interface StudyMaterial {
  MaterialID: number;
  UserID: number;
  ModuleCode: string | null;
  FileName: string;
  FilePath: string;
  UploadDate: string;
}

export interface MaterialChunk {
  ChunkID: number;
  MaterialID: number;
  ChunkIndex: number;
  ExtractedText: string;
  /** Float32 vector stored as a BLOB. Null until the chunk has been embedded. */
  VectorEmbedding: Uint8Array | null;
}

export interface CramSummary {
  SummaryID: number;
  MaterialID: number;
  SummaryText: string;
  GeneratedDate: string;
}

export interface RevisionDeck {
  DeckID: number;
  MaterialID: number;
  DeckName: string;
}

export interface Flashcard {
  CardID: number;
  DeckID: number;
  Question: string;
  Answer: string;
  MasteryLevel: number;
}

export type GenerationHistoryTask = 'summary' | 'questions' | 'flashcards' | 'freeform';

export type GenerationHistoryResult =
  | { kind: 'text'; text: string }
  | { kind: 'question-answer'; items: Array<{ question: string; answer: string }> }
  | {
      kind: 'flashcards';
      deckName: string;
      cards: Array<{ question: string; answer: string }>;
    };

export interface GenerationHistoryPreview {
  HistoryID: number;
  MaterialID: number;
  MaterialName: string;
  TaskType: GenerationHistoryTask;
  Prompt: string;
  GeneratedDate: string;
}

export interface GenerationHistoryItem extends GenerationHistoryPreview {
  Result: GenerationHistoryResult;
}

/** A chunk returned by retrieval, with its similarity score. */
export interface RetrievedChunk extends MaterialChunk {
  similarity: number;
}
