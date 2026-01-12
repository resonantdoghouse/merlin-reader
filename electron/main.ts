import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { initDB, getLibrary, addBook, removeBook, updateProgress, updateBookMeta } from './db'

// The built directory structure
//
// ├─┬─ dist
// │ ├── index.html
// │ ├── assets
// │ └── ...
// ├─┬─ dist-electron
// │ ├── main.js
// │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    title: 'Merlin Reader',
    icon: path.join(process.env.VITE_PUBLIC, 'merlin-icon.png'), // Placeholder
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    // Dark theme frame
    backgroundColor: '#1a1a1a',
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initDB()
  createWindow()
  
  ipcMain.handle('get-library', () => {
    return getLibrary()
  })

  ipcMain.handle('add-book', (event, filepath) => {
    const filename = path.basename(filepath)
    return addBook(filepath, filename)
  })

  ipcMain.handle('remove-book', (event, id) => {
    return removeBook(id)
  })

  ipcMain.handle('update-progress', (event, id, page) => {
    return updateProgress(id, page)
  })

  ipcMain.handle('update-meta', (event, id, totalPages) => {
    return updateBookMeta(id, totalPages)
  })
  
  ipcMain.handle('scan-folder', async (event, folderPath) => {
    const fs = await import('fs/promises')
    
    async function getFiles(dir: string): Promise<string[]> {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
      }));
      return Array.prototype.concat(...files);
    }

    try {
        const files = await getFiles(folderPath)
        const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'))
        
        let count = 0
        for (const pdf of pdfs) {
            const filename = path.basename(pdf)
            // defaults
            addBook(pdf, filename)
            count++
        }
        return count
    } catch (e) {
        console.error("Scan error", e)
        return 0
    }
  })
  
  ipcMain.handle('select-folder', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
})
