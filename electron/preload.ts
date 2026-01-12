import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('merlin', {
  on(channel: string, listener: (event: any, ...args: any[]) => void) {
    const subscription = (_event: any, ...args: any[]) => listener(_event, ...args)
    ipcRenderer.on(channel, subscription)
    return () => {
        ipcRenderer.removeListener(channel, subscription)
    }
  },
  off(channel: string, listener: (...args: any[]) => void) {
    ipcRenderer.removeListener(channel, listener)
  },
  // Add specific methods here later
  invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args)
  }
})
