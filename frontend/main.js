const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const fetch = require("node-fetch");

let mainWindow;

async function pickFirstScreen() {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    return sources[0].id;
}

ipcMain.handle("flasher:analyze-url", async (_e, url) => {
    let scanWindow = null;
    let scanInterval = null;
    let flashDetectedDuringScan = false;
    const SCAN_DURATION_MS = 2000;
    const CAPTURE_INTERVAL_MS = 100;

    try {
        scanWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'scan-partition'
            }
        });

        scanWindow.on('closed', () => {
            scanWindow = null;
            if (scanInterval) {
                clearInterval(scanInterval);
                scanInterval = null;
            }
        });

        await scanWindow.loadURL(url);
        await new Promise(resolve => setTimeout(resolve, 500));
        const startTime = Date.now();

        const scanPromise = new Promise((resolve) => {
            scanInterval = setInterval(async () => {
                if (!scanWindow || flashDetectedDuringScan || (Date.now() - startTime > SCAN_DURATION_MS)) {
                    clearInterval(scanInterval);
                    scanInterval = null;
                    resolve();
                    return;
                }

                try {
                    if (scanWindow && !scanWindow.isDestroyed()) {
                        const image = await scanWindow.webContents.capturePage();
                        const buffer = image.toPNG();
                        const dataURI = `data:image/png;base64,${buffer.toString('base64')}`;

                        const res = await fetch("http://127.0.0.1:6969/analyze", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ frame: dataURI }),
                        });

                        if (!res.ok) {
                            throw new Error(`Backend HTTP error! Status: ${res.status}`);
                        }

                        const json = await res.json();

                        if (json.flash) {
                            console.warn(`Flash detected for ${url}! Stopping scan.`);
                            flashDetectedDuringScan = true;
                            clearInterval(scanInterval);
                            scanInterval = null;
                            resolve();
                        }
                    }
                } catch (error) {
                    console.error(`Error during scan loop for ${url}:`, error);
                    flashDetectedDuringScan = true;
                    clearInterval(scanInterval);
                    scanInterval = null;
                    resolve();
                }
            }, CAPTURE_INTERVAL_MS);

            setTimeout(() => {
                if (scanInterval) {
                    clearInterval(scanInterval);
                    scanInterval = null;
                }
                resolve();
            }, SCAN_DURATION_MS + 500);
        });

        await scanPromise;

        if (scanWindow && !scanWindow.isDestroyed()) {
            scanWindow.close();
        }

        if (flashDetectedDuringScan) {
            return true;
        } else {
            // if (mainWindow && !mainWindow.isDestroyed()) {
            //     mainWindow.loadURL(url);
            // }
            return false;
        }

    } catch (error) {
        console.error(`Failed to analyze URL ${url}:`, error);
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        if (scanWindow && !scanWindow.isDestroyed()) {
            scanWindow.close();
        }
        return true;
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });
    mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();
    app.on(
        "activate",
        () => BrowserWindow.getAllWindows().length === 0 && createWindow()
    );
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());