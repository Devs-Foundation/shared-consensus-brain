> 🌐 **English** · [Português](README.pt.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [中文](README.zh.md)

# Shared Consensus Brain

*Also known as **Cerebro Vivo**.*

A **100% local** window over a Markdown/git "brain": a living graph you can search, read, **create**, edit, **favorite** and sync — with automatic backups, **brain validation**, real metrics and machine stats. It is an **admin and demonstration tool**, not a replacement for your everyday editor.

> **Part of [Dev's Foundation](https://github.com/Devs-Foundation).** The "brain" is the shared memory behind the **[multi-agent consensus method](https://github.com/Devs-Foundation/multi-agent-consensus-method)**. This app is a *viewer* over that memory — **it needs a brain (a folder of Markdown notes) to run.**

> ▶️ **Runs 100% locally** — open http://127.0.0.1:8787 in your browser (double‑click `abrir-cerebro-vivo.bat` on Windows, or run `node server.js`).

<p align="center"><img src="docs/dashboard.webp" alt="Shared Consensus Brain — dashboard tool" width="900"/></p>

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## Overview

A "brain" is just a folder of Markdown notes linked by `[[wikilinks]]`. Shared Consensus Brain turns that folder into:

- a **living graph** — every note is a node, every resolved link an edge;
- a **search + reader + editor** — find a note, open it, fix it, save it (with a backup first);
- a **live dashboard** — real metrics measured from the brain you loaded, plus stats about the machine hosting it.

Everything runs on your own computer. Nothing is sent anywhere.

## Security & privacy (read this first)

The app can **read and write your entire vault**, so it is treated as a sensitive surface:

- **Local only.** The server binds to `127.0.0.1` (loopback) — never `0.0.0.0`, never a public port.
- **Never exposed.** Do **not** put this app on a VPS, a public domain, or any open web interface. If a public version is ever needed, it must be a **static, read‑only, filtered export** — never the live app.
- **No private data in the code.** No real machine paths, usernames, IPs, tokens, passwords or private folder names are hardcoded anywhere. The brain folder is chosen by the user at runtime.
- **Portable.** It is not built around one machine or one folder — point it at your own brain. After a brain loads, the UI simply reads `BRAIN LOADED`.

## Requirements

- **[Node.js](https://nodejs.org)** — no other mandatory dependencies.
- A folder of Markdown notes (optionally a git repository — that unlocks *contributors* and *brain days*).

## Getting started

### Windows (app‑window mode, recommended)

Double‑click **`abrir-cerebro-vivo.bat`**. It starts the local server and opens the app as a desktop‑style window (Edge / Chrome / Brave in `--app` mode).

### Any OS (manual mode)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

Then open **http://127.0.0.1:8787** in your browser.

The port can be overridden with the `PORT` environment variable. The host is always `127.0.0.1`.

## Choosing the brain folder (first run)

The app starts with **no brain loaded** and asks for one:

1. Type or paste your **Brain folder** path in the top bar.
2. Click **Load brain**.
3. The choice is stored only in the browser's local storage on that machine — never committed, never sent.
4. To switch brains, change the path and load again.

Use generic example paths in any documentation, never real ones:

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

When indexing, these folders are ignored: `.git`, `.obsidian`, `node_modules`, `_BACKUPS`, `.trash`, `.cache`.

## Using the app

### Graph

- Nodes are `.md` files; edges are **resolved** links (`[[wikilinks]]`, `[[file|alias]]`, and Markdown links to `.md`). Broken links are **not** drawn.
- **Drag** empty space to pan · **scroll** to zoom · **drag a node** to move it · **double‑click** to fit the whole graph.
- **Show titles** toggles labels · **Motion** and **Node size** sliders tune the look · **Background / Nodes / Links** set colors. None of this touches your files. Node labels render as clean, readable text (never stretched).
- **Hide dashboard** and **Open reader** give you a clean, full‑stage graph.
- **Save graph** — export the current view as a branded PNG (Dev's Foundation watermark + a panel with the live metrics: files, links, folders, skills, contributors, orphans, words, messages, brain days, Brain size). Right-click the canvas for a plain image.
- A **local monitor** ("No new changes" / "N brain changes" + **Reload**) watches the folder and lets you re‑index when files change on disk.

### Search

Type in **Search** to filter by title, folder and note content. Results are clickable and jump straight to the note.

### Reader & editor

- **Click a node** (or **Open reader**) to open a note in the **Read** tab.
- Switch to the **Edit** tab, make changes, and click **Save**.
- **Close reader** returns you to the graph.
- Only `.md` files inside the loaded brain can be opened or written (path‑traversal is blocked).

### New note

Create a note straight from the editor — the **New note** tab lets you name it, pick a destination folder, and it opens immediately in the editor so a fresh note never gets "lost" somewhere you can't find it. Duplicate names are avoided.

### Favorites

Star any note to mark it as a favorite (the star changes state instantly). The **Favorites** tab lists everything you've marked, for one‑click access. Favorites are kept in a small local app file — they do **not** modify your Markdown notes.

### File browser

A local file browser lets you walk the brain's folders as a tree and open any `.md` file directly — handy on large brains where the graph alone is a lot to scan.

## Backups

Before **every** save, the original file is copied first, then the new content is written. Backups live **inside the brain folder**:

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

To revert an edit, copy the backup back over the note. `_BACKUPS/` is ignored by the indexer and must be excluded when packaging.

The **Backups** button opens a small manager where you can **create** a full backup on demand, **see** the backups you already have (with date and size), and **delete** the ones you no longer need — deletion is confirmed and stays inside the backups folder.

## Logs

Local activity is appended to:

```text
logs/events.jsonl
```

Events include graph indexing, file opened, file saved (with the backup path), and manual sync start / done / failed. Open the **Logs** window to view them, and use **Clear logs** to reset. Logs are local; they must never contain secrets or absolute private paths that could be shared.

## Sync (Git)

The **Sync** button runs Git **only when you press it**, in the loaded brain folder:

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. if there are changes → `git add -A`, `git commit`, `git push origin master`
4. the last commit and every step are shown in the **Logs** window

Use it only when the loaded folder is a valid git clone with the right remote. It never syncs silently, and it never hides errors.

## Maintenance tools

Alongside **Sync** and **Logs**, the toolbar has:

- **See changes** — shows the current `git diff` of the loaded brain, so you can review exactly what changed before you sync.
- **Check brain** — a health report of the loaded brain that **classifies** issues instead of dumping one big "broken links" total: **actionable broken links** vs **expected/noise references** (assets & attachments, external URLs written as wikilinks, placeholders/templates, private/local and directory references), plus orphans, **actionable vs expected duplicate note names**, and malformed frontmatter. Real problems stand out from the expected noise.
- **Backups** — the on‑demand backup manager described above.

All of these run **locally and on demand**, and report their result in the **Logs** window.

## Reliability — the anti‑fright layer

Every button either reads, writes, deletes, backs up, syncs or opens files — so the app is built so **nothing fails silently, nothing creates junk, and no error dumps raw text on screen**:

- Responses are never assumed to be perfect JSON. If an action returns plain text or an unexpected error, it becomes a **clean, readable message** instead of a raw `Unexpected token …`.
- Brain loading is **guarded** so a bad path or a failed request never leaves the interface stuck.
- Write actions (save, delete, new note, favorite) and the maintenance tools (Check, Backups, Sync, Logs) each have **dedicated error handling** — when something fails, the failure shows up **legibly in the Logs** instead of contaminating the graph state.
- The indexer **skips backups and technical clutter** (`.git`, `_BACKUPS`, `.archive`, `node_modules`, …) so they never pollute the graph or the counts.
- The private path of your computer is **never printed** in logs, screenshots or documentation.

## Metrics

Every number is **measured from the brain you loaded — nothing is hardcoded**. A card shows `n/a` only when a value genuinely cannot be computed.

| Card | Meaning | How it is measured |
|---|---|---|
| **Files** | Markdown notes | count of indexed `.md` files |
| **Links** | connections in the graph | resolved `[[wikilinks]]` / Markdown links |
| **Folders** | structure | folders that contain Markdown |
| **Skills** | reusable knowledge units | **counted in real time**: `SKILL.md` files under `_CONHECIMENTO/skills`, **plus** the external `browse.sh` total read from `MASTER_SKILLS.md` — so a brand‑new skill is picked up even before the index is regenerated |
| **Contributors** | who writes the brain | **unique authors from git history** (`git log`); `n/a` if the folder is not a git repo. This measures commit authors, not who pushed — never a fixed number |
| **Orphans** | isolated notes | nodes with degree 0 (no resolved link in or out) |
| **Words** | volume of knowledge | real sum of words across all notes (frontmatter and code blocks excluded) |
| **Messages** | mailbox activity | `.md` messages in a `_CORREIO` folder, if one exists; otherwise `n/a` |
| **Brain days** | how old the brain is | days since the first git commit; `n/a` if not a git repo |

### Brain Master Dashboard

A panel with stats about the **machine hosting the brain** (CPU model and cores, CPU load, RAM) plus **Brain size** and a **brain growth** estimate.

**Brain size** is the total weight of the **loaded brain folder** — the sum of the files inside that vault, measured recursively on the server and cached for ~60 s. It is **not** the disk space of the whole computer, and it shows `n/a` when no folder is loaded.

The **brain growth** figure is a rough estimate based on average note size — **local and informational**, **not** a promise of infinite storage. Persistent, expandable memory comes from disk and git, not from magic.

## Packaging

To share the app without leaking anything:

1. Copy **only the app files** into a clean folder (`server.js`, `public/`, `abrir-cerebro-vivo.bat`, `README.md`).
2. **Exclude** `logs/`, `_BACKUPS/`, `node_modules/`, any local config, and anything containing a real machine path.
3. Verify there are no private paths or secrets, e.g.:

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. Zip it and list the contents to confirm.

## Troubleshooting

- **Port already in use** — another instance is running, or set a different port: `PORT=8788 node server.js`.
- **UI looks stale after an update** — hard‑refresh the page; the HTML uses a cache‑busting version (`?v=`) that bumps when CSS/JS changes.
- **Contributors / Brain days show `n/a`** — the brain folder is not a git repository (expected).
- **Messages show `n/a`** — there is no `_CORREIO` folder in the brain (expected).
- **Nothing is indexed** — check the Brain folder path and that it contains `.md` files.
- **Sync errors** — open the **Logs** window; every git step and error is shown there, never hidden.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
