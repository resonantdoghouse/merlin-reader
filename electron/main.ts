import { app, BrowserWindow, ipcMain, protocol, net } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { initDB, getLibrary, addBook, removeBook, updateProgress, updateBookMeta, updateBookCover, toggleFavorite, updateTags, type BookMeta } from './db'
import fs from 'fs/promises'
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// pdf-parse v2 usage
const { PDFParse } = require('pdf-parse');

import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
const DIST = path.join(__dirname, '../dist')
const VITE_PUBLIC = app.isPackaged ? DIST : path.join(__dirname, '../public')
process.env.DIST = DIST
process.env.VITE_PUBLIC = VITE_PUBLIC

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Register the media scheme as privileged
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
])

function createWindow() {
  win = new BrowserWindow({
    title: 'Merlin Reader',
    icon: path.join(VITE_PUBLIC, 'merlin-icon.png'), // Placeholder
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webSecurity: true
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
    win.loadFile(path.join(DIST, 'index.html'))
  }
}

app.disableHardwareAcceleration()

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

async function extractMetadata(filepath: string): Promise<BookMeta> {
    let parser;
    try {
        const dataBuffer = await fs.readFile(filepath);
        parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getInfo();
        const info = result.info || {};
        
        return {
            author: info.Author || undefined,
            subject: info.Subject || undefined,
            keywords: info.Keywords || undefined
        };
    } catch (err) {
        console.error("Failed to extract metadata for:", filepath, err);
        return {};
    } finally {
        if (parser) {
            await parser.destroy();
        }
    }
}

app.whenReady().then(() => {
  
  // Handle media protocol
  protocol.handle('media', (request) => {
    let urlPath = request.url.replace('media://', '')
    
    // Decode first
    urlPath = decodeURIComponent(urlPath)

    // Handle 3-slash URLs (media:///C:/...) -> /C:/...
    // We want to strip the leading slash if it precedes a drive letter
    if (urlPath.startsWith('/') && /^\/[a-zA-Z]:/.test(urlPath)) {
        urlPath = urlPath.slice(1)
    }
    
    // Handle missing colon case (media://c/...) -> c/Users...
    // If it starts with drive letter char + slash, inject colon
    if (/^[a-zA-Z]\//.test(urlPath)) {
        urlPath = urlPath[0] + ':' + urlPath.slice(1)
    }

    console.log('Media Protocol Request:', {
        original: request.url,
        processed: urlPath
    })

    try {
        const normalizedPath = path.normalize(urlPath)
        const forwardSlashes = normalizedPath.replace(/\\/g, '/')
        const finalUrl = `file:///${forwardSlashes}`
        console.log('Fetching:', finalUrl)
        
        return net.fetch(finalUrl)
    } catch (e) {
        console.error('Media protocol error:', e)
        throw e
    }
  })

  try {
    initDB()
  } catch (err) {
    console.error('Failed to initialize database:', err)
  }

  createWindow()
  
  ipcMain.handle('get-library', () => {
    try {
      return getLibrary()
    } catch (err) {
      console.error('Failed to get library:', err)
      return []
    }
  })

  ipcMain.handle('add-book', async (event, filepath) => {
    const filename = path.basename(filepath)
    const meta = await extractMetadata(filepath);
    return addBook(filepath, filename, 0, meta)
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

  ipcMain.handle('update-cover', (event, id, coverImage) => {
    return updateBookCover(id, coverImage)
  })

  ipcMain.handle('toggle-favorite', (event, id) => {
      return toggleFavorite(id);
  })

  ipcMain.handle('update-tags', (event, id, tags) => {
      return updateTags(id, tags);
  })
  
  ipcMain.handle('scan-folder', async (event, folderPath) => {
    console.log('Main process: Starting scan-folder for:', folderPath)
    try {
      
      async function getFiles(dir: string): Promise<string[]> {
        try {
            const dirents = await fs.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map((dirent) => {
              const res = path.resolve(dir, dirent.name);
              return dirent.isDirectory() ? getFiles(res) : res;
            }));
            return Array.prototype.concat(...files);
        } catch (e) {
            console.error("Error reading dir:", dir, e);
            return [];
        }
      }

      const files = await getFiles(folderPath)
      console.log(`Main process: Found ${files.length} files`)
      const pdfs = files.filter(f => typeof f === 'string' && f.toLowerCase().endsWith('.pdf'))
      console.log(`Main process: Found ${pdfs.length} PDFs`)
      
      let count = 0
      for (const pdf of pdfs) {
          const filename = path.basename(pdf)
          // defaults
          try {
              const meta = await extractMetadata(pdf);
              addBook(pdf, filename, 0, meta)
              count++
          } catch (err) {
              console.error("Failed to add book:", pdf, err)
          }
      }
      return count
    } catch (e) {
        console.error("Scan error", e)
        throw e
    }
  })
  
  ipcMain.handle('select-folder', async () => {
    console.log('Main process: Handling select-folder request')
    if (!win) {
      console.error('Main process: Window is not available for dialog')
      return null
    }
    
    try {
      const { dialog } = await import('electron')
      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
      })
      console.log('Main process: Dialog result:', result)
      
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      return result.filePaths[0]
    } catch (error) {
      console.error('Main process: Error in select-folder:', error)
      throw error
    }
  })
})
