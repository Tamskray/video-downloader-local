const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

const binDir = () => path.join(app.getPath("userData"), "bin");
const ytName =
  process.platform === "win32"
    ? "yt-dlp.exe"
    : process.platform === "darwin"
      ? "yt-dlp_macos"
      : "yt-dlp";
const ytPath = () => path.join(binDir(), ytName);
const ffName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

let win,
  current = null;

function fetchFile(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "yt-local" } }, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location &&
          redirects > 0
        ) {
          res.resume();
          return resolve(fetchFile(res.headers.location, dest, redirects - 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error("HTTP " + res.statusCode));
        }
        const tmp = dest + ".part";
        const f = fs.createWriteStream(tmp);
        res.pipe(f);
        f.on("finish", () =>
          f.close(() => {
            fs.renameSync(tmp, dest);
            resolve();
          }),
        );
        f.on("error", reject);
      })
      .on("error", reject);
  });
}

async function ensureYtdlp() {
  if (fs.existsSync(ytPath())) return;
  fs.mkdirSync(binDir(), { recursive: true });
  await fetchFile(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${ytName}`, ytPath());
  if (process.platform !== "win32") fs.chmodSync(ytPath(), 0o755);
}

function ffmpegLocation() {
  // 1) вбудований ffmpeg-static (у зібраному .exe лежить поза asar)
  try {
    const p = require("ffmpeg-static").replace("app.asar", "app.asar.unpacked");
    if (p && fs.existsSync(p)) return p;
  } catch (_) {}
  // 2) запасний варіант: ffmpeg у системному PATH
  const r = spawnSync("ffmpeg", ["-version"]);
  return r.status === 0 ? "" : null; // '' = в PATH, null = немає
}

function runJson(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ytPath(), args);
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim().split("\n").pop() || "yt-dlp error"));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(e);
      }
    });
  });
}

ipcMain.handle("init", async () => {
  await ensureYtdlp();
  return { dir: app.getPath("downloads"), ffmpeg: ffmpegLocation() !== null };
});

ipcMain.handle("info", async (_e, url) => {
  const j = await runJson(["-J", "--no-playlist", url]);
  const heights = [
    ...new Set(
      (j.formats || []).filter((f) => f.height && f.vcodec !== "none").map((f) => f.height),
    ),
  ].sort((a, b) => b - a);
  return {
    title: j.title,
    channel: j.channel,
    thumb: j.thumbnail,
    duration: j.duration_string,
    heights,
  };
});

ipcMain.handle("pickDir", async () => {
  const r = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("openDir", (_e, dir) => shell.openPath(dir));

ipcMain.handle("update", async () => {
  await ensureYtdlp();
  return new Promise((resolve) => {
    const p = spawn(ytPath(), ["-U"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", () => resolve(out.trim().split("\n").pop()));
  });
});

function killCurrent() {
  if (!current) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(current.pid), "/T", "/F"]);
  } else {
    current.kill();
  }
}

ipcMain.handle("cancel", killCurrent);
app.on("before-quit", killCurrent);

ipcMain.handle("download", (_e, { url, height, audioOnly, dir }) => {
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--newline",
      "-P",
      dir,
      "-o",
      "%(title)s.%(ext)s",
      "--progress-template",
      "download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
    ];
    const ff = ffmpegLocation();
    if (ff) args.push("--ffmpeg-location", ff);
    if (audioOnly) {
      args.push("-x", "--audio-format", "mp3");
    } else {
      const h = height === "best" ? "" : `[height<=${height}]`;
      args.push(
        "-f",
        `bv*${h}+ba/b${h}`,
        "-S",
        "res,vcodec:h264,acodec:aac",
        "--merge-output-format",
        "mp4",
      );
    }
    args.push(url);

    current = spawn(ytPath(), args);
    let err = "";
    current.stdout.on("data", (d) => {
      for (const line of d.toString().split(/\r?\n/)) {
        if (line.startsWith("download:")) {
          const [pct, speed, eta] = line
            .slice(9)
            .split("|")
            .map((s) => s.trim());
          win.webContents.send("progress", { pct: parseFloat(pct) || 0, speed, eta });
        } else if (line.includes("[Merger]") || line.includes("[ExtractAudio]")) {
          win.webContents.send("progress", { pct: 100, speed: "", eta: "", status: "Processing…" });
        }
      }
    });
    current.stderr.on("data", (d) => (err += d));
    current.on("close", (code) => {
      current = null;
      code === 0 ? resolve(true) : reject(new Error(err.trim().split("\n").pop() || "Cancelled"));
    });
  });
});

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 560,
    height: 700,
    autoHideMenuBar: true,
    backgroundColor: "#14161a",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
});
app.on("window-all-closed", () => app.quit());
