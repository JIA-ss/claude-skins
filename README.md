<h1 align="center">claude-skins</h1>

<p align="center"><b>Themes and a typing mascot for the Claude desktop app — Windows and macOS.</b><br>
<sub>A painted scene behind your chats, the accent recolored to match, frosted glass, gentle particles — and a little mascot that peeks over your message box, hops along as you type and jumps when you hit Enter.</sub></p>

<p align="center">
  <a href="https://github.com/JIA-ss/claude-skins/actions/workflows/ci.yml"><img src="https://github.com/JIA-ss/claude-skins/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/JIA-ss/claude-skins/releases/latest"><img src="https://img.shields.io/github/v/release/JIA-ss/claude-skins?label=release&color=5fe3c4" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JIA-ss/claude-skins?color=3d8bfd" alt="license"></a>
  <a href="skins/LICENSE.md"><img src="https://img.shields.io/badge/theme_art-CC0-8a8a8a" alt="theme art: CC0"></a>
  <a href="#install"><img src="https://img.shields.io/badge/platform-Windows_%7C_macOS-0078D6?logo=windows&logoColor=white" alt="platform"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A5%2022-339933?logo=nodedotjs&logoColor=white" alt="node >= 22"></a>
  <a href="https://github.com/JIA-ss/claude-skins/stargazers"><img src="https://img.shields.io/github/stars/JIA-ss/claude-skins?color=f5c518&logo=github" alt="stars"></a>
  <a href="https://github.com/JIA-ss/codex-skins"><img src="https://img.shields.io/badge/sibling-codex--skins-10a37f" alt="codex-skins"></a>
</p>

<p align="center"><a href="README.zh-CN.md">中文说明</a> · <a href="#install">Install</a> · <a href="#using-it">Shortcuts</a> · <a href="#make-your-own-theme">Make a theme</a> · <a href="https://github.com/JIA-ss/codex-skins">codex-skins (for Codex)</a></p>

<p align="center"><img src="docs/demo.gif" alt="claude-skins demo" width="860"></p>

> [!NOTE]
> **Unofficial.** claude-skins is an unofficial community project. It is not made, endorsed or supported by Anthropic. It patches the copy of Claude installed on <i>your</i> machine; no Anthropic files are redistributed here. Use it at your own risk, and expect to re-run the installer after Claude updates.

| Aurora | Night Sakura | Campfire | Neon Rain |
|---|---|---|---|
| ![](docs/theme-aurora.jpg) | ![](docs/theme-sakura.jpg) | ![](docs/theme-campfire.jpg) | ![](docs/theme-neon.jpg) |

## Install

Requires [Node.js](https://nodejs.org) 22+. Quit Claude first (tray icon / menu → **Quit**, not just closing the window).

```bash
git clone https://github.com/JIA-ss/claude-skins.git
cd claude-skins
npm install --omit=dev   # dev dependencies (Electron) are only needed for the tests
node install.mjs
```

Start Claude again. That's it.

| Your Claude install | What the installer does |
|---|---|
| **Windows, Microsoft Store / MSIX** (the default download today) | The Store folder is read-only, so it copies the app to `%LOCALAPPDATA%\claude-skins\Claude`, patches the copy, and adds a Start menu shortcut **Claude (skins)**. Launch Claude from that shortcut. Your chats, login and settings are shared with the regular app. |
| **Windows, classic installer** (`%LOCALAPPDATA%\AnthropicClaude\app-*`) | Patches it in place. |
| **macOS** (`/Applications/Claude.app`) | Never touches the signed app (patching it in place would break Anthropic's signature and with it Claude's auto-update). It copies the app to `~/Applications/Claude (skins).app`, patches the copy and re-signs it ad hoc. Start **Claude (skins)** from `~/Applications` or Spotlight, with the regular Claude quit; chats, login and settings are shared. On first start macOS asks for your login password to let it read the "Claude Safe Storage" keychain item — choose *Always Allow* (an ad hoc signature changes on every re-install, so it asks again after each one). Shortcuts are ⌃⌥T / ⌃⌥⇧T / ⌃⌥P. Tested on macOS 26 (Apple silicon) with Claude 4.29. |
| Anything else | `node install.mjs --app <folder that contains resources/app.asar, or Claude.app>` |

Other commands:

```bash
node install.mjs status      # where Claude is, whether it is patched
node install.mjs uninstall   # put the original files back (Store version: delete the skinned copy + shortcut)
```

**When Claude updates**, the skins do not follow by themselves — re-run the installer once:

- The regular Claude keeps updating itself as usual; its files are never modified (except classic Windows installs, see below).
- The skinned copy (`%LOCALAPPDATA%\claude-skins\Claude` on Windows, `~/Applications/Claude (skins).app` on macOS) stays on the version it was copied from. It keeps working, it just falls behind.
- Quit the skinned copy and run `node install.mjs` again. It sees that the regular app changed (Store: its versioned folder; macOS: its version number), takes a fresh copy, patches and, on macOS, re-signs it. (Classic Windows installs are patched in place: each Claude update replaces the patched files, so re-run after every update there too.)
- macOS: after each re-install the keychain prompt comes back once ("Claude Safe Storage") — the ad hoc signature is new every time.
- Not verified yet: whether the copy's own built-in updater tries to update the copy. If it does, it either fails (the signature no longer matches) or leaves you with an unthemed newer version; re-running `node install.mjs` fixes both.

## Using it

| | |
|---|---|
| `Ctrl+Alt+T` | next theme (… → off → first theme) |
| `Ctrl+Alt+Shift+T` | intensity: how much of the scene shows through (low / medium / high) |
| `Ctrl+Alt+P` | **stage mode** for screen recordings: hides the sidebar contents (chat list, projects, account) and the session title / folder in the top strip, and skips themes marked `"private": true`. Press again to turn it off; it stays on across restarts until you do. |
| click the sidebar banner | next theme |

The mascot:

- **Typing** — every keystroke it nods and takes a step along the top of the message box. Type faster and it builds momentum: longer strides, leaning forward, little dust puffs. Keep a streak going for a combo counter, random crits and callouts at 20 / 50 / 100 keys; your best streak is remembered.
- **Enter** — crouches and jumps; the more momentum, the higher (and a flip at full speed).
- **Click** — boing / head shake / hop with a speech bubble; three quick clicks make it dizzy.
- **Drag** — grab it anywhere, it swings with your movement and stays where you drop it. Drop it back near the message box (or double-click it) and it climbs back home.
- Clicks on its transparent parts go straight through to the page.

Recording a demo: open a **new chat**, press `Ctrl+Alt+P`, then record just the Claude window (on Windows `Win+Alt+R` with the Game Bar records the focused window only; on macOS `Cmd+Shift+5` → *Record Selected Window*).

Light theme: only the accent color changes (the scene is designed for dark mode). Reduced motion (OS setting) turns off animations and particles.

## Make your own theme

A theme is a folder with a `skin.json`:

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

| Field | Meaning |
|---|---|
| `name` | string, or `{ "en", "zh" }` |
| `hue`, `sat` | accent color (HSL hue / saturation; lightness is kept from Claude's own palette) |
| `line` | highlight color for rings, the top line, bubbles |
| `background` | wide image (21:9 works well, e.g. 3840×1632). Keep the **center dark and empty** — text sits there. Omit for a generated gradient. |
| `peek` | transparent PNG of the mascot peeking over an edge (bottom edge flat). Omit for no mascot. |
| `badge` | transparent PNG for the sidebar banner |
| `fx` | particles: `snow`, `petals`, `embers`, `rain`, `spores`, or omit |
| `font` | optional `.woff2` / `.ttf` used for the banner title, bubbles and combo counter |
| `lines` | optional speech lines: `{ "click": [...], "drag": [...], "send": [...], "dizzy": [...], "home": [...], "crit": [...], "tiers": [4 callouts for 20/50/100/200 combos] }`, or per language `{ "zh": {...}, "en": {...} }` |
| `tag` | small text under the theme name in the sidebar banner (default `claude-skins`) |
| `default` | `true` to make it the theme used on first start |
| `private` | `true` to hide it in stage mode (e.g. a theme with internal / licensed art you should not show in recordings) |

Two ways to add it:

- **No reinstall:** put the folder in Claude's user data folder under `claude-skins/skins/<id>/` and restart Claude.
  Windows `%APPDATA%\Claude\claude-skins\skins\`, macOS `~/Library/Application Support/Claude/claude-skins/skins/`.
  A folder with the same id as a built-in theme replaces it.
- **Bundle it:** `node install.mjs --skins <folder containing theme folders>` (repeatable).

`<id>` is the folder name: lowercase letters, digits and `-`.

## How it works

The installer unpacks Claude's `resources/app.asar`, adds two things and packs it again (the native files that live outside the archive are checked to be byte-identical):

- `src/main.js` is loaded in the main process before the app. It answers three IPC calls — list themes, read a theme file, write a diagnostics file — and only for pages served from claude.ai / claude.com.
- `src/deco.js` + `src/preload.js` are appended to the main window's preload. They draw the scene on a canvas behind the page, turn the big opaque backing panels semi-transparent so the scene shows through (cards, code blocks and inputs keep their background), recolor CSS variables whose names contain `accent` / `brand`, and add the mascot, banner, glass and particles. Images are decoded from bytes, so the page's Content Security Policy is untouched.

Electron's embedded asar integrity check has to be turned off for a modified archive to load, so the installer flips the `EnableEmbeddedAsarIntegrityValidation` and `OnlyLoadAppFromAsar` fuses (backups of `app.asar` and the executable are kept next to them as `*.claude-skins-orig`). `uninstall` restores both files.

Everything is written to fail quietly: if claude.ai changes its markup, the worst case is that the mascot or the accent stops showing up — the app itself keeps working.

## Troubleshooting

- **Nothing changed** — make sure you started the patched app (on the Store version: the **Claude (skins)** shortcut) and that you quit Claude completely before installing. `node install.mjs status` should say `patched: yes`.
- **Scene shows but the accent doesn't change, or the mascot is missing** — claude.ai probably changed. Look at `claude-skins/probe.json` in Claude's user data folder (`accents`, `hooks`, `seeThrough`) and open an issue with it.
- **Claude won't start after patching** — `node install.mjs uninstall`, then open an issue with your Claude version.

## Develop

```bash
npm test        # unit tests + an Electron end-to-end test on a mock claude.ai page
npm run e2e     # only the end-to-end test; screenshots in test/out/
npm run demo    # re-record docs/demo.mp4 + docs/demo.gif (needs ffmpeg)
npm run e2e -- --skins <dir>   # also load and test your own theme folders
```

The end-to-end test runs the real preload in Electron against `test/e2e/app/page.html`, a mock that reproduces just the hooks claude-skins relies on, and drives keys and the mouse: every theme, see-through panels, accent swap (and that danger / on-accent colors are left alone), typing / walking speed, Enter jump, combos, click-through, drag and snap-back, intensity and the diagnostics file.

For your own build pipeline, `lib/patch.mjs` exports `injectInto(extractedAsarDir, { skinDirs })`.

## See also

- [codex-skins](https://github.com/JIA-ss/codex-skins) — the same themes and mascot for the Codex desktop app. Theme folders work in both.

## Credits

Code: MIT, see [LICENSE](LICENSE). The bundled theme art (backgrounds and mascots) was generated for this project with an image model from text prompts only — no reference images — and is released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/) (see [skins/LICENSE.md](skins/LICENSE.md)). The prompts are in [tools/gen_art.py](tools/gen_art.py).

## Legal notice

> This is an **unofficial community project**, not affiliated with, endorsed by or sponsored by Anthropic. It contains no Anthropic code or assets: the installer modifies the copy of Claude already installed on your machine. "Claude" and "Anthropic" are trademarks of Anthropic PBC. Use it at your own risk.

---

<p align="center"><sub>Made by <a href="https://github.com/JIA-ss">JIA-ss</a> · code MIT · theme art CC0</sub></p>
