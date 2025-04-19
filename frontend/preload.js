const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flasher", {
    analyze: (dataURI) => ipcRenderer.invoke("analyze-frame", dataURI),
    getSourceId: () => ipcRenderer.invoke("flasher:list-sources"),
});
