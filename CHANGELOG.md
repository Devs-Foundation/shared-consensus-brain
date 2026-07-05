# Changelog

All notable changes to **Shared Consensus Brain** (*Cerebro Vivo*). This app is **100% local** — it is never published or exposed on the web.

## Foundation update — 2026-07

A large update that turns the app from a "pretty viewer" into a real **working tool**, with a reliability foundation as solid as the brain concept itself.

### Added

- **New note** — create a note straight from the editor: name it, pick a destination folder, and it opens immediately so nothing is ever "lost". Duplicate names are avoided.
- **Favorites** — star any note; the star reacts instantly and a **Favorites** tab lists everything marked. Favorites live in a small local app file and never modify your Markdown.
- **Local file browser** — walk the brain's folders as a tree and open any `.md` directly.
- **Check brain** — a health report that **classifies** issues instead of one flat "broken links" total: **actionable broken links** vs **expected/noise references** (assets & attachments, external URLs written as wikilinks, placeholders/templates, private/local and directory references), plus orphans, **actionable vs expected duplicate note names**, and malformed frontmatter — so real problems stand out from the noise.
- **See changes** — shows the current `git diff` of the loaded brain before you sync.
- **Backups manager** — create a full backup on demand, see existing backups (date + size), and delete the ones you no longer need (confirmed, and kept inside the backups folder).

### Improved

- **Graph labels render by title / `name:`**, never by generic filename — so many `SKILL.md` / index files no longer show as identical, overlapping nodes.
- **Node labels are always clean, readable text (never stretched);** main hubs are slightly stabilized to stop "fight for space" glitches.
- **Indexer skips `.archive` and `_BACKUPS`** (in addition to `.git`, `node_modules`, …) — a cleaner graph and an accurate **Brain size**.
- **Save graph** exports a branded PNG (Dev's Foundation watermark + a live-metrics panel).
- **Brain size** reflects the real weight of the *loaded folder*, not the whole disk.

### Fixed — the anti‑fright layer

- API responses are no longer assumed to be valid JSON — a plain-text or unexpected error becomes a **clean, readable message** instead of a raw `Unexpected token …`.
- **Guarded brain loading** — a bad path or a failed request never leaves the interface stuck.
- **Dedicated error handling** for every write action (save, delete, new note, favorite) and every tool (Check, Backups, Sync, Logs) — failures show up legibly in the **Logs** instead of contaminating the graph state.
- The **private path of the computer is never printed** in logs, screenshots or documentation.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b></sub>
