import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'merlin-library.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      filepath TEXT UNIQUE,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_read_page INTEGER DEFAULT 1,
      total_pages INTEGER DEFAULT 0,
      last_read_at DATETIME,
      cover_image TEXT,
      is_removed INTEGER DEFAULT 0
    )
  `);
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function addBook(filepath: string, title: string, total_pages: number = 0) {
  const stmt = getDB().prepare(`
    INSERT INTO library_books (filepath, title, total_pages)
    VALUES (?, ?, ?)
    ON CONFLICT(filepath) DO UPDATE SET
    is_removed = 0,
    title = excluded.title
  `);
  return stmt.run(filepath, title, total_pages);
}

export function getLibrary() {
  const stmt = getDB().prepare('SELECT * FROM library_books WHERE is_removed = 0 ORDER BY last_read_at DESC, added_at DESC');
  return stmt.all();
}

export function removeBook(id: number) {
  const stmt = getDB().prepare('UPDATE library_books SET is_removed = 1 WHERE id = ?');
  return stmt.run(id);
}

export function updateProgress(id: number, page: number) {
  const stmt = getDB().prepare(`
    UPDATE library_books
    SET last_read_page = ?, last_read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(page, id);
}

export function updateBookMeta(id: number, total_pages: number) {
    const stmt = getDB().prepare('UPDATE library_books SET total_pages = ? WHERE id = ?');
    return stmt.run(total_pages, id);
}
