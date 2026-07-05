> 🌐 [English](README.md) · [Português](README.pt.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [中文](README.zh.md)

# Shared Consensus Brain

*Aussi connu sous le nom de **Cerebro Vivo**.*

Une fenêtre **100 % locale** sur un « cerveau » Markdown/git : un graphe vivant que vous pouvez rechercher, lire, **créer**, éditer, **mettre en favori** et synchroniser — avec sauvegardes automatiques, **validation du cerveau**, métriques réelles et statistiques machine. C'est un **outil d'administration et de démonstration**, pas un remplacement pour votre éditeur habituel.

> **Fait partie de [Dev's Foundation](https://github.com/Devs-Foundation).** Le « cerveau » est la mémoire partagée derrière la **[multi-agent consensus method](https://github.com/Devs-Foundation/multi-agent-consensus-method)**. Cette application est une *visionneuse* de cette mémoire — **elle a besoin d'un cerveau (un dossier de notes Markdown) pour fonctionner.**

> ▶️ **100 % local** — ouvrez http://127.0.0.1:8787 dans votre navigateur (double‑cliquez sur `abrir-cerebro-vivo.bat` sous Windows, ou lancez `node server.js`).

<p align="center"><img src="docs/dashboard.webp" alt="Shared Consensus Brain — dashboard tool" width="900"/></p>

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## Aperçu

Un « cerveau » est simplement un dossier de notes Markdown reliées par des `[[wikilinks]]`. Shared Consensus Brain transforme ce dossier en :

- un **graphe vivant** — chaque note est un nœud, chaque lien résolu une arête ;
- une **recherche + lecteur + éditeur** — trouvez une note, ouvrez-la, corrigez-la, sauvegardez-la (avec une sauvegarde préalable) ;
- un **tableau de bord en direct** — des métriques réelles mesurées à partir du cerveau chargé, plus des statistiques sur la machine qui l'héberge.

Tout tourne sur votre propre ordinateur. Rien n'est envoyé où que ce soit.

## Sécurité et confidentialité (à lire en premier)

L'application peut **lire et écrire dans tout votre vault**, elle est donc traitée comme une surface sensible :

- **Local uniquement.** Le serveur se lie à `127.0.0.1` (loopback) — jamais `0.0.0.0`, jamais un port public.
- **Jamais exposé.** Ne placez **pas** cette application sur un VPS, un domaine public, ou une quelconque interface web ouverte. Si une version publique est un jour nécessaire, ce doit être un **export statique, en lecture seule et filtré** — jamais l'application en direct.
- **Aucune donnée privée dans le code.** Aucun chemin machine réel, nom d'utilisateur, IP, jeton, mot de passe ou nom de dossier privé n'est codé en dur nulle part. Le dossier du cerveau est choisi par l'utilisateur à l'exécution.
- **Portable.** Elle n'est pas conçue autour d'une seule machine ou d'un seul dossier — pointez-la vers votre propre cerveau. Une fois un cerveau chargé, l'interface affiche simplement `BRAIN LOADED`.

## Prérequis

- **[Node.js](https://nodejs.org)** — aucune autre dépendance obligatoire.
- Un dossier de notes Markdown (optionnellement un dépôt git — cela débloque les *contributeurs* et les *jours du cerveau*).

## Démarrage

### Windows (mode fenêtre applicative, recommandé)

Double-cliquez sur **`abrir-cerebro-vivo.bat`**. Cela démarre le serveur local et ouvre l'application comme une fenêtre de type bureau (Edge / Chrome / Brave en mode `--app`).

### Tout OS (mode manuel)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

Puis ouvrez **http://127.0.0.1:8787** dans votre navigateur.

Le port peut être remplacé avec la variable d'environnement `PORT`. L'hôte est toujours `127.0.0.1`.

## Choisir le dossier du cerveau (premier lancement)

L'application démarre **sans cerveau chargé** et en demande un :

1. Tapez ou collez le chemin de votre **Brain folder** dans la barre du haut.
2. Cliquez sur **Load brain**.
3. Le choix est stocké uniquement dans le stockage local du navigateur sur cette machine — jamais commité, jamais envoyé.
4. Pour changer de cerveau, modifiez le chemin et rechargez.

Utilisez des chemins d'exemple génériques dans toute documentation, jamais des chemins réels :

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

Lors de l'indexation, ces dossiers sont ignorés : `.git`, `.obsidian`, `node_modules`, `_BACKUPS`, `.trash`, `.cache`.

## Utilisation de l'application

### Graphe

- Les nœuds sont des fichiers `.md` ; les arêtes sont des liens **résolus** (`[[wikilinks]]`, `[[file|alias]]`, et les liens Markdown vers des `.md`). Les liens brisés ne sont **pas** dessinés.
- **Glissez** un espace vide pour vous déplacer · **défilez** pour zoomer · **glissez un nœud** pour le déplacer · **double-cliquez** pour ajuster l'ensemble du graphe.
- **Show titles** bascule les libellés · les curseurs **Motion** et **Node size** ajustent l'apparence · **Background / Nodes / Links** définissent les couleurs. Rien de tout cela ne touche vos fichiers. Les étiquettes des nœuds s'affichent en texte clair et lisible (jamais étirées).
- **Hide dashboard** et **Open reader** vous donnent un graphe propre, en plein écran.
- **Save graph** — exporte la vue actuelle en PNG marqué (filigrane Dev's Foundation + un panneau avec les métriques en direct : files, links, folders, skills, contributors, orphans, words, messages, brain days, Brain size). Clic droit sur le canevas pour une image simple.
- Un **moniteur local** (« No new changes » / « N brain changes » + **Reload**) surveille le dossier et vous permet de réindexer quand des fichiers changent sur le disque.

### Recherche

Tapez dans **Search** pour filtrer par titre, dossier et contenu des notes. Les résultats sont cliquables et sautent directement à la note.

### Lecteur et éditeur

- **Cliquez sur un nœud** (ou **Open reader**) pour ouvrir une note dans l'onglet **Read**.
- Passez à l'onglet **Edit**, apportez des modifications, et cliquez sur **Save**.
- **Close reader** vous ramène au graphe.
- Seuls les fichiers `.md` à l'intérieur du cerveau chargé peuvent être ouverts ou écrits (le path-traversal est bloqué).

### Nouvelle note

Créez une note directement depuis l'éditeur — l'onglet **New note** vous laisse la nommer, choisir le dossier de destination, et elle s'ouvre immédiatement dans l'éditeur, pour qu'une nouvelle note ne soit jamais « perdue » quelque part où vous ne pouvez pas la retrouver. Les noms en double sont évités.

### Favoris

Marquez n'importe quelle note d'une étoile pour la mettre en favori (l'étoile change d'état instantanément). L'onglet **Favorites** liste tout ce que vous avez marqué, pour un accès en un clic. Les favoris sont conservés dans un petit fichier local de l'application — ils ne **modifient pas** vos notes Markdown.

### Explorateur de fichiers

Un explorateur de fichiers local vous permet de parcourir les dossiers du cerveau sous forme d'arborescence et d'ouvrir n'importe quel fichier `.md` directement — pratique sur les grands cerveaux où le graphe seul est déjà beaucoup à parcourir.

## Sauvegardes

Avant **chaque** sauvegarde, le fichier original est d'abord copié, puis le nouveau contenu est écrit. Les sauvegardes vivent **à l'intérieur du dossier du cerveau** :

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

Pour annuler une modification, copiez la sauvegarde par-dessus la note. `_BACKUPS/` est ignoré par l'indexeur et doit être exclu lors du packaging.

Le bouton **Backups** ouvre un petit gestionnaire où vous pouvez **créer** une sauvegarde complète à la demande, **voir** les sauvegardes que vous avez déjà (avec date et taille), et **supprimer** celles dont vous n'avez plus besoin — la suppression est confirmée et reste à l'intérieur du dossier de sauvegardes.

## Logs

L'activité locale est ajoutée à :

```text
logs/events.jsonl
```

Les événements incluent l'indexation du graphe, l'ouverture de fichier, la sauvegarde de fichier (avec le chemin de la sauvegarde), et le début / la fin / l'échec de la synchronisation manuelle. Ouvrez la fenêtre **Logs** pour les consulter, et utilisez **Clear logs** pour réinitialiser. Les logs sont locaux ; ils ne doivent jamais contenir de secrets ni de chemins privés absolus qui pourraient être partagés.

## Synchronisation (Git)

Le bouton **Sync** exécute Git **uniquement quand vous appuyez dessus**, dans le dossier du cerveau chargé :

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. s'il y a des changements → `git add -A`, `git commit`, `git push origin master`
4. le dernier commit et chaque étape sont affichés dans la fenêtre **Logs**

Utilisez-le uniquement quand le dossier chargé est un clone git valide avec le bon remote. Il ne synchronise jamais silencieusement, et ne cache jamais les erreurs.

## Outils de maintenance

À côté de **Sync** et **Logs**, la barre propose :

- **See changes** — affiche le `git diff` actuel du cerveau chargé, pour que vous puissiez examiner exactement ce qui a changé avant de synchroniser.
- **Check brain** — un rapport de santé du cerveau chargé qui **classe** les problèmes au lieu de déverser un seul total de « broken links » : **liens brisés actionnables** vs **références attendues/bruit** (ressources et pièces jointes, URLs externes écrites comme wikilinks, placeholders/modèles, références privées/locales et de répertoire), plus les orphelins, les **noms de note en double actionnables vs attendus**, et le frontmatter malformé. Les vrais problèmes ressortent du bruit attendu.
- **Backups** — le gestionnaire de sauvegardes à la demande décrit ci-dessus.

Tous s'exécutent **localement et à la demande**, et affichent leur résultat dans la fenêtre **Logs**.

## Fiabilité — la couche anti‑frayeur

Chaque bouton lit, écrit, supprime, sauvegarde, synchronise ou ouvre des fichiers — l'application est donc conçue pour que **rien n'échoue en silence, rien ne crée de déchets, et aucune erreur ne déverse de texte brut à l'écran** :

- Les réponses ne sont jamais supposées être du JSON parfait. Si une action renvoie du texte simple ou une erreur inattendue, cela devient un **message propre et lisible** au lieu d'un `Unexpected token …` brut.
- Le chargement du cerveau est **protégé** pour qu'un mauvais chemin ou une requête échouée ne laisse jamais l'interface bloquée.
- Les actions d'écriture (sauvegarder, supprimer, nouvelle note, favori) et les outils de maintenance (Check, Backups, Sync, Logs) ont chacun une **gestion d'erreurs dédiée** — quand quelque chose échoue, l'échec apparaît **de façon lisible dans les Logs** au lieu de contaminer l'état du graphe.
- L'indexeur **ignore les sauvegardes et les déchets techniques** (`.git`, `_BACKUPS`, `.archive`, `node_modules`, …) pour qu'ils ne polluent jamais le graphe ni les comptes.
- Le chemin privé de votre ordinateur n'est **jamais imprimé** dans les logs, les captures d'écran ou la documentation.

## Métriques

Chaque nombre est **mesuré à partir du cerveau que vous avez chargé — rien n'est codé en dur**. Une carte affiche `n/a` seulement quand une valeur ne peut véritablement pas être calculée.

| Carte | Signification | Comment c'est mesuré |
|---|---|---|
| **Files** | notes Markdown | nombre de fichiers `.md` indexés |
| **Links** | connexions dans le graphe | `[[wikilinks]]` / liens Markdown résolus |
| **Folders** | structure | dossiers contenant du Markdown |
| **Skills** | unités de connaissance réutilisables | **comptées en temps réel** : fichiers `SKILL.md` sous `_CONHECIMENTO/skills`, **plus** le total externe de `browse.sh` lu depuis `MASTER_SKILLS.md` — ainsi une nouvelle skill est prise en compte même avant que l'index soit régénéré |
| **Contributors** | qui écrit le cerveau | **auteurs uniques de l'historique git** (`git log`) ; `n/a` si le dossier n'est pas un dépôt git. Cela mesure les auteurs des commits, pas qui a poussé — jamais un nombre fixe |
| **Orphans** | notes isolées | nœuds de degré 0 (aucun lien résolu entrant ou sortant) |
| **Words** | volume de connaissance | somme réelle des mots à travers toutes les notes (frontmatter et blocs de code exclus) |
| **Messages** | activité de la boîte aux lettres | messages `.md` dans un dossier `_CORREIO`, s'il existe ; sinon `n/a` |
| **Brain days** | âge du cerveau | jours depuis le premier commit git ; `n/a` si ce n'est pas un dépôt git |

### Brain Master Dashboard

Un panneau avec des statistiques sur la **machine hébergeant le cerveau** (modèle et cœurs du CPU, charge CPU, RAM), ainsi que le **Brain size** et une estimation de **croissance du cerveau**.

Le **Brain size** est le poids total du **dossier du cerveau chargé** — la somme des fichiers à l'intérieur de ce vault, mesurée récursivement sur le serveur et mise en cache pendant ~60 s. Ce **n'est pas** l'espace disque de l'ordinateur entier, et il affiche `n/a` quand aucun dossier n'est chargé.

Le chiffre de **croissance du cerveau** est une estimation approximative basée sur la taille moyenne des notes — **local et informatif**, **pas** une promesse de stockage infini. Une mémoire persistante et extensible vient du disque et de git, pas de la magie.

## Packaging

Pour partager l'application sans rien divulguer :

1. Copiez **uniquement les fichiers de l'application** dans un dossier propre (`server.js`, `public/`, `abrir-cerebro-vivo.bat`, `README.md`).
2. **Excluez** `logs/`, `_BACKUPS/`, `backups/`, `node_modules/`, toute configuration locale, et tout ce qui contient un chemin machine réel.
3. Vérifiez qu'il n'y a pas de chemins privés ni de secrets, par exemple :

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. Zippez-le et listez le contenu pour confirmer.

## Dépannage

- **Port déjà utilisé** — une autre instance tourne, ou définissez un port différent : `PORT=8788 node server.js`.
- **L'interface semble obsolète après une mise à jour** — rafraîchissez la page en forçant le cache ; le HTML utilise une version anti-cache (`?v=`) qui s'incrémente quand le CSS/JS change.
- **Contributors / Brain days affichent `n/a`** — le dossier du cerveau n'est pas un dépôt git (attendu).
- **Messages affiche `n/a`** — il n'y a pas de dossier `_CORREIO` dans le cerveau (attendu).
- **Rien n'est indexé** — vérifiez le chemin du Brain folder et qu'il contient des fichiers `.md`.
- **Erreurs de synchronisation** — ouvrez la fenêtre **Logs** ; chaque étape git et chaque erreur y sont affichées, jamais cachées.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
