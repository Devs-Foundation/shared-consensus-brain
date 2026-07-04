> 🌐 [English](README.md) · **Português** · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [中文](README.zh.md)

# Shared Consensus Brain

*Também conhecido como **Cerebro Vivo**.*

Uma janela **100% local** sobre um "cérebro" Markdown/git: um grafo vivo que pode pesquisar, ler, editar e sincronizar — com backups automáticos, métricas reais e estatísticas da máquina. É uma **ferramenta de administração e demonstração**, não um substituto do seu editor do dia a dia.

> **Parte do [Dev's Foundation](https://github.com/Devs-Foundation).** O "cérebro" é a memória partilhada por trás do **[multi-agent consensus method](https://github.com/Devs-Foundation/multi-agent-consensus-method)**. Esta aplicação é um *visualizador* dessa memória — **precisa de um cérebro (uma pasta de notas Markdown) para funcionar.**

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## Visão geral

Um "cérebro" é apenas uma pasta de notas Markdown ligadas por `[[wikilinks]]`. O Shared Consensus Brain transforma essa pasta em:

- um **grafo vivo** — cada nota é um nó, cada link resolvido é uma aresta;
- uma **pesquisa + leitor + editor** — encontre uma nota, abra-a, corrija-a, grave-a (com backup primeiro);
- um **dashboard ao vivo** — métricas reais medidas a partir do cérebro carregado, além de estatísticas sobre a máquina que o aloja.

Tudo corre no seu próprio computador. Nada é enviado para lado nenhum.

## Segurança e privacidade (leia primeiro)

A aplicação pode **ler e escrever em todo o seu vault**, por isso é tratada como uma superfície sensível:

- **Apenas local.** O servidor liga-se a `127.0.0.1` (loopback) — nunca a `0.0.0.0`, nunca a uma porta pública.
- **Nunca exposta.** **Não** coloque esta aplicação numa VPS, num domínio público, ou em qualquer interface web aberta. Se alguma vez for necessária uma versão pública, tem de ser uma **exportação estática, só de leitura e filtrada** — nunca a aplicação ao vivo.
- **Sem dados privados no código.** Não há caminhos reais de máquinas, nomes de utilizador, IPs, tokens, palavras-passe ou nomes de pastas privadas fixados em lado nenhum. A pasta do cérebro é escolhida pelo utilizador em tempo de execução.
- **Portátil.** Não está construída à volta de uma máquina ou pasta específica — aponte-a para o seu próprio cérebro. Depois de um cérebro carregar, a interface simplesmente lê `BRAIN LOADED`.

## Requisitos

- **[Node.js](https://nodejs.org)** — sem outras dependências obrigatórias.
- Uma pasta de notas Markdown (opcionalmente um repositório git — isso desbloqueia *contributors* e *brain days*).

## Como começar

### Windows (modo janela de aplicação, recomendado)

Faça duplo clique em **`abrir-cerebro-vivo.bat`**. Inicia o servidor local e abre a aplicação como uma janela estilo desktop (Edge / Chrome / Brave em modo `--app`).

### Qualquer SO (modo manual)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

Depois abra **http://127.0.0.1:8787** no seu navegador.

A porta pode ser alterada com a variável de ambiente `PORT`. O anfitrião é sempre `127.0.0.1`.

## Escolher a pasta do cérebro (primeira execução)

A aplicação arranca **sem nenhum cérebro carregado** e pede um:

1. Digite ou cole o caminho da sua **Brain folder** na barra superior.
2. Clique em **Load brain**.
3. A escolha é guardada apenas no armazenamento local do navegador dessa máquina — nunca é submetida (commit), nunca é enviada.
4. Para mudar de cérebro, altere o caminho e carregue novamente.

Use caminhos de exemplo genéricos em qualquer documentação, nunca reais:

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

Ao indexar, estas pastas são ignoradas: `.git`, `.obsidian`, `node_modules`, `_BACKUPS`, `.trash`, `.cache`.

## Usar a aplicação

### Grafo

- Os nós são ficheiros `.md`; as arestas são links **resolvidos** (`[[wikilinks]]`, `[[file|alias]]`, e links Markdown para `.md`). Links quebrados **não** são desenhados.
- **Arraste** o espaço vazio para deslocar (pan) · **scroll** para ampliar/reduzir · **arraste um nó** para o mover · **duplo clique** para ajustar o grafo todo ao ecrã.
- **Show titles** alterna as etiquetas · os sliders **Motion** e **Node size** ajustam o aspeto · **Background / Nodes / Links** definem as cores. Nada disto toca nos seus ficheiros.
- **Hide dashboard** e **Open reader** dão-lhe um grafo limpo, em ecrã total.
- Um **monitor local** ("No new changes" / "N brain changes" + **Reload**) vigia a pasta e permite reindexar quando os ficheiros mudam no disco.

### Pesquisa

Digite em **Search** para filtrar por título, pasta e conteúdo da nota. Os resultados são clicáveis e saltam diretamente para a nota.

### Leitor e editor

- **Clique num nó** (ou em **Open reader**) para abrir uma nota no separador **Read**.
- Mude para o separador **Edit**, faça alterações, e clique em **Save**.
- **Close reader** devolve-o ao grafo.
- Só podem ser abertos ou escritos ficheiros `.md` dentro do cérebro carregado (path-traversal é bloqueado).

## Backups

Antes de **cada** gravação, o ficheiro original é copiado primeiro, e só depois o novo conteúdo é escrito. Os backups vivem **dentro da pasta do cérebro**:

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

Para reverter uma edição, copie o backup de volta sobre a nota. `_BACKUPS/` é ignorado pelo indexador e deve ser excluído ao empacotar.

## Logs

A atividade local é acrescentada a:

```text
logs/events.jsonl
```

Os eventos incluem indexação do grafo, ficheiro aberto, ficheiro gravado (com o caminho do backup), e início/fim/falha de sincronização manual. Abra a janela **Logs** para os ver, e use **Clear logs** para reiniciar. Os logs são locais; nunca devem conter segredos ou caminhos privados absolutos que possam ser partilhados.

## Sincronização (Git)

O botão **Sync** executa o Git **apenas quando o pressiona**, na pasta do cérebro carregado:

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. se houver alterações → `git add -A`, `git commit`, `git push origin master`
4. o último commit e cada passo são mostrados na janela **Logs**

Use-o apenas quando a pasta carregada for um clone git válido com o remote correto. Nunca sincroniza silenciosamente, e nunca esconde erros.

## Métricas

Cada número é **medido a partir do cérebro carregado — nada é fixado no código**. Um cartão mostra `n/a` apenas quando um valor genuinamente não pode ser calculado.

| Cartão | Significado | Como é medido |
|---|---|---|
| **Files** | notas Markdown | contagem de ficheiros `.md` indexados |
| **Links** | ligações no grafo | `[[wikilinks]]` / links Markdown resolvidos |
| **Folders** | estrutura | pastas que contêm Markdown |
| **Skills** | unidades de conhecimento reutilizáveis | **contadas em tempo real**: ficheiros `SKILL.md` sob `_CONHECIMENTO/skills`, **mais** o total externo do `browse.sh` lido a partir de `MASTER_SKILLS.md` — pelo que uma skill nova é captada mesmo antes de o índice ser regenerado |
| **Contributors** | quem escreve o cérebro | **autores únicos do histórico git** (`git log`); `n/a` se a pasta não for um repositório git. Isto mede autores de commits, não quem fez push — nunca um número fixo |
| **Orphans** | notas isoladas | nós com grau 0 (sem link resolvido de entrada ou saída) |
| **Words** | volume de conhecimento | soma real de palavras em todas as notas (frontmatter e blocos de código excluídos) |
| **Messages** | atividade da caixa de correio | mensagens `.md` numa pasta `_CORREIO`, se existir; caso contrário `n/a` |
| **Brain days** | há quanto tempo existe o cérebro | dias desde o primeiro commit git; `n/a` se não for um repositório git |

### Brain Master Dashboard

Um painel com estatísticas sobre a **máquina que aloja o cérebro** (modelo e núcleos do CPU, carga do CPU, RAM), mais o **Brain size** e uma estimativa de **crescimento do cérebro**.

O **Brain size** é o peso total da **pasta do cérebro carregada** — a soma dos ficheiros dentro desse vault, medida recursivamente no servidor e em cache por ~60 s. **Não** é o espaço em disco do computador inteiro, e mostra `n/a` quando não há pasta carregada.

O valor de **crescimento do cérebro** é uma estimativa aproximada baseada no tamanho médio das notas — **local e informativa**, **não** uma promessa de armazenamento infinito. Memória persistente e expansível vem do disco e do git, não de magia.

## Empacotamento

Para partilhar a aplicação sem vazar nada:

1. Copie **apenas os ficheiros da aplicação** para uma pasta limpa (`server.js`, `public/`, `abrir-cerebro-vivo.bat`, `README.md`).
2. **Exclua** `logs/`, `_BACKUPS/`, `backups/`, `node_modules/`, qualquer configuração local, e tudo o que contenha um caminho real de máquina.
3. Verifique que não há caminhos privados ou segredos, por exemplo:

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. Compacte em zip e liste o conteúdo para confirmar.

## Resolução de problemas

- **Porta já em uso** — outra instância está a correr, ou defina uma porta diferente: `PORT=8788 node server.js`.
- **Interface parece desatualizada depois de uma atualização** — force a atualização da página (hard-refresh); o HTML usa uma versão anti-cache (`?v=`) que muda quando o CSS/JS muda.
- **Contributors / Brain days mostram `n/a`** — a pasta do cérebro não é um repositório git (esperado).
- **Messages mostra `n/a`** — não existe pasta `_CORREIO` no cérebro (esperado).
- **Nada é indexado** — verifique o caminho da Brain folder e que contém ficheiros `.md`.
- **Erros de sincronização** — abra a janela **Logs**; cada passo e erro do git é mostrado lá, nunca escondido.

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
