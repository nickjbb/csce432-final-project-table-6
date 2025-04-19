const { app, BrowserWindow } = require("electron");
const axios = require("axios");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  axios.get("http://localhost:6969/api/hello")
    .then((response) => {
      const message = response.data.message;
      const html = `
        <html>
          <head><title>Backend Connected</title></head>
          <body>
            <h1>${message}</h1>
          </body>
        </html>
      `;
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    })
    .catch((err) => {
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body>
            <h1>Failed to connect to Flask :(</h1>
            <p>${err}</p>
          </body>
        </html>
      `)}`);
    });
}

app.whenReady().then(createWindow);
