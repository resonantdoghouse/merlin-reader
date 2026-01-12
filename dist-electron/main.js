import { app as i, BrowserWindow as _, ipcMain as a } from "electron";
import n from "node:path";
import R from "better-sqlite3";
import b from "path";
const h = b.join(i.getPath("userData"), "merlin-library.db"), l = new R(h);
function D() {
  l.exec(`
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
function m(t, e, r = 0) {
  return l.prepare(`
    INSERT INTO library_books (filepath, title, total_pages)
    VALUES (?, ?, ?)
    ON CONFLICT(filepath) DO UPDATE SET
    is_removed = 0,
    title = excluded.title
  `).run(t, e, r);
}
function w() {
  return l.prepare("SELECT * FROM library_books WHERE is_removed = 0 ORDER BY last_read_at DESC, added_at DESC").all();
}
function I(t) {
  return l.prepare("UPDATE library_books SET is_removed = 1 WHERE id = ?").run(t);
}
function g(t, e) {
  return l.prepare(`
    UPDATE library_books
    SET last_read_page = ?, last_read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(e, t);
}
function v(t, e) {
  return l.prepare("UPDATE library_books SET total_pages = ? WHERE id = ?").run(e, t);
}
process.env.DIST = n.join(__dirname, "../dist");
process.env.VITE_PUBLIC = i.isPackaged ? process.env.DIST : n.join(__dirname, "../public");
let s;
const u = process.env.VITE_DEV_SERVER_URL;
function f() {
  s = new _({
    title: "Merlin Reader",
    icon: n.join(process.env.VITE_PUBLIC, "merlin-icon.png"),
    // Placeholder
    width: 1200,
    height: 800,
    webPreferences: {
      preload: n.join(__dirname, "preload.js")
    },
    // Dark theme frame
    backgroundColor: "#1a1a1a"
  }), s.webContents.on("did-finish-load", () => {
    s?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), u ? s.loadURL(u) : s.loadFile(n.join(process.env.DIST, "index.html"));
}
i.on("window-all-closed", () => {
  process.platform !== "darwin" && (i.quit(), s = null);
});
i.on("activate", () => {
  _.getAllWindows().length === 0 && f();
});
i.whenReady().then(() => {
  D(), f(), a.handle("get-library", () => w()), a.handle("add-book", (t, e) => {
    const r = n.basename(e);
    return m(e, r);
  }), a.handle("remove-book", (t, e) => I(e)), a.handle("update-progress", (t, e, r) => g(e, r)), a.handle("update-meta", (t, e, r) => v(e, r)), a.handle("scan-folder", async (t, e) => {
    const r = await import("fs/promises");
    async function p(d) {
      const T = await r.readdir(d, { withFileTypes: !0 }), c = await Promise.all(T.map((o) => {
        const E = n.resolve(d, o.name);
        return o.isDirectory() ? p(E) : E;
      }));
      return Array.prototype.concat(...c);
    }
    try {
      const T = (await p(e)).filter((o) => o.toLowerCase().endsWith(".pdf"));
      let c = 0;
      for (const o of T) {
        const E = n.basename(o);
        m(o, E), c++;
      }
      return c;
    } catch (d) {
      return console.error("Scan error", d), 0;
    }
  }), a.handle("select-folder", async () => {
    const { dialog: t } = await import("electron"), e = await t.showOpenDialog(s, {
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
  });
});
