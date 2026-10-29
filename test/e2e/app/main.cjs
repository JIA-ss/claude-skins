// End-to-end test in a real Electron (same major as Claude desktop): a window + WebContentsView with the claude-skins
// preload over a mock claude.ai page. Drives keys / mouse, checks behaviour, screenshots every theme.
// Env (set by test/run-e2e.mjs): CS_REPO, CS_OUT, CS_PRELOAD, CS_USERDATA, CS_RECORD=1 to record a demo instead.
process.env.CLAUDE_SKINS_NO_AUTOINSTALL = "1";
const electron = require("electron");
const { app, BrowserWindow, WebContentsView } = electron;
const path = require("path");
const fs = require("fs");
const { installClaudeSkins } = require(path.join(process.env.CS_REPO, "src", "main.js"));

app.commandLine.appendSwitch("lang", "en-US");
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.setPath("userData", process.env.CS_USERDATA);
const OUT = process.env.CS_OUT;
const RECORD = process.env.CS_RECORD === "1";
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + JSON.stringify(detail)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Themes under test: the repo's skins/ plus an optional extra folder (CS_EXTRA_SKINS, e.g. a private theme pack),
// listed and ordered exactly like main.js does, so the cycle order below matches the app.
const BUNDLED = path.join(process.env.CS_REPO, "skins");
// the demo only ever shows the bundled (license-free) themes
const EXTRA = (process.env.CS_RECORD !== "1" && process.env.CS_EXTRA_SKINS) || path.join(process.env.CS_OUT, "no-extra-skins");
function themes() {
  const out = new Map();
  for (const dir of [BUNDLED, EXTRA]) {
    if (!fs.existsSync(dir)) continue;
    for (const id of fs.readdirSync(dir)) {
      try {
        out.set(id, { id, ...JSON.parse(fs.readFileSync(path.join(dir, id, "skin.json"), "utf8")) });
      } catch {}
    }
  }
  const list = [...out.values()].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.id.localeCompare(b.id));
  const first = list.find((t) => t.default) ?? list[0];
  const all = [...list, { id: "off" }];
  const i = all.indexOf(first);
  return { first, cycle: [...all.slice(i), ...all.slice(0, i)] };
}
const en = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v.en ?? v.zh : v);
process.on("uncaughtException", (e) => {
  console.error(e);
  app.exit(2);
});

app.whenReady().then(async () => {
  try {
    installClaudeSkins(electron, { isAllowedSender: () => true, bundledDir: BUNDLED, userDir: EXTRA });
    const { first, cycle: ids } = themes();
    console.log(`themes: ${ids.map((t) => t.id).join(" → ")}`);
    const W = 1600, H = 900;
    const win = new BrowserWindow({ width: W, height: H, x: 40, y: 40, useContentSize: true, skipTaskbar: !RECORD, show: true, backgroundColor: "#1f1e1d" });
    const view = new WebContentsView({ webPreferences: { preload: process.env.CS_PRELOAD, sandbox: true, backgroundThrottling: false } });
    win.setIgnoreMouseEvents(true); // real mouse movements must not interfere with the synthetic ones
    win.contentView.addChildView(view);
    view.setBounds({ x: 0, y: 0, width: W, height: H });
    const page = view.webContents;
    // the demo records a clean "new chat" screen (no history, no recents); the test uses a busier chat page
    await page.loadFile(path.join(__dirname, RECORD ? "demo.html" : "page.html"));
    await page.executeJavaScript("localStorage.clear()");
    await page.reload();
    await sleep(2500);
    const js = (c) => page.executeJavaScript(c);
    const shot = async (name) => {
      for (let k = 0; k < 6; k++) {
        await sleep(400);
        try {
          const png = (await page.capturePage()).toPNG();
          if (png.length) return fs.writeFileSync(path.join(OUT, name), png);
        } catch {}
      }
    };
    const cycle = async () => {
      page.sendInputEvent({ type: "keyDown", keyCode: "T", modifiers: ["control", "alt"] });
      page.sendInputEvent({ type: "keyUp", keyCode: "T", modifiers: ["control", "alt"] });
      await sleep(1500);
    };
    const typeChar = (ch) => {
      const code = ch === " " ? "Space" : ch;
      page.sendInputEvent({ type: "keyDown", keyCode: code });
      page.sendInputEvent({ type: "char", keyCode: ch });
      page.sendInputEvent({ type: "keyUp", keyCode: code });
    };
    const focusComposer = () => js("document.querySelector('[data-cds=ChatComposer] [contenteditable]').focus(); 1");

    if (RECORD) return await record({ page, js, sleep, cycle, typeChar, focusComposer, win, shot, ids });

    // ---- every theme: scene on, panels see-through, accent swapped, safe colors untouched ----
    for (const { id } of ids) {
      const st = JSON.parse(await js(`JSON.stringify({ id: localStorage.getItem('claude-skins.id'), op: document.querySelector('[data-cskin=layer]').style.getPropertyValue('opacity'), accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-brand').trim(), danger: getComputedStyle(document.documentElement).getPropertyValue('--danger-000').trim(), onAccent: getComputedStyle(document.querySelector('.btn')).color, mainBg: getComputedStyle(document.querySelector('.wrap > .pointer-events-none')).backgroundColor, wrapBg: getComputedStyle(document.querySelector('.wrap')).backgroundColor, asideBg: getComputedStyle(document.querySelector('aside')).backgroundColor, cardBg: getComputedStyle(document.querySelector('.card:not(.bg-surface-2)')).backgroundColor, tilesBg: getComputedStyle(document.querySelector('.tiles-shell')).backgroundColor })`));
      const on = id !== "off";
      const ok = on
        ? st.op === "1" && /0\.62\)/.test(st.mainBg) && /rgba\(0, 0, 0, 0\)/.test(st.wrapBg) && /0\.3\)/.test(st.asideBg) && !/^color\(srgb [\d.]+ [\d.]+ [\d.]+\)$/.test(st.tilesBg) && st.accent !== "15 63.1% 59.6%"
        : st.op === "0" && st.mainBg === "rgb(31, 30, 29)" && st.accent === "15 63.1% 59.6%";
      check(`theme ${id}`, ok && st.danger === "0 70% 50%" && st.cardBg === "rgb(48, 48, 46)" && st.onAccent === "rgb(255, 255, 255)", st);
      await shot(`theme-${id}.png`);
      await cycle();
    }
    // back to the first theme
    for (let i = 0; i < ids.length + 1 && (await js("localStorage.getItem('claude-skins.id')")) !== first.id; i++) await cycle();
    await sleep(2000);

    const deco = JSON.parse(await js(`JSON.stringify({ banner: !!document.querySelector('[data-cskin=banner]'), title: document.querySelector('[data-cskin=banner]')?.shadowRoot.querySelector('.w')?.textContent, peek: getComputedStyle(document.querySelector('[data-cskin=peek]')).display, on: document.documentElement.hasAttribute('data-cskin-on'), fx: !!document.querySelector('[data-cskin=layer] canvas + canvas'), glass: getComputedStyle(document.querySelector('[data-cds=ChatComposer] > .bg-surface-3')).backdropFilter })`));
    check("decoration: banner, mascot, particles, glass", deco.banner && deco.title === en(first.name) && deco.peek === (first.peek ? "block" : "none") && deco.on && (deco.fx || !first.fx) && /blur/.test(deco.glass), deco);

    // ---- typing: one nod + one step per key, faster typing walks faster, stays on the composer edge ----
    const walkRun = (gap) => js(`(async () => { const card = document.querySelector('[data-cds=ChatComposer] > .bg-surface-3'); const ed = card.querySelector('[contenteditable]'); ed.focus(); const el = document.querySelector('[data-cskin=peek]'); let px = el.getBoundingClientRect().left, path = 0, nod = ''; const t0 = performance.now(); for (let i = 0; i < 20; i++) { ed.dispatchEvent(new InputEvent('input', { bubbles: true })); await new Promise(r => setTimeout(r, ${gap})); const nx = el.getBoundingClientRect().left; path += Math.abs(nx - px); px = nx; nod = nod || (document.querySelector('[data-cskin=peek-body]').getAnimations().length ? 'nod' : ''); } const dt = performance.now() - t0; await new Promise(r => setTimeout(r, 2500)); const clip = el.getBoundingClientRect(), cr = card.getBoundingClientRect(); const a = el.getBoundingClientRect().left; await new Promise(r => setTimeout(r, 300)); return JSON.stringify({ path, dt, nod, stopped: el.getBoundingClientRect().left === a, saved: localStorage.getItem('claude-skins.peekHomeX'), inside: clip.left >= cr.left && clip.right <= cr.right, overlap: clip.bottom - cr.top }); })()`).then(JSON.parse);
    const slow = await walkRun(200), fast = await walkRun(60);
    check("typing: nod + step per key, faster typing walks faster, stops, remembers, stays on the composer", slow.path > 20 && fast.path / fast.dt > 1.8 * (slow.path / slow.dt) && slow.nod === "nod" && slow.stopped && fast.stopped && fast.saved !== null && slow.inside && fast.inside && Math.abs(fast.overlap - 3) <= 1, { slow, fast });

    const jump = JSON.parse(await js(`(async () => { const ed = document.querySelector('[data-cds=ChatComposer] [contenteditable]'); ed.focus(); for (let i = 0; i < 12; i++) { ed.dispatchEvent(new InputEvent('input', { bubbles: true })); await new Promise(r => setTimeout(r, 60)); } const tilt = document.querySelector('[data-cskin=peek-walk]').style.transform; ed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); ed.dispatchEvent(new InputEvent('input', { bubbles: true })); await new Promise(r => setTimeout(r, 380)); const a = document.querySelector('[data-cskin=peek-body]').getAnimations()[0]; const kf = a ? JSON.stringify(a.effect.getKeyframes().map(k => k.transform)) : ''; const say = document.querySelector('[data-cskin=peek-say]')?.textContent || null; await new Promise(r => setTimeout(r, 1500)); return JSON.stringify({ tilt, kf, say }); })()`));
    check("Enter: leans forward when typing fast, jump survives the composer clearing, higher with momentum", /rotate\(-?[1-9]/.test(jump.tilt) && /translateY\(-(3\d|4\d)px\)/.test(jump.kf) && !!jump.say, jump);

    const own = first.lines && (first.lines.en || first.lines.zh) ? first.lines.en ?? first.lines.zh : first.lines; // same rule as deco.js
    const tiers = own && Array.isArray(own.tiers) && own.tiers.length >= 2 ? own.tiers : ["Combo!", "On fire!"];
    const combo = JSON.parse(await js("(async () => { const ed = document.querySelector('[data-cds=ChatComposer] [contenteditable]'); ed.focus(); let says = new Set(), maxN = 0; for (let i = 0; i < 60; i++) { ed.dispatchEvent(new InputEvent('input', { bubbles: true })); await new Promise(r => setTimeout(r, 50)); const t = document.querySelector('[data-cskin=peek-say]')?.textContent; if (t) says.add(t); maxN = Math.max(maxN, Number((document.querySelector('[data-cskin=peek-combo]')?.textContent || '').slice(1)) || 0); } await new Promise(r => setTimeout(r, 1200)); return JSON.stringify({ says: [...says], maxN, best: localStorage.getItem('claude-skins.bestCombo') }); })()"));
    check("combo counter, tier callouts, best record after the streak ends", combo.maxN >= 60 && combo.says.includes(tiers[0]) && combo.says.includes(tiers[1]) && Number(combo.best) >= 60, combo);

    // ---- mouse: click the mascot, transparent pixels fall through, drag out and back home ----
    const pt = JSON.parse(await js(`(() => { const c = document.querySelector('[data-cskin=peek] canvas'); const r = c.getBoundingClientRect(); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let y = Math.floor(c.height * 0.35); y < c.height; y += 2) for (let x = Math.floor(c.width * 0.3); x < c.width * 0.7; x += 2) if (d[(y * c.width + x) * 4 + 3] > 200) return JSON.stringify({ x: Math.round(r.left + x / c.width * r.width), y: Math.round(r.top + y / c.height * r.height) }); return 'null'; })()`));
    await js("window.__clicks = 0; document.body.addEventListener('click', () => window.__clicks++); window.__md = 0; document.body.addEventListener('mousedown', () => window.__md++); 1");
    const mouse = (type, x, y, extra = {}) => page.sendInputEvent({ type, x, y, button: "left", clickCount: 1, ...extra });
    mouse("mouseMove", pt.x, pt.y);
    await sleep(100);
    const cursor = await js("document.documentElement.getAttribute('data-cskin-grab')");
    mouse("mouseDown", pt.x, pt.y);
    mouse("mouseUp", pt.x, pt.y);
    await sleep(250);
    const click = JSON.parse(await js("JSON.stringify({ say: document.querySelector('[data-cskin=peek-say]')?.textContent || null, dots: document.querySelectorAll('[data-cskin=peek-dot]').length, anims: document.querySelector('[data-cskin=peek-body]').getAnimations().length, clicks: window.__clicks, md: window.__md })"));
    check("click: bubble + sparks + a reaction, the page never sees the click", cursor === "grab" && click.say && click.dots > 0 && click.anims > 0 && click.clicks === 0 && click.md === 0, { pt, cursor, ...click });
    await sleep(400);
    const box = JSON.parse(await js("JSON.stringify(document.querySelector('[data-cskin=peek]').getBoundingClientRect())"));
    mouse("mouseDown", Math.round(box.left + 3), Math.round(box.top + 3));
    mouse("mouseUp", Math.round(box.left + 3), Math.round(box.top + 3));
    await sleep(150);
    check("clicks on transparent sticker pixels reach the page", (await js("window.__clicks")) === 1);
    await sleep(1200);
    mouse("mouseDown", pt.x, pt.y);
    for (let i = 1; i <= 15; i++) {
      mouse("mouseMove", pt.x - i * 20, pt.y - i * 14, { modifiers: ["leftButtonDown"] });
      await sleep(16);
    }
    await sleep(100);
    const mid = JSON.parse(await js("JSON.stringify({ sway: document.querySelector('[data-cskin=peek-sway]').style.transform, grab: document.documentElement.getAttribute('data-cskin-grab') })"));
    mouse("mouseUp", pt.x - 300, pt.y - 210);
    await sleep(600);
    const free = await js("localStorage.getItem('claude-skins.peekPos')");
    check("drag: swings with the drag, stays where dropped and remembers it", /rotate\(-?[1-9]/.test(mid.sway) && mid.grab === "grabbing" && !!free, { mid, free });
    mouse("mouseDown", pt.x - 300, pt.y - 210);
    for (let i = 1; i <= 15; i++) {
      mouse("mouseMove", pt.x - 300 + i * 20, pt.y - 210 + i * 14, { modifiers: ["leftButtonDown"] });
      await sleep(16);
    }
    mouse("mouseUp", pt.x, pt.y);
    await sleep(900);
    const back = JSON.parse(await js("(() => { const clip = document.querySelector('[data-cskin=peek]').getBoundingClientRect(); const top = document.querySelector('[data-cds=ChatComposer] > .bg-surface-3').getBoundingClientRect().top; return JSON.stringify({ pos: localStorage.getItem('claude-skins.peekPos'), gap: clip.bottom - top }); })()"));
    check("dropping it near the composer edge snaps it home", back.pos === null && Math.abs(back.gap - 3) <= 1, back);

    // ---- intensity and user themes ----
    page.sendInputEvent({ type: "keyDown", keyCode: "T", modifiers: ["control", "alt", "shift"] });
    page.sendInputEvent({ type: "keyUp", keyCode: "T", modifiers: ["control", "alt", "shift"] });
    await sleep(600);
    check("Ctrl+Alt+Shift+T changes intensity", /0\.46\)/.test(await js("getComputedStyle(document.querySelector('.wrap > .pointer-events-none')).backgroundColor")));
    await shot("demo-deco.png");

    // ---- stage mode: sidebar contents and the top title strip disappear, private themes are skipped ----
    const stageKey = async () => {
      page.sendInputEvent({ type: "keyDown", keyCode: "P", modifiers: ["control", "alt"] });
      page.sendInputEvent({ type: "keyUp", keyCode: "P", modifiers: ["control", "alt"] });
      await sleep(900);
    };
    const vis = () => js(`JSON.stringify({ stage: document.documentElement.hasAttribute('data-cskin-stage'), recent: getComputedStyle(document.querySelector('.row.active')).visibility, account: getComputedStyle(document.querySelector('.row.account')).visibility, banner: getComputedStyle(document.querySelector('[data-cskin=banner]')).visibility, title: getComputedStyle(document.querySelector('.sess-title')).visibility, path: getComputedStyle(document.querySelector('.sess-path')).visibility, icon: getComputedStyle(document.querySelector('.sess-icon')).visibility, chat: getComputedStyle(document.querySelector('.you')).visibility, skin: localStorage.getItem('claude-skins.id') })`).then(JSON.parse);
    await stageKey();
    const on = await vis();
    const priv = new Set(ids.filter((t) => t.private).map((t) => t.id));
    const seen = [];
    for (let i = 0; i < ids.length + 1; i++) {
      seen.push(await js("localStorage.getItem('claude-skins.id')"));
      await cycle();
    }
    check("stage mode: sidebar list, account and title strip hidden, banner and chat stay, private themes skipped", on.stage && on.recent === "hidden" && on.account === "hidden" && on.banner === "visible" && on.title === "hidden" && on.path === "hidden" && on.icon === "visible" && on.chat === "visible" && !priv.has(on.skin) && !seen.some((id) => priv.has(id)), { on, seen });
    await stageKey();
    const off = await vis();
    check("stage mode off restores everything", !off.stage && off.recent === "visible" && off.account === "visible" && off.title === "visible" && off.path === "visible", off);
    const probe = path.join(app.getPath("userData"), "claude-skins", "probe.json");
    await sleep(7000);
    check("probe file written", fs.existsSync(probe) && JSON.parse(fs.readFileSync(probe, "utf8")).hooks.composer === true);
  } catch (e) {
    check("exception", false, String(e.stack));
  }
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  app.exit(results.length && results.every((r) => r.ok) ? 0 : 1);
});

// ---- demo recording: frames from the compositor, encoded by test/run-e2e.mjs ----
async function record({ page, js, sleep, cycle, typeChar, focusComposer, shot, ids }) {
  // README screenshots of the clean screen, one per theme, then back to the first theme for the video
  for (const { id } of ids) {
    if (id !== "off") await shot(`readme-${id}.png`);
    await cycle();
  }
  await sleep(1500);
  const frames = [];
  let t0 = 0;
  page.beginFrameSubscription(false, (img) => {
    const t = Date.now();
    if (!t0) t0 = t;
    frames.push({ t: t - t0, jpg: img.toJPEG(88) });
  });
  const typeText = async (text, gap) => {
    for (const ch of text) {
      typeChar(ch);
      await sleep(gap + Math.random() * gap * 0.5);
    }
  };
  // keep the compositor painting even when nothing moves
  const tick = setInterval(() => page.invalidate(), 33);
  await sleep(1200);
  await focusComposer();
  await typeText("hi! ", 180);
  await sleep(500);
  await typeText("let me show you how fast this little fox can run when I type really fast", 55);
  await sleep(300);
  page.sendInputEvent({ type: "keyDown", keyCode: "Return" });
  page.sendInputEvent({ type: "keyUp", keyCode: "Return" });
  await js("document.querySelector('[data-cds=ChatComposer] [contenteditable]').textContent=''; 1");
  await sleep(1800);
  // click and drag the mascot
  const pt = JSON.parse(await js(`(() => { const c = document.querySelector('[data-cskin=peek] canvas'); const r = c.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * 0.62) }); })()`));
  const mouse = (type, x, y, extra = {}) => page.sendInputEvent({ type, x, y, button: "left", clickCount: 1, ...extra });
  for (let i = 0; i < 3; i++) {
    mouse("mouseDown", pt.x, pt.y);
    mouse("mouseUp", pt.x, pt.y);
    await sleep(i < 2 ? 160 : 1400);
  }
  mouse("mouseDown", pt.x, pt.y);
  for (let i = 1; i <= 40; i++) {
    mouse("mouseMove", Math.round(pt.x - i * 14 + Math.sin(i / 3) * 30), Math.round(pt.y - i * 9), { modifiers: ["leftButtonDown"] });
    await sleep(24);
  }
  mouse("mouseUp", pt.x - 560, pt.y - 360);
  await sleep(1300);
  const box = JSON.parse(await js("JSON.stringify(document.querySelector('[data-cskin=peek] canvas').getBoundingClientRect())"));
  page.sendInputEvent({ type: "mouseDown", x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height * 0.62), button: "left", clickCount: 2 });
  page.sendInputEvent({ type: "mouseUp", x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height * 0.62), button: "left", clickCount: 2 });
  await sleep(1400);
  // tour the themes while typing a little in each
  // aurora → sakura → campfire → neon; stop before "off" so the video ends on a theme
  for (let i = 0; i < 3; i++) {
    await cycle();
    await focusComposer();
    await typeText(["petals!", "so warm", "rainy night vibes"][i], 70);
    page.sendInputEvent({ type: "keyDown", keyCode: "Return" });
    await js("document.querySelector('[data-cds=ChatComposer] [contenteditable]').textContent=''; 1");
    await sleep(1500);
  }
  clearInterval(tick);
  page.endFrameSubscription();
  const dir = path.join(OUT, "frames");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const list = [];
  frames.forEach((f, i) => {
    const name = `f${String(i).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(dir, name), f.jpg);
    const next = frames[i + 1] ? frames[i + 1].t : f.t + 33;
    list.push(`file '${name}'`, `duration ${((next - f.t) / 1000).toFixed(3)}`);
  });
  fs.writeFileSync(path.join(dir, "list.txt"), list.join("\n") + "\n");
  console.log(`recorded ${frames.length} frames, ${(frames.at(-1).t / 1000).toFixed(1)} s`);
  app.exit(0);
}
