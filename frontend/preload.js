const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flasher", {
    analyzeUrl: (url) => ipcRenderer.invoke("flasher:analyze-url", url),
});