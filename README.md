# OpenTrackr

A simple, smart productivity app that helps you stay organised with tasks, to-do lists, and a built-in calendar. Create tasks, set priorities, track deadlines, and personalise your workflow with themes and preferences. Designed to boost focus, manage study or work, and keep your day on track.

**Repository:** [github.com/Giza88/OpenTrackr](https://github.com/Giza88/OpenTrackr)

## Features

- **Home page** — planning tips, weekly template, YouTube guide, interactive topic cards
- **Task tracker** — Kanban board, list view, FullCalendar, quick to-do list
- **Planner templates** — daily planner and task planner (auto-saved in browser)
- **Registration** — HTML5 + JavaScript form validation
- **Themes** — light and dark mode

## Project structure

```
website-development/     ← main site (BIT503 Assessment 3 submission)
├── index.html           Home page
├── tracker.html         Task tracker + calendar + planners
├── register.html        Registration form
├── home.js              Interactive planning tips
├── app.js               Task tracker logic
├── planner.js           To-do list and planner templates
├── script.js            Registration validation
├── css/styles.css       Shared styles
└── images/              Site images
```

## Run locally

**For markers / lecturers:** see the **[how-to/START-UP-GUIDE.md](how-to/START-UP-GUIDE.md)** folder for full start-up instructions, or on Windows right-click **`how-to/start-server.ps1`** → **Run with PowerShell**.

Open the site with any static server from the `website-development` folder:

```powershell
cd website-development
python -m http.server 8765
```

Then visit [http://localhost:8765/index.html](http://localhost:8765/index.html)

Or use the Vite dev server from the project root (legacy setup):

```powershell
npm install
npm run dev
```

## Author

Stefan Gislason — BIT503 Fundamentals of Information Technology, Open Polytechnic
