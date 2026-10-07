import * as SQLite from 'expo-sqlite';

import { CREATE_TABLES } from './schema';

const DATABASE_NAME = 'studybee.db';

let database: SQLite.SQLiteDatabase | null = null;

/** Opens the database and creates the schema if it does not exist. */
export async function initialiseDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await database.execAsync(CREATE_TABLES);
  return database;
}

/** Returns the open database. Throws if initialiseDatabase has not run. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error('Database not initialised. Call initialiseDatabase() first.');
  }
  return database;
}
