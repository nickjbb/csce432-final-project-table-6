const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  example: () => "from preload",
});
