"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("merlin", {
  on(channel, listener) {
    const subscription = (_event, ...args) => listener(_event, ...args);
    electron.ipcRenderer.on(channel, subscription);
    return () => {
      electron.ipcRenderer.removeListener(channel, subscription);
    };
  },
  off(channel, listener) {
    electron.ipcRenderer.removeListener(channel, listener);
  },
  // Add specific methods here later
  invoke(channel, ...args) {
    return electron.ipcRenderer.invoke(channel, ...args);
  }
});
