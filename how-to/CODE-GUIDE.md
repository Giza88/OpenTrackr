# OpenTrackr code guide

Quick map for anyone reading or changing the website-development site.

## Start here

Run the site first: see START-UP-GUIDE.md in this folder.

The live site is everything inside website-development/. The index.html in the project root is an old demo and is not part of this submission.

## HTML pages

| File | Purpose | JavaScript loaded |
|------|---------|-------------------|
| index.html | Home: gallery, table, tips list, YouTube | theme.js, nav.js, home.js |
| about.html | About the project and author | theme.js, nav.js |
| tracker.html | Kanban, list, calendar, planners | theme.js, nav.js, app.js, planner.js, calendar-export.js, FullCalendar CDN |
| register.html | Register / log in form | theme.js, nav.js, script.js, calendar-export.js |
| settings.html | User preferences and templates | theme.js, nav.js, settings.js |

Navigation is copied into each HTML file. When you add a new page, copy the nav block from index.html and set class="active" on the current link.

Footer text is also copied on each page. Change it in every HTML file, or search the project for the old text.

## Styles

css/styles.css — shared by all pages.

Useful classes for the home page:

- .content-table — styled weekly planning table
- .content-list — ordered/unordered lists; Roman numerals use list-style-type here
- .video-wrapper — YouTube iframe sizing
- .site-footer — centred footer bar

Page backgrounds use body classes: home-page, about-page, tracker-page, register-page, settings-page.

Dark mode: theme.js sets data-theme="dark" on the html element.

## JavaScript files

| File | Role |
|------|------|
| theme.js | Light/dark toggle and font; runs on every page |
| nav.js | Nav link click animation |
| home.js | Home gallery modal; topics object must match data-topic on gallery cards |
| script.js | Register page: validation, login, localStorage account |
| app.js | TaskTracker class: tasks, Kanban, calendar, notifications |
| planner.js | Quick to-do, daily planner, task planner on tracker page |
| settings.js | Settings page controls |
| calendar-export.js | Export tasks to .ics file (OpenTrackrCalendar global) |

## localStorage keys (browser storage)

| Key | Used by | Stores |
|-----|---------|--------|
| openTrackr_account | script.js, settings.js | Registered user details |
| openTrackr_loggedIn | script.js | Whether user is logged in |
| openTrackr_font | theme.js, settings.js | Font choice |
| taskTracker_theme | theme.js, app.js | light or dark |
| taskTracker_tasks | app.js, calendar-export.js | Task list |
| taskTracker_categories | app.js, settings.js | Kanban column names |
| taskTracker_viewMode | app.js | kanban, list, or calendar |
| openTrackr_quickTodos | planner.js | Quick to-do items |
| openTrackr_dailyPlannerDraft | planner.js | Daily planner fields |
| openTrackr_taskPlanner | planner.js | Task planner rows |

Clear site data in browser DevTools > Application > Local Storage if you need a fresh start while testing.

## Common changes

Add a nav link

Edit the nav block in every HTML file. Add matching styles under .site-nav in css/styles.css if you want a custom hover colour (see nav-link--home, etc.).

Change the YouTube video

Edit the iframe src in index.html. Use https://www.youtube.com/embed/VIDEO_ID format.

Change Roman numeral style

Edit .content-list list-style-type in css/styles.css (lower-roman or upper-roman).

Add a gallery topic on the home page

Add a new button.gallery-card in index.html with data-topic="id", then add a matching entry in the topics object in home.js.

Add a new page

Copy about.html structure, update nav active class, body class, and scripts at the bottom.

## Images

Site images live in website-development/images/. Source URLs for the gallery are listed in IMAGE_SOURCES.txt.

## Author

Stefan Gislason — BIT503 Assessment 3, Open Polytechnic
