// SQLite schema transcribed from the ERD in Deliverable 3, section 7.
// Vectors live in MaterialChunk.VectorEmbedding as BLOBs, which is what
// removes the need for a separate vector database.

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS UserProfile (
  UserID INTEGER PRIMARY KEY AUTOINCREMENT,
  Name   TEXT,
  Email  TEXT
);

CREATE TABLE IF NOT EXISTS StudyMaterial (
  MaterialID INTEGER PRIMARY KEY AUTOINCREMENT,
  UserID     INTEGER NOT NULL,
  ModuleCode TEXT,
  FileName   TEXT NOT NULL,
  FilePath   TEXT NOT NULL,
  UploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserID) REFERENCES UserProfile(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MaterialChunk (
  ChunkID         INTEGER PRIMARY KEY AUTOINCREMENT,
  MaterialID      INTEGER NOT NULL,
  ChunkIndex      INTEGER NOT NULL,
  ExtractedText   TEXT NOT NULL,
  VectorEmbedding BLOB,
  FOREIGN KEY (MaterialID) REFERENCES StudyMaterial(MaterialID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CramSummary (
  SummaryID     INTEGER PRIMARY KEY AUTOINCREMENT,
  MaterialID    INTEGER NOT NULL,
  SummaryText   TEXT NOT NULL,
  GeneratedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaterialID) REFERENCES StudyMaterial(MaterialID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RevisionDeck (
  DeckID     INTEGER PRIMARY KEY AUTOINCREMENT,
  MaterialID INTEGER NOT NULL,
  DeckName   TEXT NOT NULL,
  FOREIGN KEY (MaterialID) REFERENCES StudyMaterial(MaterialID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Flashcard (
  CardID       INTEGER PRIMARY KEY AUTOINCREMENT,
  DeckID       INTEGER NOT NULL,
  Question     TEXT NOT NULL,
  Answer       TEXT NOT NULL,
  MasteryLevel INTEGER DEFAULT 0,
  FOREIGN KEY (DeckID) REFERENCES RevisionDeck(DeckID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS GenerationHistory (
  HistoryID    INTEGER PRIMARY KEY AUTOINCREMENT,
  MaterialID   INTEGER NOT NULL,
  TaskType     TEXT NOT NULL CHECK (TaskType IN ('summary', 'questions', 'flashcards', 'freeform')),
  Prompt       TEXT NOT NULL,
  ResultJson   TEXT NOT NULL,
  GeneratedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MaterialID) REFERENCES StudyMaterial(MaterialID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunk_material ON MaterialChunk(MaterialID, ChunkIndex);
CREATE INDEX IF NOT EXISTS idx_summary_material ON CramSummary(MaterialID);
CREATE INDEX IF NOT EXISTS idx_deck_material ON RevisionDeck(MaterialID);
CREATE INDEX IF NOT EXISTS idx_card_deck ON Flashcard(DeckID);
CREATE INDEX IF NOT EXISTS idx_history_material_date ON GenerationHistory(MaterialID, GeneratedDate DESC, HistoryID DESC);
`;
