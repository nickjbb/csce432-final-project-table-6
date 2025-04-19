const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const fetch = require("node-fetch");

async function pickFirstScreen() {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    return sources[0].id;
}

ipcMain.handle("flasher:list-sources", async () => pickFirstScreen());

ipcMain.handle("analyze-frame", async (_e, dataURI) => {
    try {
        const res = await fetch("http://127.0.0.1:6969/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frame: dataURI }),
        });
        const json = await res.json();
        return json.flash;
    } catch (err) {
        console.error(err);
        return false;
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });
    win.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();
    app.on(
        "activate",
        () => BrowserWindow.getAllWindows().length === 0 && createWindow()
    );
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
