#!/usr/bin/env node
// claude-skins installer: patches YOUR local Claude desktop app. Nothing from Anthropic is redistributed.
//   node install.mjs [install]   [--app <path>] [--skins <dir> ...] [--yes]
//   node install.mjs uninstall   [--app <path>]
//   node install.mjs status      [--app <path>]
// What install does (and uninstall undoes):
//   1. backs up resources/app.asar and the executable next to themselves (*.claude-skins-orig), once;
//   2. always rebuilds from that backup: extract → inject src/ + skins/ → repack (same set of unpacked native files);
//   3. turns off two Electron fuses (embedded asar integrity check, load-app-only-from-asar) so the patched asar loads;
//      on macOS the bundle is re-signed ad hoc.
// Windows Store / MSIX installs are read-only: the app is copied to %LOCALAPPDATA%\claude-skins\Claude and a Start menu
// shortcut "Claude (skins)" is created. Quit Claude before running.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { injectInto, isPatched, REPO } from "./lib/patch.mjs";

const require = createRequire(import.meta.url);
const BAK = ".claude-skins-orig";
const args = process.argv.slice(2);
const cmd = args[0] && !args[0].startsWith("-") ? args.shift() : "install";
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const skinDirs = [path.join(REPO, "skins")];
args.forEach((a, i) => a === "--skins" && args[i + 1] && skinDirs.push(path.resolve(args[i + 1])));
const log = (...a) => console.log("claude-skins:", ...a);
const die = (m) => {
  console.error("claude-skins: " + m);
  process.exit(1);
};

// ---------- locate ----------
function ps(command) {
  return execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim();
}
// returns { root, resources, exe, kind }
function layoutFor(p) {
  if (p.endsWith(".app")) return { root: p, resources: path.join(p, "Contents", "Resources"), exe: path.join(p, "Contents", "MacOS", "Claude"), kind: "mac" };
  const exe = ["claude.exe", "Claude.exe", "claude"].map((e) => path.join(p, e)).find((e) => fs.existsSync(e));
  return { root: p, resources: path.join(p, "resources"), exe, kind: process.platform === "win32" ? "win" : "linux" };
}
function locate() {
  const given = opt("--app");
  if (given) return layoutFor(path.resolve(given.replace(/^~/, os.homedir())));
  if (process.platform === "darwin") return layoutFor("/Applications/Claude.app");
  if (process.platform === "win32") {
    const copy = path.join(process.env.LOCALAPPDATA, "claude-skins", "Claude");
    const squirrel = path.join(process.env.LOCALAPPDATA, "AnthropicClaude");
    if (fs.existsSync(squirrel)) {
      const apps = fs.readdirSync(squirrel).filter((d) => /^app-[\d.]+$/.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (apps.length) return layoutFor(path.join(squirrel, apps.at(-1)));
    }
    let store = "";
    try {
      store = ps("(Get-AppxPackage -Name Claude | Select-Object -First 1).InstallLocation");
    } catch {}
    if (store) return { ...layoutFor(copy), store: path.join(store, "app") };
    if (fs.existsSync(path.join(copy, "claude.exe"))) return layoutFor(copy);
  }
  die("Claude desktop not found; pass --app <install dir or Claude.app>");
}

// ---------- helpers ----------
function running(l) {
  try {
    if (process.platform === "win32") {
      const n = ps(`@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith('${l.root.replace(/'/g, "''")}\\', 'OrdinalIgnoreCase') }).Count`);
      return Number(n) > 0;
    }
    execFileSync("pgrep", ["-f", l.exe], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function hashTree(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(path.relative(dir, p).replace(/\\/g, "/") + " " + crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"));
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort().join("\n");
}
async function setFuses(exe, on) {
  const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");
  await flipFuses(exe, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: process.platform === "darwin",
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: on,
    [FuseV1Options.OnlyLoadAppFromAsar]: on,
  });
}
function shortcut(exe) {
  const lnk = path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Claude (skins).lnk");
  ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${lnk}');$s.TargetPath='${exe}';$s.WorkingDirectory='${path.dirname(exe)}';$s.Save()`);
  return lnk;
}

// ---------- commands ----------
async function install(l) {
  if (l.store) {
    // the copy does not update itself. The Store folder name carries the version (Claude_4.29.0.0_x64__…), so a
    // different source path means Claude was updated: take a fresh copy.
    const marker = path.join(l.root, "claude-skins-source.txt");
    const copied = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : "";
    if (copied !== l.store) {
      if (fs.existsSync(l.root) && running(l)) die("the skinned copy is running — quit it first");
      log(`Store (MSIX) install is read-only; copying ${l.store} -> ${l.root}`);
      fs.rmSync(l.root, { recursive: true, force: true });
      fs.cpSync(l.store, l.root, { recursive: true });
      fs.writeFileSync(marker, l.store + "\n");
      Object.assign(l, layoutFor(l.root), { store: l.store });
    }
  }
  if (!l.exe || !fs.existsSync(path.join(l.resources, "app.asar"))) die(`no app.asar under ${l.resources}`);
  if (running(l)) die("Claude is running from this folder — quit it (tray / menu → Quit) and run again");
  const asarPath = path.join(l.resources, "app.asar");
  const unpacked = asarPath + ".unpacked";
  if (!fs.existsSync(asarPath + BAK)) fs.copyFileSync(asarPath, asarPath + BAK);
  if (!fs.existsSync(l.exe + BAK)) fs.copyFileSync(l.exe, l.exe + BAK);

  const asar = require("@electron/asar");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-skins-"));
  try {
    // extraction reads native files from <archive>.unpacked, so the backup gets its unpacked folder alongside
    fs.copyFileSync(asarPath + BAK, path.join(tmp, "app.asar"));
    if (fs.existsSync(unpacked)) fs.cpSync(unpacked, path.join(tmp, "app.asar.unpacked"), { recursive: true });
    const tree = path.join(tmp, "tree");
    asar.extractAll(path.join(tmp, "app.asar"), tree);
    if (isPatched(tree)) die("the backup is already patched — restore a clean app.asar first");
    const info = injectInto(tree, { skinDirs });
    log(`injected into ${info.main} + ${info.preload}; themes: ${info.skins.join(", ")}`);
    const out = path.join(tmp, "out", "app.asar");
    fs.mkdirSync(path.dirname(out));
    await asar.createPackageWithOptions(tree, out, { unpack: "{*.node,*.exe,*.dll,*.dylib,*.so}" });
    if (hashTree(out + ".unpacked") !== hashTree(unpacked)) die("repacked native files differ from the installed ones; aborting without changes");
    fs.copyFileSync(out, asarPath);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  fs.copyFileSync(l.exe + BAK, l.exe);
  await setFuses(l.exe, false);
  if (l.store) log(`shortcut: ${shortcut(l.exe)}`);
  log(`installed into ${l.root}. Start Claude, then Ctrl+Alt+T to cycle themes.`);
}

async function uninstall(l) {
  if (running(l)) die("Claude is running from this folder — quit it first");
  const asarPath = path.join(l.resources, "app.asar");
  let done = false;
  for (const f of [asarPath, l.exe]) {
    if (f && fs.existsSync(f + BAK)) {
      fs.copyFileSync(f + BAK, f);
      fs.rmSync(f + BAK);
      done = true;
    }
  }
  if (process.platform === "darwin" && done) execFileSync("codesign", ["--force", "--deep", "--sign", "-", l.root]);
  log(done ? `restored the original files in ${l.root}` : "nothing to restore (no backups found)");
}

function status(l) {
  const asarPath = path.join(l.resources, "app.asar");
  log(`app:      ${l.root}${l.store ? ` (Store install, copy target; source ${l.store})` : ""}`);
  log(`backup:   ${fs.existsSync(asarPath + BAK) ? "yes" : "no"}`);
  let patched = false;
  try {
    const asar = require("@electron/asar");
    patched = asar.listPackage(asarPath).some((f) => /claude-skins-main\.js$/.test(f));
  } catch {}
  log(`patched:  ${patched ? "yes" : "no"}`);
  log(`running:  ${l.exe && fs.existsSync(l.exe) && running(l) ? "yes" : "no"}`);
}

const l = locate();
if (cmd === "install") await install(l);
else if (cmd === "uninstall") await uninstall(l);
else if (cmd === "status") status(l);
else die(`unknown command ${cmd}`);
