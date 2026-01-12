import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'merlin-library.db');
const db = new Database(dbPath);

export function initDB() {
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

export function addBook(filepath: string, title: string, total_pages: number = 0) {
  const stmt = db.prepare(`
    INSERT INTO library_books (filepath, title, total_pages)
    VALUES (?, ?, ?)
    ON CONFLICT(filepath) DO UPDATE SET
    is_removed = 0,
    title = excluded.title
  `);
  return stmt.run(filepath, title, total_pages);
}

export function getLibrary() {
  const stmt = db.prepare('SELECT * FROM library_books WHERE is_removed = 0 ORDER BY last_read_at DESC, added_at DESC');
  return stmt.all();
}

export function removeBook(id: number) {
  // User wants to remove from library. can be soft delete or hard delete.
  // Soft delete allows "undo" logic if we wanted, or re-adding same file keeps progress.
  // "Books being read should persist their state, what was the last page read and to reload when opening the PDF in the future"
  // If I remove and re-add, I probably want to keep the progress. So Soft Delete is better.
  const stmt = db.prepare('UPDATE library_books SET is_removed = 1 WHERE id = ?');
  return stmt.run(id);
}

export function updateProgress(id: number, page: number) {
  const stmt = db.prepare(`
    UPDATE library_books
    SET last_read_page = ?, last_read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(page, id);
}

export function updateBookMeta(id: number, total_pages: number) {
    const stmt = db.prepare('UPDATE library_books SET total_pages = ? WHERE id = ?');
    return stmt.run(total_pages, id);
}
