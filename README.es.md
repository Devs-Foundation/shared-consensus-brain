> 🌐 [English](README.md) · [Português](README.pt.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [中文](README.zh.md)

# Shared Consensus Brain

*También conocido como **Cerebro Vivo**.*

Una ventana **100% local** sobre un "cerebro" Markdown/git: un grafo vivo que puedes buscar, leer, editar y sincronizar — con copias de seguridad automáticas, métricas reales y estadísticas de la máquina. Es una **herramienta de administración y demostración**, no un sustituto de tu editor habitual.

> **Parte de [Dev's Foundation](https://github.com/Devs-Foundation).** El "cerebro" es la memoria compartida detrás del **[método de consenso multiagente](https://github.com/Devs-Foundation/multi-agent-consensus-method)**. Esta aplicación es un *visor* sobre esa memoria — **necesita un cerebro (una carpeta de notas Markdown) para funcionar.**

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## Descripción general

Un "cerebro" es simplemente una carpeta de notas Markdown enlazadas por `[[wikilinks]]`. Shared Consensus Brain convierte esa carpeta en:

- un **grafo vivo** — cada nota es un nodo, cada enlace resuelto una arista;
- un **buscador + lector + editor** — encuentra una nota, ábrela, corrígela, guárdala (con una copia de seguridad primero);
- un **panel en vivo** — métricas reales medidas a partir del cerebro cargado, además de estadísticas sobre la máquina que lo aloja.

Todo se ejecuta en tu propio ordenador. No se envía nada a ningún sitio.

## Seguridad y privacidad (lee esto primero)

La aplicación puede **leer y escribir en todo tu vault**, por lo que se trata como una superficie sensible:

- **Solo local.** El servidor se vincula a `127.0.0.1` (loopback) — nunca `0.0.0.0`, nunca un puerto público.
- **Nunca expuesta.** **No** pongas esta aplicación en una VPS, un dominio público, ni en ninguna interfaz web abierta. Si alguna vez se necesita una versión pública, debe ser una **exportación estática, de solo lectura y filtrada** — nunca la aplicación en vivo.
- **Sin datos privados en el código.** No hay rutas reales de máquina, nombres de usuario, IPs, tokens, contraseñas ni nombres de carpetas privadas incrustados en ningún sitio. La carpeta del cerebro la elige el usuario en tiempo de ejecución.
- **Portátil.** No está construida en torno a una máquina o carpeta concreta — apúntala a tu propio cerebro. Una vez cargado un cerebro, la interfaz simplemente muestra `BRAIN LOADED`.

## Requisitos

- **[Node.js](https://nodejs.org)** — sin otras dependencias obligatorias.
- Una carpeta de notas Markdown (opcionalmente un repositorio git — eso desbloquea *contribuyentes* y *días del cerebro*).

## Primeros pasos

### Windows (modo ventana de aplicación, recomendado)

Haz doble clic en **`abrir-cerebro-vivo.bat`**. Esto inicia el servidor local y abre la aplicación como una ventana de estilo escritorio (Edge / Chrome / Brave en modo `--app`).

### Cualquier SO (modo manual)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

Luego abre **http://127.0.0.1:8787** en tu navegador.

El puerto puede sobrescribirse con la variable de entorno `PORT`. El host siempre es `127.0.0.1`.

## Elegir la carpeta del cerebro (primera ejecución)

La aplicación arranca **sin ningún cerebro cargado** y pide uno:

1. Escribe o pega la ruta de tu **Brain folder** en la barra superior.
2. Haz clic en **Load brain**.
3. La elección se guarda solo en el almacenamiento local del navegador en esa máquina — nunca se hace commit, nunca se envía.
4. Para cambiar de cerebro, cambia la ruta y carga de nuevo.

Usa rutas de ejemplo genéricas en cualquier documentación, nunca rutas reales:

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

Al indexar, estas carpetas se ignoran: `.git`, `.obsidian`, `node_modules`, `_BACKUPS`, `.trash`, `.cache`.

## Uso de la aplicación

### Grafo

- Los nodos son archivos `.md`; las aristas son enlaces **resueltos** (`[[wikilinks]]`, `[[file|alias]]`, y enlaces Markdown a `.md`). Los enlaces rotos **no** se dibujan.
- **Arrastra** el espacio vacío para desplazarte · **desplázate con el scroll** para hacer zoom · **arrastra un nodo** para moverlo · **doble clic** para ajustar todo el grafo a la pantalla.
- **Show titles** activa/desactiva las etiquetas · los deslizadores **Motion** y **Node size** ajustan el aspecto · **Background / Nodes / Links** definen los colores. Nada de esto toca tus archivos. Las etiquetas de los nodos se muestran como texto limpio y legible (nunca estiradas).
- **Hide dashboard** y **Open reader** te dan un grafo limpio a pantalla completa.
- **Save graph** — exporta la vista actual como PNG con marca (marca de agua Dev's Foundation + un panel con las métricas en vivo: files, links, folders, skills, contributors, orphans, words, messages, brain days, Brain size). Clic derecho en el lienzo para una imagen simple.
- Un **monitor local** ("No new changes" / "N brain changes" + **Reload**) vigila la carpeta y te permite reindexar cuando cambian los archivos en disco.

### Búsqueda

Escribe en **Search** para filtrar por título, carpeta y contenido de la nota. Los resultados son clicables y saltan directamente a la nota.

### Lector y editor

- **Haz clic en un nodo** (o en **Open reader**) para abrir una nota en la pestaña **Read**.
- Cambia a la pestaña **Edit**, haz los cambios y haz clic en **Save**.
- **Close reader** te devuelve al grafo.
- Solo se pueden abrir o escribir archivos `.md` dentro del cerebro cargado (el path‑traversal está bloqueado).

## Copias de seguridad

Antes de **cada** guardado, el archivo original se copia primero, y luego se escribe el nuevo contenido. Las copias de seguridad viven **dentro de la carpeta del cerebro**:

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

Para revertir una edición, copia la copia de seguridad de vuelta sobre la nota. `_BACKUPS/` es ignorada por el indexador y debe excluirse al empaquetar.

## Registros

La actividad local se añade a:

```text
logs/events.jsonl
```

Los eventos incluyen indexación del grafo, archivo abierto, archivo guardado (con la ruta de la copia de seguridad), e inicio / fin / fallo de la sincronización manual. Abre la ventana de **Logs** para verlos, y usa **Clear logs** para reiniciar. Los registros son locales; nunca deben contener secretos ni rutas privadas absolutas que puedan compartirse.

## Sincronización (Git)

El botón **Sync** ejecuta Git **solo cuando lo pulsas**, en la carpeta del cerebro cargada:

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. si hay cambios → `git add -A`, `git commit`, `git push origin master`
4. el último commit y cada paso se muestran en la ventana de **Logs**

Úsalo solo cuando la carpeta cargada sea un clon git válido con el remoto correcto. Nunca sincroniza en silencio, y nunca oculta errores.

## Métricas

Cada número está **medido a partir del cerebro que cargaste — nada está fijado en el código**. Una tarjeta muestra `n/a` solo cuando un valor genuinamente no se puede calcular.

| Tarjeta | Significado | Cómo se mide |
|---|---|---|
| **Files** | notas Markdown | recuento de archivos `.md` indexados |
| **Links** | conexiones en el grafo | `[[wikilinks]]` / enlaces Markdown resueltos |
| **Folders** | estructura | carpetas que contienen Markdown |
| **Skills** | unidades de conocimiento reutilizables | **contadas en tiempo real**: archivos `SKILL.md` bajo `_CONHECIMENTO/skills`, **más** el total externo de `browse.sh` leído de `MASTER_SKILLS.md` — así una skill recién creada se detecta incluso antes de regenerar el índice |
| **Contributors** | quién escribe el cerebro | **autores únicos del historial de git** (`git log`); `n/a` si la carpeta no es un repositorio git. Esto mide autores de commits, no quién hizo push — nunca un número fijo |
| **Orphans** | notas aisladas | nodos con grado 0 (sin enlace resuelto de entrada ni de salida) |
| **Words** | volumen de conocimiento | suma real de palabras en todas las notas (excluyendo frontmatter y bloques de código) |
| **Messages** | actividad del buzón | mensajes `.md` en una carpeta `_CORREIO`, si existe; en caso contrario `n/a` |
| **Brain days** | antigüedad del cerebro | días desde el primer commit de git; `n/a` si no es un repositorio git |

### Brain Master Dashboard

Un panel con estadísticas sobre la **máquina que aloja el cerebro** (modelo y núcleos de la CPU, carga de la CPU, RAM), más el **Brain size** y una estimación de **crecimiento del cerebro**.

El **Brain size** es el peso total de la **carpeta del cerebro cargada** — la suma de los archivos dentro de ese vault, medida recursivamente en el servidor y almacenada en caché durante ~60 s. **No** es el espacio en disco de todo el ordenador, y muestra `n/a` cuando no hay ninguna carpeta cargada.

La cifra de **crecimiento del cerebro** es una estimación aproximada basada en el tamaño medio de las notas — **local e informativa**, **no** una promesa de almacenamiento infinito. La memoria persistente y expandible viene del disco y de git, no de la magia.

## Empaquetado

Para compartir la aplicación sin filtrar nada:

1. Copia **solo los archivos de la aplicación** en una carpeta limpia (`server.js`, `public/`, `abrir-cerebro-vivo.bat`, `README.md`).
2. **Excluye** `logs/`, `_BACKUPS/`, `backups/`, `node_modules/`, cualquier configuración local, y cualquier cosa que contenga una ruta real de máquina.
3. Verifica que no haya rutas privadas ni secretos, por ejemplo:

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. Comprímelo en un zip y lista el contenido para confirmar.

## Solución de problemas

- **El puerto ya está en uso** — hay otra instancia en ejecución, o define un puerto diferente: `PORT=8788 node server.js`.
- **La interfaz se ve desactualizada tras una actualización** — recarga la página forzando la caché; el HTML usa una versión anti-caché (`?v=`) que se incrementa cuando cambian CSS/JS.
- **Contributors / Brain days muestran `n/a`** — la carpeta del cerebro no es un repositorio git (esperado).
- **Messages muestra `n/a`** — no hay carpeta `_CORREIO` en el cerebro (esperado).
- **Nada está indexado** — comprueba la ruta de la Brain folder y que contenga archivos `.md`.
- **Errores de sincronización** — abre la ventana de **Logs**; cada paso y error de git se muestra ahí, nunca se oculta.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
