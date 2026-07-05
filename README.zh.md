> 🌐 [English](README.md) · [Português](README.pt.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **中文**

# Shared Consensus Brain

*也称为 **Cerebro Vivo**。*

一个**100% 本地**的 Markdown/git "大脑"查看窗口：一个可搜索、阅读、**新建**、编辑、**收藏**和同步的实时图谱 —— 具备自动备份、**大脑校验**、真实指标和机器状态统计。它是一个**管理与演示工具**，并非用来替代你日常使用的编辑器。

> **属于 [Dev's Foundation](https://github.com/Devs-Foundation) 的一部分。** "大脑"是 **[多智能体共识方法](https://github.com/Devs-Foundation/multi-agent-consensus-method)** 背后的共享记忆。这个应用是该记忆之上的一个*查看器* —— **它需要一个大脑(一个 Markdown 笔记文件夹)才能运行。**

> ▶️ **100% 本地运行** —— 在浏览器中打开 http://127.0.0.1:8787（Windows 上双击 `abrir-cerebro-vivo.bat`，或运行 `node server.js`）。

<p align="center"><img src="docs/dashboard.webp" alt="Shared Consensus Brain — dashboard tool" width="900"/></p>

<p align="center"><img src="docs/screenshot.webp" alt="Shared Consensus Brain — brain graph and live dashboard" width="900"/></p>

---

## 概述

"大脑"其实就是一个通过 `[[wikilinks]]` 相互链接的 Markdown 笔记文件夹。Shared Consensus Brain 会把这个文件夹变成:

- 一个**实时图谱** —— 每篇笔记都是一个节点,每个已解析的链接都是一条边;
- 一个**搜索 + 阅读器 + 编辑器** —— 找到一篇笔记,打开它,修改它,保存它(保存前会先备份);
- 一个**实时仪表盘** —— 从你加载的大脑中测量出的真实指标,以及托管它的机器的统计信息。

一切都在你自己的电脑上运行。不会有任何数据被发送到任何地方。

## 安全与隐私(请先阅读)

该应用可以**读写你的整个知识库**,因此需要将其视为一个敏感的操作面:

- **仅限本地。** 服务器绑定在 `127.0.0.1`(回环地址)—— 绝不是 `0.0.0.0`,也绝不会开放公共端口。
- **绝不对外暴露。** **不要**把这个应用部署到 VPS、公共域名,或任何开放的网页界面上。如果确实需要一个公开版本,它必须是一个**静态的、只读的、经过过滤的导出版**—— 绝不能是运行中的应用本体。
- **代码中不含任何私密数据。** 代码里没有硬编码任何真实的机器路径、用户名、IP、令牌、密码或私人文件夹名称。大脑文件夹由用户在运行时自行选择。
- **可移植。** 它不是围绕某一台机器或某一个文件夹构建的 —— 你可以指向自己的大脑。大脑加载完成后,界面只会显示 `BRAIN LOADED`。

## 环境要求

- **[Node.js](https://nodejs.org)** —— 没有其他必需的依赖项。
- 一个 Markdown 笔记文件夹(可选地是一个 git 仓库 —— 这样可以解锁*贡献者*和*大脑天数*功能)。

## 快速开始

### Windows(应用窗口模式,推荐)

双击 **`abrir-cerebro-vivo.bat`**。它会启动本地服务器,并以桌面应用式窗口打开该应用(Edge / Chrome / Brave 的 `--app` 模式)。

### 任意操作系统(手动模式)

```bash
cd <workspace>/cerebro-vivo
node server.js
```

然后在浏览器中打开 **http://127.0.0.1:8787**。

端口可以通过 `PORT` 环境变量覆盖。主机地址始终是 `127.0.0.1`。

## 选择大脑文件夹(首次运行)

应用启动时**不会加载任何大脑**,而是会请你选择一个:

1. 在顶部栏中输入或粘贴你的**大脑文件夹(Brain folder)**路径。
2. 点击 **Load brain**。
3. 该选择只会保存在该机器浏览器的本地存储中 —— 绝不会被提交,也绝不会被发送出去。
4. 若要切换大脑,更改路径并重新加载即可。

在任何文档中都请使用通用的示例路径,而不要使用真实路径:

```text
<workspace>/cerebro-vivo
/home/user/example-brain
C:\example\user\example-brain
```

建立索引时,以下文件夹会被忽略: `.git`、`.obsidian`、`node_modules`、`_BACKUPS`、`.trash`、`.cache`。

## 使用该应用

### 图谱(Graph)

- 节点是 `.md` 文件;边是**已解析**的链接(`[[wikilinks]]`、`[[file|alias]]`,以及指向 `.md` 的 Markdown 链接)。失效链接**不会**被绘制出来。
- **拖动**空白区域可平移视图 · **滚动**可缩放 · **拖动节点**可移动它 · **双击**可让整个图谱适配窗口。
- **Show titles** 用于切换标签显示 · **Motion** 和 **Node size** 滑块可调整外观 · **Background / Nodes / Links** 用于设置颜色。这些操作都不会改动你的文件。 节点标签以清晰、易读的正常文本显示（绝不拉伸变形）。
- **Hide dashboard** 和 **Open reader** 可以让你获得一个干净、全屏的图谱视图。
- **Save graph** — 将当前视图导出为带品牌的 PNG（Dev's Foundation 水印 + 一个显示实时指标的面板：files、links、folders、skills、contributors、orphans、words、messages、brain days、Brain size）。在画布上右键可获得普通图片。
- **本地监视器**("No new changes" / "N brain changes" + **Reload**)会监视该文件夹,并在磁盘上的文件发生变化时让你重新建立索引。

### 搜索(Search)

在 **Search** 中输入内容即可按标题、文件夹和笔记内容进行过滤。搜索结果可点击,点击后会直接跳转到对应笔记。

### 阅读器与编辑器

- **点击一个节点**(或点击 **Open reader**)即可在 **Read** 标签页中打开一篇笔记。
- 切换到 **Edit** 标签页,进行修改,然后点击 **Save**。
- **Close reader** 会带你返回图谱视图。
- 只有已加载大脑内部的 `.md` 文件才能被打开或写入(路径穿越已被阻止)。

### 新建笔记

可以直接从编辑器新建笔记 —— **New note** 标签页让你为它命名、选择目标文件夹，并会立即在编辑器中打开它，这样新笔记就绝不会"丢失"在你找不到的某个地方。系统会避免重名。

### 收藏

给任意笔记点上星标即可将其标记为收藏（星标会立即改变状态）。**Favorites** 标签页会列出你标记的所有内容，方便一键访问。收藏保存在应用的一个小型本地文件中 —— **不会**改动你的 Markdown 笔记。

### 文件浏览器

本地文件浏览器让你以树状结构浏览大脑的各个文件夹，并直接打开任意 `.md` 文件 —— 在大型大脑中尤其有用，因为仅凭图谱本身就已经有很多内容要看。

## 备份

在**每次**保存之前,系统都会先复制原始文件,然后才写入新内容。备份文件存放在**大脑文件夹内部**:

```text
_BACKUPS/cerebro-vivo/<YYYY-MM-DDTHH-MM-SS>/<flattened-path>.md
```

要撤销一次编辑,只需将备份文件复制回原笔记即可。`_BACKUPS/` 会被索引器忽略,打包时也必须将其排除。

**Backups** 按钮会打开一个小型管理器，你可以在其中按需**创建**完整备份、**查看**已有的备份（含日期和大小），并**删除**不再需要的备份 —— 删除操作会经过确认，且始终限制在备份文件夹内部。

## 日志(Logs)

本地活动会被追加写入到:

```text
logs/events.jsonl
```

记录的事件包括图谱索引、文件打开、文件保存(含备份路径),以及手动同步的开始/完成/失败。打开 **Logs** 窗口即可查看这些记录,使用 **Clear logs** 可以清空日志。日志是本地的;其中绝不能包含任何机密信息或可能被分享出去的绝对隐私路径。

## 同步(Git)

**Sync** 按钮只有在你按下它时才会运行 Git 操作,操作范围是已加载的大脑文件夹:

1. `git pull --rebase origin master`
2. `git status --porcelain`
3. 如果存在改动 → `git add -A`、`git commit`、`git push origin master`
4. 最新一次提交以及每一个步骤都会显示在 **Logs** 窗口中

只有当已加载的文件夹是一个配置了正确远程仓库的有效 git 克隆时,才应使用此功能。它绝不会静默同步,也绝不会隐藏错误。

## 维护工具

除了 **Sync** 和 **Logs**，工具栏还提供：

- **See changes** —— 显示已加载大脑当前的 `git diff`，让你在同步前准确查看改动了什么。
- **Check brain** —— 已加载大脑的健康报告，它会对问题进行**分类**，而不是甩出一个庞大的 "broken links" 总数：**可处理的失效链接** 与 **预期的/噪音引用**（资源与附件、写成 wikilink 的外部 URL、占位符/模板、私密/本地及目录引用），外加孤立笔记、**可处理 vs 预期的重复笔记名**，以及格式错误的 frontmatter。真正的问题会从预期的噪音中凸显出来。
- **Backups** —— 上文所述的按需备份管理器。

这些功能都在**本地按需**运行，并将结果显示在 **Logs** 窗口中。

## 可靠性 —— 防惊吓层

每个按钮都会读取、写入、删除、备份、同步或打开文件 —— 因此本应用的设计目标是：**任何失败都不会悄无声息，不会产生垃圾，也不会把原始报错文本直接甩在屏幕上**：

- 绝不假设响应一定是完美的 JSON。如果某个操作返回纯文本或意外错误，它会变成一条**干净、易读的提示信息**，而不是原始的 `Unexpected token …`。
- 大脑加载过程受到**保护**，错误的路径或失败的请求绝不会让界面卡死。
- 写入操作（保存、删除、新建笔记、收藏）以及各项维护工具（Check、Backups、Sync、Logs）都各自具备**专门的错误处理** —— 当某项操作失败时，错误会**清晰地显示在 Logs 中**，而不会污染图谱状态。
- 索引器会**跳过备份和技术性杂物**（`.git`、`_BACKUPS`、`.archive`、`node_modules` 等），使它们绝不会污染图谱或各项计数。
- 你电脑的私密路径**绝不会**被打印到日志、截图或文档中。

## 指标(Metrics)

每一个数字都是**从你加载的大脑中测量得出的 —— 没有任何硬编码内容**。只有当某个值确实无法计算时,对应卡片才会显示 `n/a`。

| Card | Meaning | How it is measured |
|---|---|---|
| **Files** | Markdown 笔记 | 已索引 `.md` 文件的数量 |
| **Links** | 图谱中的连接 | 已解析的 `[[wikilinks]]` / Markdown 链接 |
| **Folders** | 结构 | 包含 Markdown 内容的文件夹 |
| **Skills** | 可复用的知识单元 | **实时统计**: `_CONHECIMENTO/skills` 下的 `SKILL.md` 文件,**加上**从 `MASTER_SKILLS.md` 中读取的外部 `browse.sh` 总数 —— 因此即使索引尚未重新生成,全新的 skill 也能被计入 |
| **Contributors** | 大脑的编写者 | **来自 git 历史记录的唯一作者**(`git log`);如果该文件夹不是 git 仓库,则显示 `n/a`。此指标衡量的是提交作者,而非推送者 —— 绝不是一个固定数字 |
| **Orphans** | 孤立笔记 | 度数为 0 的节点(既无传入也无传出的已解析链接) |
| **Words** | 知识的体量 | 所有笔记中真实字数的总和(不含前置元数据 frontmatter 和代码块) |
| **Messages** | 邮箱活动 | `_CORREIO` 文件夹中的 `.md` 消息数量(如果该文件夹存在);否则为 `n/a` |
| **Brain days** | 大脑的存续时长 | 自首次 git 提交以来的天数;如果不是 git 仓库则为 `n/a` |

### Brain Master Dashboard

一个展示**托管该大脑的机器**统计信息的面板（CPU 型号与核心数、CPU 负载、内存 RAM），以及 **Brain size** 和**大脑增长**估算。

**Brain size** 是**已加载的大脑文件夹**的总大小——即该 vault 内所有文件大小之和，在服务器端递归测量并缓存约 60 秒。它**不是**整台电脑的磁盘空间；当没有加载文件夹时显示 `n/a`。

**大脑增长**数值是基于平均笔记大小的粗略估计——**本地的、仅供参考的**，**并非**无限存储空间的承诺。持久、可扩展的记忆来自磁盘和 git，而非凭空而来。

## 打包

要在不泄露任何信息的前提下分享该应用:

1. 只将**应用文件**复制到一个干净的文件夹中(`server.js`、`public/`、`abrir-cerebro-vivo.bat`、`README.md`)。
2. **排除** `logs/`、`_BACKUPS/`、`backups/`、`node_modules/`、任何本地配置,以及任何包含真实机器路径的内容。
3. 核实其中不含任何私密路径或机密信息,例如:

   ```powershell
   Select-String -Path <folder> -Pattern "C:\\Users|/home/<real-user>|token|password|secret" -Recurse
   ```

4. 将其打包为 zip 文件,并列出内容以确认无误。

## 疑难排解

- **端口已被占用** —— 说明另一个实例正在运行,或者设置一个不同的端口: `PORT=8788 node server.js`。
- **更新后界面显示仍是旧的** —— 强制刷新页面;HTML 使用了一个会在 CSS/JS 变更时自增的缓存清除版本号(`?v=`)。
- **Contributors / Brain days 显示 `n/a`** —— 大脑文件夹不是一个 git 仓库(属于预期行为)。
- **Messages 显示 `n/a`** —— 大脑中没有 `_CORREIO` 文件夹(属于预期行为)。
- **没有任何内容被索引** —— 检查大脑文件夹(Brain folder)路径,以及其中是否包含 `.md` 文件。
- **同步出错** —— 打开 **Logs** 窗口;每一个 git 步骤及错误都会显示在那里,绝不会被隐藏。

---

<sub><b>N models. N devices. One brain.</b> · Built for <b>Dev's Foundation</b> · <a href="https://github.com/Devs-Foundation">github.com/Devs-Foundation</a></sub>
