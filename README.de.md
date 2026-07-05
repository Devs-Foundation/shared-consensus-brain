> 🌐 [English](README.md) · [Português](README.pt.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [中文](README.zh.md)

# Shared Consensus Brain

*Auch bekannt als **Cerebro Vivo**.*

Ein **100 % lokales** Fenster auf ein Markdown/git-„Brain": ein lebendiger Graph, den man durchsuchen, lesen, **erstellen**, bearbeiten, **favorisieren** und synchronisieren kann — mit automatischen Backups, **Brain-Validierung**, echten Metriken und Maschinenstatistiken. Es ist ein **Admin- und Demonstrationswerkzeug**, kein Ersatz für den alltäglichen Editor.

> **Teil von [Dev's Foundation](https://github.com/Devs-Foundation).** Das „Brain" ist das gemeinsame Gedächtnis hinter der **[multi-agent consensus method](https://github.com/Devs-Foundation/multi-agent-consensus-method)**. Diese App ist ein *Viewer* über dieses Gedächtnis — **sie braucht ein Brain (einen Ordner mit Markdown-Notizen), um zu laufen.**

> ▶️ **Läuft 100 % lokal** — öffne http://127.0.0.1:8787 im Browser (Doppelklick auf `abrir-cerebro-vivo.bat` unter Windows, oder `node server.js` ausführen).

<p align="center"><img src="docs/dashboard.webp" alt="Shared Consensus Brain — dashboard tool" width="900"/></p>

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## Überblick

Ein „Brain" ist einfach ein Ordner mit Markdown-Notizen, die über `[[wikilinks]]` verknüpft sind. Shared Consensus Brain verwandelt diesen Ordner in:

- einen **lebendigen Graphen** — jede Notiz ist ein Knoten, jeder aufgelöste Link eine Kante;
- eine **Such- + Lese- + Bearbeitungsfunktion** — eine Notiz finden, öffnen, korrigieren, speichern (vorher mit Backup);
- ein **Live-Dashboard** — echte Metriken, gemessen am geladenen Brain, sowie Statistiken über die Maschine, die es hostet.

Alles läuft auf dem eigenen Computer. Nichts wird irgendwohin gesendet.

## Sicherheit & Datenschutz (zuerst lesen)

Die App kann das **gesamte Vault lesen und beschreiben**, daher wird sie als sensible Oberfläche behandelt:

- **Nur lokal.** Der Server bindet an `127.0.0.1` (Loopback) — niemals `0.0.0.0`, niemals einen öffentlichen Port.
- **Niemals exponiert.** Diese App **nicht** auf einem VPS, einer öffentlichen Domain oder einer offenen Web-Oberfläche betreiben. Falls jemals eine öffentliche Version nötig sein sollte, muss es ein **statischer, nur-lesbarer, gefilterter Export** sein — niemals die Live-App.
- **Keine privaten Daten im Code.** Es sind nirgendwo echte Maschinenpfade, Benutzernamen, IPs, Tokens, Passwörter oder private Ordnernamen hartcodiert. Der Brain-Ordner wird zur Laufzeit vom Benutzer gewählt.
- **Portabel.** Sie ist nicht auf eine Maschine oder einen Ordner zugeschnitten — man richtet sie auf das eigene Brain aus. Nach dem Laden eines Brains zeigt die UI einfach `BRAIN LOADED`.

## Voraussetzungen

- **[Node.js](https://nodejs.org)** — keine weiteren zwingenden Abhängigkeiten.
- Ein Ordner mit Markdown-Notizen (optional ein Git-Repository — das schaltet *Contributors* und *Brain Days* frei).

## Erste Schritte

### Windows (App-Fenster-Modus, empfohlen)

Doppelklick auf **`abrir-cerebro-vivo.bat`**. Damit wird der lokale Server gestartet und die App als Desktop-artiges Fenster geöffnet (Edge / Chrome / Brave im `--app`-Modus).

### Beliebiges Betriebssystem (manueller Modus)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

Dann **http://127.0.0.1:8787** im Browser öffnen.

Der Port kann mit der Umgebungsvariable `PORT` überschrieben werden. Der Host ist immer `127.0.0.1`.

## Den Brain-Ordner auswählen (erster Start)

Die App startet **ohne geladenes Brain** und fragt nach einem:

1. Den Pfad zum **Brain folder** in der oberen Leiste eingeben oder einfügen.
2. Auf **Load brain** klicken.
3. Die Wahl wird nur im lokalen Speicher des Browsers auf dieser Maschine gespeichert — niemals committet, niemals gesendet.
4. Um das Brain zu wechseln, den Pfad ändern und erneut laden.

In jeder Dokumentation generische Beispielpfade verwenden, niemals echte:

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

Beim Indexieren werden folgende Ordner ignoriert: `.git`, `.obsidian`, `node_modules`, `_BACKUPS`, `.trash`, `.cache`.

## Die App benutzen

### Graph

- Knoten sind `.md`-Dateien; Kanten sind **aufgelöste** Links (`[[wikilinks]]`, `[[file|alias]]`, und Markdown-Links zu `.md`). Defekte Links werden **nicht** gezeichnet.
- **Ziehen** im leeren Bereich zum Verschieben · **Scrollen** zum Zoomen · **einen Knoten ziehen**, um ihn zu bewegen · **Doppelklick**, um den gesamten Graphen einzupassen.
- **Show titles** schaltet Beschriftungen um · **Motion**- und **Node size**-Regler passen das Erscheinungsbild an · **Background / Nodes / Links** legen Farben fest. Nichts davon berührt die eigenen Dateien. Knoten-Beschriftungen werden als sauberer, lesbarer Text dargestellt (nie gestreckt).
- **Hide dashboard** und **Open reader** geben einen klaren, vollflächigen Graphen.
- **Save graph** — exportiert die aktuelle Ansicht als gebrandetes PNG (Dev's-Foundation-Wasserzeichen + ein Panel mit den Live-Metriken: files, links, folders, skills, contributors, orphans, words, messages, brain days, Brain size). Rechtsklick auf das Canvas für ein einfaches Bild.
- Ein **lokaler Monitor** („No new changes" / „N brain changes" + **Reload**) beobachtet den Ordner und erlaubt eine Neu-Indexierung, wenn sich Dateien auf der Festplatte ändern.

### Suche

In **Search** tippen, um nach Titel, Ordner und Notizinhalt zu filtern. Ergebnisse sind anklickbar und springen direkt zur Notiz.

### Reader & Editor

- **Auf einen Knoten klicken** (oder **Open reader**), um eine Notiz im **Read**-Tab zu öffnen.
- Zum **Edit**-Tab wechseln, Änderungen vornehmen und auf **Save** klicken.
- **Close reader** bringt zurück zum Graphen.
- Nur `.md`-Dateien innerhalb des geladenen Brains können geöffnet oder beschrieben werden (Path-Traversal wird blockiert).

### Neue Notiz

Erstelle eine Notiz direkt aus dem Editor — der **New note**-Tab lässt dich sie benennen, einen Zielordner wählen, und sie öffnet sich sofort im Editor, damit eine neue Notiz nie irgendwo „verloren" geht, wo du sie nicht findest. Doppelte Namen werden vermieden.

### Favoriten

Markiere jede Notiz mit einem Stern als Favorit (der Stern wechselt sofort den Zustand). Der **Favorites**-Tab listet alles auf, was du markiert hast, für Zugriff mit einem Klick. Favoriten werden in einer kleinen lokalen App-Datei gehalten — sie **verändern** deine Markdown-Notizen **nicht**.

### Datei-Browser

Ein lokaler Datei-Browser lässt dich die Ordner des Brains als Baum durchgehen und jede `.md`-Datei direkt öffnen — praktisch bei großen Brains, wo der Graph allein schon viel zu überblicken ist.

## Backups

Vor **jedem** Speichern wird zuerst die Originaldatei kopiert, dann der neue Inhalt geschrieben. Backups liegen **innerhalb des Brain-Ordners**:

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

Um eine Bearbeitung rückgängig zu machen, das Backup zurück über die Notiz kopieren. `_BACKUPS/` wird vom Indexer ignoriert und muss beim Packaging ausgeschlossen werden.

Der **Backups**-Button öffnet einen kleinen Manager, in dem du bei Bedarf ein vollständiges Backup **erstellen**, die bereits vorhandenen Backups (mit Datum und Größe) **ansehen** und die nicht mehr benötigten **löschen** kannst — das Löschen wird bestätigt und bleibt innerhalb des Backup-Ordners.

## Logs

Lokale Aktivität wird angehängt an:

```text
logs/events.jsonl
```

Zu den Ereignissen gehören Graph-Indexierung, Datei geöffnet, Datei gespeichert (mit Backup-Pfad) sowie manueller Sync-Start / -Ende / -Fehler. Das **Logs**-Fenster öffnen, um sie anzusehen, und **Clear logs** verwenden, um zurückzusetzen. Logs sind lokal; sie dürfen niemals Geheimnisse oder absolute private Pfade enthalten, die geteilt werden könnten.

## Sync (Git)

Der **Sync**-Button führt Git **nur aus, wenn man ihn drückt**, im geladenen Brain-Ordner:

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. falls es Änderungen gibt → `git add -A`, `git commit`, `git push origin master`
4. der letzte Commit und jeder Schritt werden im **Logs**-Fenster angezeigt

Nur verwenden, wenn der geladene Ordner ein gültiger Git-Klon mit dem richtigen Remote ist. Es synchronisiert niemals still und verbirgt niemals Fehler.

## Wartungswerkzeuge

Neben **Sync** und **Logs** bietet die Leiste:

- **See changes** — zeigt das aktuelle `git diff` des geladenen Brains, damit du vor dem Sync genau prüfen kannst, was sich geändert hat.
- **Check brain** — ein Gesundheitsbericht des geladenen Brains, der Probleme **klassifiziert**, statt eine große „broken links"-Gesamtzahl auszugeben: **behebbare defekte Links** vs **erwartete/Rausch-Referenzen** (Assets & Anhänge, als Wikilinks geschriebene externe URLs, Platzhalter/Vorlagen, private/lokale und Verzeichnis-Referenzen), plus Waisen, **behebbare vs erwartete doppelte Notiznamen** und fehlerhaftes Frontmatter. Echte Probleme heben sich vom erwarteten Rauschen ab.
- **Backups** — der oben beschriebene On-Demand-Backup-Manager.

Alle laufen **lokal und auf Anforderung** und zeigen ihr Ergebnis im **Logs**-Fenster.

## Zuverlässigkeit — die Anti‑Schreck-Schicht

Jeder Button liest, schreibt, löscht, sichert, synchronisiert oder öffnet Dateien — daher ist die App so gebaut, dass **nichts still fehlschlägt, nichts Müll erzeugt und kein Fehler rohen Text auf den Bildschirm wirft**:

- Antworten werden nie als perfektes JSON angenommen. Gibt eine Aktion einfachen Text oder einen unerwarteten Fehler zurück, wird daraus eine **saubere, lesbare Meldung** statt eines rohen `Unexpected token …`.
- Das Laden des Brains ist **geschützt**, sodass ein falscher Pfad oder eine fehlgeschlagene Anfrage die Oberfläche nie blockiert.
- Schreibaktionen (Speichern, Löschen, neue Notiz, Favorit) und die Wartungswerkzeuge (Check, Backups, Sync, Logs) haben je eine **eigene Fehlerbehandlung** — wenn etwas fehlschlägt, erscheint der Fehler **lesbar in den Logs**, statt den Graph-Zustand zu verunreinigen.
- Der Indexer **überspringt Backups und technischen Ballast** (`.git`, `_BACKUPS`, `.archive`, `node_modules`, …), damit sie weder den Graphen noch die Zählungen verschmutzen.
- Der private Pfad deines Computers wird **niemals** in Logs, Screenshots oder Dokumentation ausgegeben.

## Metriken

Jede Zahl wird **am geladenen Brain gemessen — nichts ist hartcodiert**. Eine Karte zeigt `n/a` nur, wenn ein Wert wirklich nicht berechnet werden kann.

| Karte | Bedeutung | Wie es gemessen wird |
|---|---|---|
| **Files** | Markdown-Notizen | Anzahl der indexierten `.md`-Dateien |
| **Links** | Verbindungen im Graphen | aufgelöste `[[wikilinks]]` / Markdown-Links |
| **Folders** | Struktur | Ordner, die Markdown enthalten |
| **Skills** | wiederverwendbare Wissenseinheiten | **in Echtzeit gezählt**: `SKILL.md`-Dateien unter `_CONHECIMENTO/skills`, **plus** die externe `browse.sh`-Gesamtzahl, gelesen aus `MASTER_SKILLS.md` — sodass ein brandneuer Skill erfasst wird, noch bevor der Index neu generiert wird |
| **Contributors** | wer das Brain schreibt | **eindeutige Autoren aus der Git-Historie** (`git log`); `n/a`, falls der Ordner kein Git-Repository ist. Dies misst Commit-Autoren, nicht wer gepusht hat — niemals eine feste Zahl |
| **Orphans** | isolierte Notizen | Knoten mit Grad 0 (kein aufgelöster Link rein oder raus) |
| **Words** | Umfang des Wissens | echte Summe der Wörter über alle Notizen (Frontmatter und Codeblöcke ausgeschlossen) |
| **Messages** | Postfach-Aktivität | `.md`-Nachrichten in einem `_CORREIO`-Ordner, falls vorhanden; sonst `n/a` |
| **Brain days** | wie alt das Brain ist | Tage seit dem ersten Git-Commit; `n/a`, falls kein Git-Repository |

### Brain Master Dashboard

Ein Panel mit Statistiken über die **Maschine, die das Brain hostet** (CPU-Modell und Kerne, CPU-Auslastung, RAM), sowie die **Brain size** und eine **Brain-Wachstums**-Schätzung.

Die **Brain size** ist das Gesamtgewicht des **geladenen Brain-Ordners** — die Summe der Dateien in diesem Vault, rekursiv auf dem Server gemessen und für ~60 s zwischengespeichert. Sie ist **nicht** der Speicherplatz des gesamten Computers und zeigt `n/a`, wenn kein Ordner geladen ist.

Die **Brain-Wachstums**-Zahl ist eine grobe Schätzung basierend auf der durchschnittlichen Notizgröße — **lokal und informativ**, **kein** Versprechen unendlichen Speichers. Dauerhafter, erweiterbarer Speicher kommt von der Festplatte und von Git, nicht von Magie.

## Packaging

Um die App zu teilen, ohne etwas preiszugeben:

1. **Nur die App-Dateien** in einen sauberen Ordner kopieren (`server.js`, `public/`, `abrir-cerebro-vivo.bat`, `README.md`).
2. `logs/`, `_BACKUPS/`, `backups/`, `node_modules/`, jede lokale Konfiguration sowie alles, was einen echten Maschinenpfad enthält, **ausschließen**.
3. Prüfen, dass keine privaten Pfade oder Geheimnisse enthalten sind, z. B.:

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. Zippen und den Inhalt auflisten, um zu bestätigen.

## Fehlerbehebung

- **Port bereits belegt** — eine andere Instanz läuft, oder einen anderen Port setzen: `PORT=8788 node server.js`.
- **UI wirkt nach einem Update veraltet** — die Seite hart neu laden; das HTML verwendet eine Cache-Busting-Version (`?v=`), die sich erhöht, wenn sich CSS/JS ändert.
- **Contributors / Brain days zeigen `n/a`** — der Brain-Ordner ist kein Git-Repository (erwartet).
- **Messages zeigt `n/a`** — es gibt keinen `_CORREIO`-Ordner im Brain (erwartet).
- **Nichts wird indexiert** — den Brain-folder-Pfad prüfen und ob er `.md`-Dateien enthält.
- **Sync-Fehler** — das **Logs**-Fenster öffnen; jeder Git-Schritt und Fehler wird dort angezeigt, niemals versteckt.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
