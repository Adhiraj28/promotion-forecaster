const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Add any IPC communications needed in the future
    getAppVersion: () => {
      return process.versions.electron;
    }
  }
); 