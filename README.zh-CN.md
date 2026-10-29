<h1 align="center">claude-skins</h1>

<p align="center"><b>给 Claude 桌面版换肤（Windows 和 macOS），再养一只跟着你打字的小家伙。</b><br>
<sub>聊天区后面铺一张场景画，强调色跟着换，面板变成毛玻璃，再加一点粒子；还有一只吉祥物趴在输入框上沿，你打字它就蹦着往前走，回车就起跳。</sub></p>

<p align="center">
  <a href="https://github.com/JIA-ss/claude-skins/actions/workflows/ci.yml"><img src="https://github.com/JIA-ss/claude-skins/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/JIA-ss/claude-skins/releases/latest"><img src="https://img.shields.io/github/v/release/JIA-ss/claude-skins?label=release&color=5fe3c4" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JIA-ss/claude-skins?color=3d8bfd" alt="license"></a>
  <a href="skins/LICENSE.md"><img src="https://img.shields.io/badge/theme_art-CC0-8a8a8a" alt="theme art: CC0"></a>
  <a href="#安装"><img src="https://img.shields.io/badge/platform-Windows_%7C_macOS-0078D6?logo=windows&logoColor=white" alt="platform"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A5%2022-339933?logo=nodedotjs&logoColor=white" alt="node >= 22"></a>
  <a href="https://github.com/JIA-ss/claude-skins/stargazers"><img src="https://img.shields.io/github/stars/JIA-ss/claude-skins?color=f5c518&logo=github" alt="stars"></a>
  <a href="https://github.com/JIA-ss/codex-skins"><img src="https://img.shields.io/badge/%E5%A7%8A%E5%A6%B9%E9%A1%B9%E7%9B%AE-codex--skins-10a37f" alt="codex-skins"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="#安装">安装</a> · <a href="#怎么用">快捷键</a> · <a href="#自己做主题">做自己的主题</a> · <a href="https://github.com/JIA-ss/codex-skins">codex-skins（Codex 版）</a></p>

<p align="center"><img src="docs/demo.gif" alt="claude-skins 演示" width="860"></p>

> [!NOTE]
> **非官方项目。** claude-skins 是社区项目，不是 Anthropic 出品，也不受 Anthropic 支持。它修改的是<b>你自己电脑上装的那份</b> Claude，仓库里不包含任何 Anthropic 的文件。风险自担；Claude 更新后需要重新运行一次安装。

| 极光 | 夜樱 | 营火 | 霓虹雨夜 |
|---|---|---|---|
| ![](docs/theme-aurora.jpg) | ![](docs/theme-sakura.jpg) | ![](docs/theme-campfire.jpg) | ![](docs/theme-neon.jpg) |

## 安装

需要 [Node.js](https://nodejs.org) 22 以上。先**完全退出** Claude：从托盘图标或菜单选「退出」，只关窗口不算退出。

```bash
git clone https://github.com/JIA-ss/claude-skins.git
cd claude-skins
npm install --omit=dev   # 开发依赖（Electron）只有跑测试才需要
node install.mjs
```

然后重新打开 Claude 就行。

| 你装的 Claude | 安装器做什么 |
|---|---|
| **Windows 商店版 / MSIX**（目前官网默认下载的就是这种） | 商店版目录是只读的，所以安装器把应用复制到 `%LOCALAPPDATA%\claude-skins\Claude`，改这份副本，再在开始菜单加一个快捷方式 **Claude (skins)**。以后从这个快捷方式启动。对话、登录、设置和原版共用。注意：`claude://` 链接还是会打开原版。 |
| **Windows 传统安装版**（`%LOCALAPPDATA%\AnthropicClaude\app-*`） | 直接改原地的文件。 |
| **macOS**（`/Applications/Claude.app`） | 不碰官方签名的应用：原地修改会破坏 Anthropic 的签名，Claude 的自动更新也会跟着失效。安装器把应用复制到 `~/Applications/Claude (skins).app`，改这份副本，再做一次 ad hoc 重签名。从 `~/Applications` 或聚焦搜索启动 **Claude (skins)**，启动前先退出原版 Claude；对话、登录、设置和原版共用。第一次启动时 macOS 会要你输入登录密码，允许它读取钥匙串里的「Claude Safe Storage」，选「始终允许」（ad hoc 签名每次重装都会变，所以每次重装后会再问一次）。快捷键是 ⌃⌥T / ⌃⌥⇧T / ⌃⌥P。已在 macOS 26（Apple 芯片）+ Claude 4.29 上测过。 |
| 其他位置 | `node install.mjs --app <含 resources/app.asar 的目录，或 Claude.app>` |

其他命令：

```bash
node install.mjs status      # Claude 装在哪、改没改过
node install.mjs uninstall   # 恢复原版文件（商店版：删掉复制出来的那份和快捷方式）
```

**Claude 更新后**再运行一次 `node install.mjs`。商店版会自动发现版本变了，重新复制一份。

## 怎么用

| | |
|---|---|
| `Ctrl+Alt+T` | 切到下一个主题（最后一项是「关闭」） |
| `Ctrl+Alt+Shift+T` | 切浓度：场景透出的多少（淡 / 中 / 浓） |
| `Ctrl+Alt+P` | **录屏模式**：隐藏侧栏内容（会话列表、项目、账号）和顶部标题栏里的会话名、文件夹路径，并跳过标了 `"private": true` 的主题。再按一次关闭；不关的话重启后也一直开着。 |
| 点侧栏顶部的横幅 | 切到下一个主题 |

吉祥物的交互：

- **打字**：每按一个键，它点一下头，沿输入框上沿迈一步。打得越快冲劲越大：步子变大、身体前倾、脚下扬灰。连续打字有连击计数，会随机出暴击，20 / 50 / 100 连击时会喊话，最高纪录会记下来。
- **回车**：先蹲下蓄力再起跳。冲劲越大跳得越高，满速时还会空翻一圈。
- **点它**：随机弹一下、摇头或跳一下，再冒个台词气泡；连点三下会转晕。
- **拖它**：按住任意位置拖动，它会跟着拖动的速度来回甩；松手就留在原地。拖回输入框上沿附近，或者双击它，它会爬回去。
- 点在它的透明部分上，点击会照常落到页面上。

录演示视频：开一个**新会话**，按 `Ctrl+Alt+P`，然后只录 Claude 这一个窗口。Windows 上按 `Win+Alt+R` 用 Game Bar 录，它只录当前窗口；macOS 上按 `Cmd+Shift+5`，选「录制所选窗口」。

浅色主题下只换强调色，不铺场景，因为场景是按深色模式设计的。系统打开「减少动态效果」后，动画和粒子会关掉。

## 自己做主题

一个主题就是一个文件夹，里面放一个 `skin.json`：

```json
{
  "name": { "en": "Aurora", "zh": "极光" },
  "order": 1,
  "hue": 168, "sat": 62,
  "line": "#5fe3c4",
  "background": "background.jpg",
  "peek": "peek.png",
  "badge": "badge.png",
  "fx": "snow", "fxColor": "#e6f7ff"
}
```

| 字段 | 含义 |
|---|---|
| `name` | 字符串，或 `{ "en", "zh" }` |
| `hue`、`sat` | 强调色的色相和饱和度（明度沿用 Claude 自己的色阶） |
| `line` | 描边、顶部细线、气泡用的高亮色 |
| `background` | 宽幅图，21:9 效果好，例如 3840×1632。**中间要暗、要空**，那里是放文字的地方。不填就自动生成渐变。 |
| `peek` | 透明底 PNG：吉祥物趴在边上探头，图的底边要平。不填就不显示吉祥物。 |
| `badge` | 透明底 PNG，用在侧栏横幅上 |
| `fx` | 粒子：`snow` 雪、`petals` 花瓣、`embers` 火星、`rain` 雨、`spores` 光点，不填就没有 |
| `font` | 可选，`.woff2` / `.ttf`，用于横幅标题、气泡和连击数字 |
| `lines` | 可选，台词：`{ "click": [...], "drag": [...], "send": [...], "dizzy": [...], "home": [...], "crit": [...], "tiers": [20/50/100/200 连击时喊的 4 句] }`，也可以按语言分：`{ "zh": {...}, "en": {...} }` |
| `tag` | 侧栏横幅里主题名下面那行小字，默认 `claude-skins` |
| `default` | 设成 `true`，第一次启动时就用这个主题 |
| `private` | 设成 `true`，录屏模式下隐藏这个主题（比如用了内部或有版权素材、不该出现在录屏里的主题） |

两种加法：

- **不用重装**：把文件夹放进 Claude 用户数据目录下的 `claude-skins/skins/<id>/`，然后重启 Claude。
  Windows 是 `%APPDATA%\Claude\claude-skins\skins\`，macOS 是 `~/Library/Application Support/Claude/claude-skins/skins/`。
  id 和内置主题相同时，会替换掉内置的那个。
- **打进包里**：`node install.mjs --skins <放主题文件夹的目录>`，可以写多次。

`<id>` 就是文件夹名，只能用小写字母、数字和 `-`。

## 原理

安装器把 Claude 的 `resources/app.asar` 解开，加两样东西后重新打包。放在包外的原生文件会逐字节核对，必须和原来完全一样。

- `src/main.js`：在主进程里先于应用本身加载，只处理三个 IPC 请求：列出主题、读主题文件、写诊断文件，而且只接受来自 claude.ai / claude.com 页面的请求。
- `src/deco.js` + `src/preload.js`：追加到主窗口的 preload 末尾。它们在页面后面用 canvas 画场景；把大块不透明的底板改成半透明，让场景透出来（卡片、代码块、输入框保留原底色）；把名字里带 `accent` / `brand` 的 CSS 变量换成主题色；再加上吉祥物、横幅、毛玻璃和粒子。图片在页面里从字节解码，不碰页面的 CSP。

改过的 asar 要能加载，必须关掉 Electron 内置的 asar 完整性校验，所以安装器会关掉 `EnableEmbeddedAsarIntegrityValidation` 和 `OnlyLoadAppFromAsar` 这两个 fuse。`app.asar` 和可执行文件的备份放在原文件旁边，名字是 `*.claude-skins-orig`。`uninstall` 会把这两个文件恢复回去。

所有代码出错时都不会影响应用本身：claude.ai 改版后，最坏的情况也只是吉祥物或强调色不显示了，Claude 照常能用。

## 排查

- **看不到任何变化**：确认启动的是改过的那份（商店版要用 **Claude (skins)** 快捷方式），并且安装前已经完全退出 Claude。`node install.mjs status` 应该显示 `patched: yes`。
- **场景出来了，但强调色没变或者吉祥物不见了**：多半是 claude.ai 改版了。看 Claude 用户数据目录下的 `claude-skins/probe.json`（重点看 `accents`、`hooks`、`seeThrough` 三项），附上它提个 issue。
- **改完后 Claude 打不开**：先 `node install.mjs uninstall`，再附上你的 Claude 版本号提个 issue。

## 开发

```bash
npm test        # 单元测试 + 在模拟的 claude.ai 页面上跑 Electron 端到端测试
npm run e2e     # 只跑端到端测试，截图在 test/out/
npm run demo    # 重新录 docs/demo.mp4 和 docs/demo.gif（需要 ffmpeg）
npm run e2e -- --skins <目录>   # 把你自己的主题文件夹也加载进来一起测
```

端到端测试在真 Electron 里加载真实的 preload，页面用 `test/e2e/app/page.html`。这是个模拟页，只还原了 claude-skins 依赖的那些结构。测试用真实的键盘和鼠标事件驱动，覆盖这些内容：

- 每个主题都检查一遍
- 底板透出
- 强调色替换，以及危险色、`on-accent` 前景色保持不变
- 打字速度和走路速度的对应关系
- 回车起跳
- 连击
- 透明处的点击能落到页面上
- 拖动和吸回
- 浓度切换
- 诊断文件

如果你有自己的打包流程，可以直接调用 `lib/patch.mjs` 导出的 `injectInto(解开的 asar 目录, { skinDirs })`。

## 另见

- [codex-skins](https://github.com/JIA-ss/codex-skins)：同一套主题和吉祥物，给 Codex 桌面版用。主题文件夹两边通用，拷过去就能用。

## 版权

代码采用 MIT 协议，见 [LICENSE](LICENSE)。内置主题的美术（背景和吉祥物）是为本项目用图像模型生成的，只用了文字提示词、没有任何参考图，以 [CC0](https://creativecommons.org/publicdomain/zero/1.0/) (see [skins/LICENSE.md](skins/LICENSE.md)) 发布。提示词在 [tools/gen_art.py](tools/gen_art.py) 里。

## 法律声明

> 本项目是非官方的社区项目，与 Anthropic 没有任何关联，也未获得其认可或赞助。仓库里没有 Anthropic 的代码或素材：安装器修改的是已经装在你电脑上的那份 Claude。「Claude」和「Anthropic」是 Anthropic PBC 的商标。使用风险自担。

---

<p align="center"><sub>由 <a href="https://github.com/JIA-ss">JIA-ss</a> 制作 · 代码 MIT · 主题美术 CC0</sub></p>
