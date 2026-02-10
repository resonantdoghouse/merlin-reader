import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";

let db: Database.Database | null = null;

export function initDB() {
  const dbPath = path.join(app.getPath("userData"), "merlin-library.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

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
      is_removed INTEGER DEFAULT 0,
      author TEXT,
      subject TEXT,
      keywords TEXT,
      is_favorite INTEGER DEFAULT 0,
      tags TEXT
    )
  `);

  // Migrations
  try {
    const columns = db.pragma("table_info(library_books)") as any[];
    const columnNames = columns.map((c) => c.name);

    if (!columnNames.includes("author"))
      db.exec("ALTER TABLE library_books ADD COLUMN author TEXT");
    if (!columnNames.includes("subject"))
      db.exec("ALTER TABLE library_books ADD COLUMN subject TEXT");
    if (!columnNames.includes("keywords"))
      db.exec("ALTER TABLE library_books ADD COLUMN keywords TEXT");
    if (!columnNames.includes("is_favorite"))
      db.exec(
        "ALTER TABLE library_books ADD COLUMN is_favorite INTEGER DEFAULT 0",
      );
    if (!columnNames.includes("tags"))
      db.exec("ALTER TABLE library_books ADD COLUMN tags TEXT");

    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  } catch (err) {
    console.error("Migration error:", err);
  }
}

function getDB() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function getSetting(key: string): string | null {
  const stmt = getDB().prepare("SELECT value FROM settings WHERE key = ?");
  const result = stmt.get(key) as { value: string } | undefined;
  return result ? result.value : null;
}

export function setSetting(key: string, value: string) {
  const stmt = getDB().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  return stmt.run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const stmt = getDB().prepare("SELECT key, value FROM settings");
  const rows = stmt.all() as { key: string; value: string }[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

export interface BookMeta {
  author?: string;
  subject?: string;
  keywords?: string;
}

export function addBook(
  filepath: string,
  title: string,
  total_pages: number = 0,
  meta: BookMeta = {},
) {
  const stmt = getDB().prepare(`
    INSERT INTO library_books (filepath, title, total_pages, author, subject, keywords)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(filepath) DO UPDATE SET
    is_removed = 0,
    title = excluded.title,
    author = COALESCE(excluded.author, library_books.author),
    subject = COALESCE(excluded.subject, library_books.subject),
    keywords = COALESCE(excluded.keywords, library_books.keywords)
  `);
  return stmt.run(
    filepath,
    title,
    total_pages,
    meta.author || null,
    meta.subject || null,
    meta.keywords || null,
  );
}

export function getLibrary() {
  const stmt = getDB().prepare(
    "SELECT * FROM library_books WHERE is_removed = 0 ORDER BY last_read_at DESC, added_at DESC",
  );
  return stmt.all();
}

export function removeBook(id: number) {
  const stmt = getDB().prepare(
    "UPDATE library_books SET is_removed = 1 WHERE id = ?",
  );
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
  const stmt = getDB().prepare(
    "UPDATE library_books SET total_pages = ? WHERE id = ?",
  );
  return stmt.run(total_pages, id);
}

export function updateBookCover(id: number, cover_image: string) {
  const stmt = getDB().prepare(
    "UPDATE library_books SET cover_image = ? WHERE id = ?",
  );
  return stmt.run(cover_image, id);
}

export function toggleFavorite(id: number) {
  const stmt = getDB().prepare(
    "UPDATE library_books SET is_favorite = NOT is_favorite WHERE id = ?",
  );
  return stmt.run(id);
}

export function updateTags(id: number, tags: string) {
  const stmt = getDB().prepare(
    "UPDATE library_books SET tags = ? WHERE id = ?",
  );
  return stmt.run(tags, id);
}
