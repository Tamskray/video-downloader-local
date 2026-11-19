# Video Downlaoder Local

A small local desktop app for downloading videos in full quality.

Built with Electron and [yt-dlp](https://github.com/yt-dlp/yt-dlp). FFmpeg is bundled via `ffmpeg-static`, so nothing besides Node.js has to be installed manually.

> For personal use only. Downloading content may violate the terms of service of the source site. Respect copyright.

## Features

- Paste a link, preview the title and thumbnail
- Pick from the qualities actually available for that video
- Video (mp4) or audio only (mp3)
- Progress, speed and ETA, cancel at any time
- Choose the download folder
- One-click yt-dlp update

## Requirements

- [Node.js](https://nodejs.org/) 22 LTS (recommended)

## Getting started

```bash
npm install
npm start
```

On the first launch the app downloads `yt-dlp` automatically into:

```
%APPDATA%\yt-local\bin
```

This folder lives outside the project, so reinstalling `node_modules` does not affect it.

### Optional: launcher (Windows)

Create `start.bat` in the project folder and make a shortcut to it:

```bat
@echo off
cd /d %~dp0
start "" /min cmd /c npm start
```

## Updating yt-dlp

When downloads suddenly stop working (errors like "unable to extract", HTTP 403, "Sign in to confirm you're not a bot"), YouTube has most likely changed something. Click **Update yt-dlp** in the app.

If that does not help, delete `yt-dlp.exe` from the folder above. The app will download the latest version on the next launch.

## Troubleshooting

### `Electron failed to install correctly`

Sometimes the Electron install script finishes without errors but leaves `node_modules/electron/dist` incomplete (no `electron.exe`, no `path.txt`). Install the binary manually:

1. Check the installed version in `node_modules/electron/package.json`.
2. Download the matching archive from the Electron releases page, e.g. `electron-v<version>-win32-x64.zip`:
   `https://github.com/electron/electron/releases`
3. Run in PowerShell from the project root (adjust the file name):

```powershell
Remove-Item -Recurse -Force node_modules\electron\dist
Expand-Archive -Path "$env:USERPROFILE\Downloads\electron-v<version>-win32-x64.zip" -DestinationPath node_modules\electron\dist
Set-Content -NoNewline -Path node_modules\electron\path.txt -Value "electron.exe"
```

Notes:

- This is a workaround, not a normal setup step. Most installs work with plain `npm install`.
- The archive version must match the installed Electron version. The version is pinned in `package.json`, so the archive only needs to change when you bump Electron.
- Deleting `node_modules` removes these files, so repeat the steps after a clean install.
