// Duly prototype in its own window (Electron).
// Starts the prototype's page server (8765) and the Ask helper (8767) when they are
// not already running, opens one native window, and stops what it started on quit.
// Prototype only: the sample student is fictional. The real desktop app is desktop/.

const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGE = 'http://127.0.0.1:8765/index.html#/home';
const started = [];

function up(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
  });
}

async function ensure(url, args) {
  if (await up(url)) return;
  const child = spawn('python3', args, { cwd: ROOT, stdio: 'ignore' });
  started.push(child);
  for (let i = 0; i < 40 && !(await up(url)); i += 1) await new Promise((r) => setTimeout(r, 150));
}

async function open() {
  await ensure('http://127.0.0.1:8765/index.html', ['-m', 'http.server', '8765', '--bind', '127.0.0.1']);
  await ensure('http://127.0.0.1:8767/health', ['ask_server.py']);
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 390,
    minHeight: 600,
    title: 'Duly',
    backgroundColor: '#F8F7F4',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // Links that leave the prototype (uscis.gov, Study in the States) open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://127.0.0.1:8765')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://127.0.0.1:8765')) { event.preventDefault(); shell.openExternal(url); }
  });
  await win.loadURL(PAGE);
}

app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => started.forEach((c) => { try { c.kill(); } catch (e) { /* already gone */ } }));
