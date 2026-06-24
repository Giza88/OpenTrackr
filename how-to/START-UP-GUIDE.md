# OpenTrackr — Local Start-Up Guide

**Author:** Stefan Gislason  
**Course:** BIT503 Fundamentals of Information Technology, Open Polytechnic  
**Assessment:** Website Development (Assessment 3)

This guide explains how to open and run the OpenTrackr website on your computer so you can review all pages in a browser.

---

## Before you start

### Which folder is the website?

The **assessment website** is in:

```
OpenTrackr/website-development/
```

This folder contains `index.html`, `about.html`, `tracker.html`, `register.html`, `settings.html`, CSS, JavaScript, and images.

> **Important:** The file `OpenTrackr/index.html` in the **project root** is a separate legacy task-tracker demo. It is **not** the BIT503 submission site. Always use **`website-development/`**.

### What you need installed

| Requirement | Why |
|-------------|-----|
| **Python 3** (3.8 or newer) | Runs a simple local web server |
| **A modern browser** (Chrome, Edge, or Firefox) | To view the site |
| **Internet connection** | Required for the embedded YouTube video on the home page |

### Check Python is installed

Open **PowerShell** or **Terminal** and run:

```powershell
python --version
```

You should see something like `Python 3.13.x`.  
If that fails, try:

```powershell
py --version
```

If Python is not installed, download it from [https://www.python.org/downloads/](https://www.python.org/downloads/) and tick **“Add Python to PATH”** during installation.

---

## Quick start (recommended for markers)

### Windows — double-click method

1. Open the `how-to` folder inside this project.
2. **Right-click** `start-server.ps1` → **Run with PowerShell**.
3. If Windows asks about running the script, choose **Run** or **Yes**.
4. A PowerShell window opens (this is the server — **leave it open**).
5. Your browser should open automatically to the home page.

**Site URL:** [http://127.0.0.1:8765/index.html](http://127.0.0.1:8765/index.html)

To stop the server: go to the PowerShell window and press **Ctrl + C**, or close that window.

---

## Manual start-up (step by step)

Use this method if the script does not work or you prefer to run commands yourself.

### Step 1 — Open a terminal

- **Windows:** Press **Win + X** → **Terminal** or **PowerShell**
- **Mac:** Open **Terminal** from Applications → Utilities

### Step 2 — Go to the website folder

Replace the path below with the actual location where you extracted or cloned the project:

```powershell
cd "C:\path\to\OpenTrackr\website-development"
```

**Example (if the project is on the Desktop):**

```powershell
cd "$env:USERPROFILE\Desktop\OpenTrackr\website-development"
```

### Step 3 — Start the local server

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

You should see:

```
Serving HTTP on 127.0.0.1 port 8765 ...
```

**Leave this terminal window open** while you browse the site. Closing it stops the server.

### Step 4 — Open the browser

Open your browser and go to:

```
http://127.0.0.1:8765/index.html
```

Or use:

```
http://localhost:8765/index.html
```

---

## Pages to review

| Page | URL |
|------|-----|
| **Home** | [http://127.0.0.1:8765/index.html](http://127.0.0.1:8765/index.html) |
| **About** | [http://127.0.0.1:8765/about.html](http://127.0.0.1:8765/about.html) |
| **Task Tracker** | [http://127.0.0.1:8765/tracker.html](http://127.0.0.1:8765/tracker.html) |
| **Register / Log in** | [http://127.0.0.1:8765/register.html](http://127.0.0.1:8765/register.html) |
| **Settings** | [http://127.0.0.1:8765/settings.html](http://127.0.0.1:8765/settings.html) |

Use the **navigation bar** at the top of each page to move between sections.

---

## What to look for on the home page

The home page (`index.html`) includes the assessment features:

- Navigation with an **About** link
- Image gallery with interactive planning tips
- **Sample Weekly Planning Template** (styled HTML table)
- **Five Daily Planning Tips** (ordered list with **Roman numerals**: i, ii, iii…)
- Embedded **YouTube** video under “Productivity and Task Tracking”
- **Footer** with author name and due date (centred at the bottom)

---

## Stopping the server

1. Click the **PowerShell / Terminal window** where the server is running.
2. Press **Ctrl + C**.
3. Confirm if prompted.

The browser tab can stay open, but the site will not load again until you restart the server.

---

## Troubleshooting

### “python is not recognized”

Python is not installed or not on your PATH.

- Install Python from [python.org](https://www.python.org/downloads/)
- During install, enable **Add Python to PATH**
- Close and reopen PowerShell, then try again

### “Address already in use” or port 8765 busy

Another program (or a previous server) is using port 8765.

**Option A — Use a different port:**

```powershell
python -m http.server 8888 --bind 127.0.0.1
```

Then open: `http://127.0.0.1:8888/index.html`

**Option B — Stop the old server:**

Close any PowerShell window that is still running a Python server, then start again.

### Browser shows “Connection refused” or page will not load

1. Confirm the server terminal still shows `Serving HTTP on 127.0.0.1 port 8765`.
2. Check the URL uses **`127.0.0.1`** or **`localhost`**, not a `file:///` path.
3. Make sure you started the server from **`website-development`**, not the project root.

### Page looks wrong or styles are missing

- Hard refresh: **Ctrl + F5** (Windows) or **Cmd + Shift + R** (Mac)
- Confirm you are viewing **`website-development/index.html`** via `http://127.0.0.1:8765/`, not the root `index.html`

### YouTube video does not play

- Check your **internet connection**
- Some school or work networks block YouTube embeds
- The rest of the site works without the video

### PowerShell script will not run (execution policy)

If `start-server.ps1` is blocked, run this **once** in PowerShell (as your user):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then try running the script again.

Or use the **manual start-up** steps above instead.

### Opening HTML files directly (without a server)

You can double-click `website-development/index.html` to open it in a browser using a `file:///` address. This works for basic viewing, but a **local server is recommended** because:

- Navigation and relative paths behave more reliably
- This matches how the site was developed and tested

---

## Mac / Linux commands

From the `website-development` folder:

```bash
cd /path/to/OpenTrackr/website-development
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open: [http://127.0.0.1:8765/index.html](http://127.0.0.1:8765/index.html)

---

## Project folder overview

```
OpenTrackr/
├── how-to/                    ← This guide and start script
│   ├── START-UP-GUIDE.md
│   └── start-server.ps1
├── website-development/       ← BIT503 assessment website (open this)
│   ├── index.html             Home page
│   ├── about.html             About page
│   ├── tracker.html           Task tracker + calendar
│   ├── register.html          Registration / log in
│   ├── settings.html          User settings
│   ├── css/styles.css         Shared styles
│   ├── images/                Site images
│   └── *.js                   Page scripts
├── README.md                  Project summary
├── index.html                 Legacy demo (not the submission site)
└── package.json               Optional Vite setup (not required for marking)
```

---

## Optional: Vite dev server (not required)

The project root includes a Vite setup for an older demo app. **Markers do not need this** to review the assessment site.

If you prefer Node.js:

```powershell
cd OpenTrackr
npm install
npm run dev
```

This serves the **root** project, not `website-development/`. For Assessment 3 marking, use the Python server method described above.

---

## Contact

**Stefan Gislason** — BIT503, Open Polytechnic

If anything in this guide does not match your copy of the project, check that you are in the **`website-development`** folder before starting the server.
