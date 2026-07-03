<h1 align="center">🧠 Shared Consensus Brain</h1>

<p align="center">
  <b>A living window over your shared brain.</b><br/>
  See, search, read and edit your entire knowledge base as a graph — <b>100% local. Nothing ever leaves your machine.</b>
</p>

<p align="center">
  <i>Part of</i> <b>Dev's Foundation</b> · <a href="https://devs.foundation">devs.foundation</a>
</p>

<!-- IMAGE: screenshot final (versao limpa, sem nome de maquina) -->
<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## You need a brain (this is a viewer, not the brain)

This app **does not come with a brain and does not work without one.** A "brain" is just a **folder of Markdown notes** linked by `[[wikilinks]]` — the shared memory behind the **multi-agent consensus method**:

> 👉 **[github.com/Devs-Foundation/multi-agent-consensus-method](https://github.com/Devs-Foundation/multi-agent-consensus-method)**

That repo explains **how the shared brain works** (git-synced memory, `_CORREIO` mailbox, `_CONSENSO` decisions). **This app is the window over it.** No brain, nothing to show — on first run it **asks you for your brain folder** and reads *that*. Nothing is hardcoded.

## Local by design (this is the point)

Your brain holds your private notes, so the tool runs **entirely on your own machine**:

- 🔒 **Nothing leaves your computer** — no cloud, no accounts, no tracking.
- 👀 **Viewing never changes anything.** The brain is only modified when you edit a note and hit **Save** — and it makes an **automatic backup first**.
- 🚫 **No public web interface.** Because it can read *and write* your whole brain, it is never exposed online. Local, always.
- 🖥️ **Runs on any PC.** It is *not* built around one machine or one folder — you point it at your own brain.

## What it does

- 🕸️ **Brain graph** — every note is a node, every `[[link]]` an edge; pan, zoom and drag.
- 🔎 **Obsidian-style search** — by title, folder and content; clickable results.
- 📄 **Read** a note, then jump **back** to the graph.
- ✏️ **Edit & save** — with an **automatic backup** of the original before any change.
- 🎛️ **Tunable look** — colors, background, node size, labels, motion (never touches your files).
- 🧭 **Views** (growing): hubs, orphans, broken links.

## The dashboard

A live panel on the left. **Every number is measured from the brain you loaded** — never hardcoded, never invented. When a value genuinely can't be computed (e.g. the folder isn't a git repo), the card shows `n/a` instead of guessing.

| Card | What it is | How it's obtained |
|---|---|---|
| **Files** | Markdown notes in the brain | count of every indexed `.md` file |
| **Links** | connections between notes | number of `[[wikilinks]]` that **resolve** to an existing note (graph edges) |
| **Folders** | how the brain is organized | count of top-level folders |
| **Skills** | reusable knowledge units | notes that live in the skills area of the brain |
| **Contributors** | who writes the brain | distinct authors read from the folder's **git history** (`n/a` if not a git repo) |
| **Orphans** | isolated notes | nodes with **no** resolved link in or out — nothing points to them and they point to nothing |
| **Words** | total volume of knowledge | sum of the word count of every note |
| **Messages** | mailbox activity | entries found in the `_CORREIO` mailbox folder, if the brain uses one (`n/a` otherwise) |
| **Brain days** | how old the brain is | span of the **git history**, first commit to last, in days |

Above the cards, a **local monitor** watches the folder on disk and tells you when files change, with a **Reload** button to re-index.

### Brain Master Dashboard

A strip showing the **host machine the brain runs on**, read live from the operating system: **CPU**, **CPU load**, **RAM** in use, **disk** used/free, and a **brain growth** estimate (how much room is left before the disk fills). It answers "can this machine keep hosting the brain?" at a glance. All local — these readings never leave the computer.

### Top controls

- **Sync** — pull/refresh the brain from its shared source.
- **Logs** — open the activity/log window.
- **Change folder** — point the app at a different brain.
- **Hide dashboard** — collapse the panel for a full-screen graph.
- **Open reader** — jump into reading/editing mode.

## Getting started

You need **[Node.js](https://nodejs.org)** installed. No other dependencies.

- **Windows** — double-click **`abrir-cerebro-vivo.bat`** (opens it as a desktop-style window).
- **Any OS** — run `node server.js`, then open **http://127.0.0.1:8787** in your browser.

The app stays on `127.0.0.1` (your machine only). Stop it by closing the server window.

## How to use

1. Open Shared Consensus Brain.
2. Point it at your **brain folder** (asked on first run).
3. **Load** → the graph appears.
4. Explore, search, click a note to **read** it.
5. Need a fix? **Edit** → **Save** (backs up, then writes).
6. **Close** and return to the map.

## Requirements

Just a folder of Markdown notes and a way to run the app. Cross-platform. No account, no cloud, nothing to configure to start. (If the folder is a git repo, you also get *Contributors* and *Brain days*.)

---

<p align="center"><sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub></p>
