import { app, BrowserWindow, ipcMain } from "electron";
import path$1 from "node:path";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "node:url";
let db = null;
function initDB() {
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
      is_removed INTEGER DEFAULT 0
    )
  `);
}
function getDB() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
function addBook(filepath, title, total_pages = 0) {
  const stmt = getDB().prepare(`
    INSERT INTO library_books (filepath, title, total_pages)
    VALUES (?, ?, ?)
    ON CONFLICT(filepath) DO UPDATE SET
    is_removed = 0,
    title = excluded.title
  `);
  return stmt.run(filepath, title, total_pages);
}
function getLibrary() {
  const stmt = getDB().prepare("SELECT * FROM library_books WHERE is_removed = 0 ORDER BY last_read_at DESC, added_at DESC");
  return stmt.all();
}
function removeBook(id) {
  const stmt = getDB().prepare("UPDATE library_books SET is_removed = 1 WHERE id = ?");
  return stmt.run(id);
}
function updateProgress(id, page) {
  const stmt = getDB().prepare(`
    UPDATE library_books
    SET last_read_page = ?, last_read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(page, id);
}
function updateBookMeta(id, total_pages) {
  const stmt = getDB().prepare("UPDATE library_books SET total_pages = ? WHERE id = ?");
  return stmt.run(total_pages, id);
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path$1.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path$1.join(__dirname$1, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new BrowserWindow({
    title: "Merlin Reader",
    icon: path$1.join(process.env.VITE_PUBLIC, "merlin-icon.png"),
    // Placeholder
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.js")
    },
    // Dark theme frame
    backgroundColor: "#1a1a1a"
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(process.env.DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  app.disableHardwareAcceleration();
  initDB();
  createWindow();
  ipcMain.handle("get-library", () => {
    return getLibrary();
  });
  ipcMain.handle("add-book", (event, filepath) => {
    const filename = path$1.basename(filepath);
    return addBook(filepath, filename);
  });
  ipcMain.handle("remove-book", (event, id) => {
    return removeBook(id);
  });
  ipcMain.handle("update-progress", (event, id, page) => {
    return updateProgress(id, page);
  });
  ipcMain.handle("update-meta", (event, id, totalPages) => {
    return updateBookMeta(id, totalPages);
  });
  ipcMain.handle("scan-folder", async (event, folderPath) => {
    console.log("Scanning folder:", folderPath);
    const fs = await import("fs/promises");
    async function getFiles(dir) {
      try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
          const res = path$1.resolve(dir, dirent.name);
          return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
      } catch (e) {
        console.error("Error reading dir:", dir, e);
        return [];
      }
    }
    try {
      const files = await getFiles(folderPath);
      console.log(`Found ${files.length} files total.`);
      const pdfs = files.filter((f) => typeof f === "string" && f.toLowerCase().endsWith(".pdf"));
      console.log(`Found ${pdfs.length} PDFs.`);
      let count = 0;
      for (const pdf of pdfs) {
        const filename = path$1.basename(pdf);
        try {
          addBook(pdf, filename);
          count++;
        } catch (err) {
          console.error("Failed to add book:", pdf, err);
        }
      }
      return count;
    } catch (e) {
      console.error("Scan error", e);
      return 0;
    }
  });
  ipcMain.handle("select-folder", async () => {
    const { dialog } = await import("electron");
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
});
