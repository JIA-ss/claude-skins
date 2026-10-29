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
// shortcut "Claude (skins)" is created; uninstall deletes that copy and the shortcut. Quit Claude before running.
// macOS: /Applications/Claude.app is never touched (patching it in place breaks Anthropic's signature, and with it
// Claude's auto-update). The app is copied to ~/Applications/Claude (skins).app, the copy is patched and re-signed
// ad hoc; it shares chats, login and settings with the regular app. Re-run after Claude updates.
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
  if (process.platform === "darwin") {
    const official = "/Applications/Claude.app";
    const copy = path.join(os.homedir(), "Applications", "Claude (skins).app");
    if (fs.existsSync(official)) return { ...layoutFor(copy), store: official };
    if (fs.existsSync(copy)) return layoutFor(copy);
  }
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
// what the original archive keeps unpacked, as repack options: files by basename (macOS has extension-less helpers
// like spawn-helper) and whole unpacked directories (e.g. pty.node.dSYM) by relative path
function unpackOptions(asar, archive) {
  const names = new Set(["*.node", "*.exe", "*.dll", "*.dylib", "*.so"]);
  const dirs = [];
  const esc = (t) => t.replace(/[{}*?[\],]/g, "?");
  const walk = (node, rel) => {
    for (const [name, e] of Object.entries(node.files || {})) {
      const r = rel ? path.join(rel, name) : name;
      if (e.files && e.unpacked) dirs.push(esc(r));
      else if (e.files) walk(e, r);
      else if (e.unpacked) names.add(esc(name));
    }
  };
  walk(asar.getRawHeader(archive).header, "");
  return { unpack: `{${[...names].join(",")}}`, ...(dirs.length ? { unpackDir: dirs.length > 1 ? `{${dirs.join(",")}}` : dirs[0] } : {}) };
}
function countUnpacked(asar, archive) {
  let n = 0;
  const walk = (node, inside) => {
    for (const e of Object.values(node.files || {})) {
      if (e.files) walk(e, inside || e.unpacked);
      else if (!e.link && (inside || e.unpacked)) n++;
    }
  };
  walk(asar.getRawHeader(archive).header, false);
  return n;
}
function macVersion(app) {
  try {
    return execFileSync("defaults", ["read", path.join(app, "Contents", "Info"), "CFBundleVersion"], { encoding: "utf8" }).trim();
  } catch {
    return "?";
  }
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
const SHORTCUT = () => path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Claude (skins).lnk");
function shortcut(exe) {
  const lnk = SHORTCUT();
  ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${lnk}');$s.TargetPath='${exe}';$s.WorkingDirectory='${path.dirname(exe)}';$s.Save()`);
  return lnk;
}

// ---------- commands ----------
async function install(l) {
  if (l.store) {
    // the copy does not update itself. The Store folder name carries the version (Claude_4.29.0.0_x64__…), so a
    // different source path means Claude was updated: take a fresh copy.
    // macOS: the marker lives next to the bundle (anything inside it would have to be signed) and carries the version
    const mac = process.platform === "darwin";
    const marker = mac ? l.root.replace(/\.app$/, ".source.txt") : path.join(l.root, "claude-skins-source.txt");
    const source = mac ? `${l.store} ${macVersion(l.store)}` : l.store;
    const copied = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : "";
    if (copied !== source || !fs.existsSync(l.root)) {
      if (fs.existsSync(l.root) && running(l)) die("the skinned copy is running — quit it first");
      log(`${mac ? "keeping the signed app untouched" : "Store (MSIX) install is read-only"}; copying ${l.store} -> ${l.root}`);
      fs.rmSync(l.root, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(l.root), { recursive: true });
      if (mac) execFileSync("ditto", [l.store, l.root]);
      else fs.cpSync(l.store, l.root, { recursive: true });
      fs.writeFileSync(marker, source + "\n");
      Object.assign(l, layoutFor(l.root), { store: l.store });
    }
  }
  if (!l.exe || !fs.existsSync(path.join(l.resources, "app.asar"))) die(`no app.asar under ${l.resources}`);
  if (running(l)) die("Claude is running from this folder — quit it (tray / menu → Quit) and run again");
  const asarPath = path.join(l.resources, "app.asar");
  const unpacked = asarPath + ".unpacked";
  // pristine sources to rebuild from: the official app for a macOS copy, otherwise backups next to the files
  const fromOfficial = process.platform === "darwin" && l.store;
  const srcAsar = fromOfficial ? path.join(layoutFor(l.store).resources, "app.asar") : asarPath + BAK;
  const srcExe = fromOfficial ? layoutFor(l.store).exe : l.exe + BAK;
  if (!fromOfficial && !fs.existsSync(asarPath + BAK)) fs.copyFileSync(asarPath, asarPath + BAK);
  if (!fromOfficial && !fs.existsSync(l.exe + BAK)) fs.copyFileSync(l.exe, l.exe + BAK);

  const asar = require("@electron/asar");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "claude-skins-"));
  try {
    // extraction reads native files from <archive>.unpacked, so the backup gets its unpacked folder alongside
    fs.copyFileSync(srcAsar, path.join(tmp, "app.asar"));
    if (fs.existsSync(unpacked)) fs.cpSync(unpacked, path.join(tmp, "app.asar.unpacked"), { recursive: true });
    const tree = path.join(tmp, "tree");
    asar.extractAll(path.join(tmp, "app.asar"), tree);
    if (isPatched(tree)) die("the backup is already patched — restore a clean app.asar first");
    const info = injectInto(tree, { skinDirs });
    log(`injected into ${info.main} + ${info.preload}; themes: ${info.skins.join(", ")}`);
    const out = path.join(tmp, "out", "app.asar");
    fs.mkdirSync(path.dirname(out));
    await asar.createPackageWithOptions(tree, out, unpackOptions(asar, path.join(tmp, "app.asar")));
    // every file the original header lists as unpacked must come out byte-identical, none missing. Files lying in
    // app.asar.unpacked that the header does not list (macOS builds ship a stray pty.node.dSYM) are left alone.
    const have = new Set(hashTree(unpacked).split("\n"));
    const got = hashTree(out + ".unpacked").split("\n").filter(Boolean);
    if (got.length !== countUnpacked(asar, path.join(tmp, "app.asar")) || got.some((h) => !have.has(h))) die("repacked native files differ from the installed ones; aborting without changes");
    fs.copyFileSync(out, asarPath);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  fs.copyFileSync(srcExe, l.exe);
  await setFuses(l.exe, false);
  if (process.platform === "darwin") {
    execFileSync("codesign", ["--force", "--deep", "--sign", "-", l.root]);
    execFileSync("codesign", ["--verify", "--deep", "--strict", l.root]);
    log(`re-signed ${l.root} ad hoc. Start it from ~/Applications (or Spotlight: "Claude (skins)"); quit the regular Claude first.`);
    log("macOS may ask once to let it use the \"Claude Safe Storage\" keychain item — choose Always Allow.");
  } else if (l.store) log(`shortcut: ${shortcut(l.exe)}`);
  log(`installed into ${l.root}. Start Claude, then ${process.platform === "darwin" ? "Ctrl+Option+T" : "Ctrl+Alt+T"} to cycle themes.`);
}

async function uninstall(l) {
  if (l.store) {
    // Store install: the skinned copy is ours entirely — remove it and its shortcut
    if (!fs.existsSync(l.root)) return log("nothing to remove (no skinned copy)");
    if (running(l)) die("the skinned copy is running — quit it first");
    fs.rmSync(l.root, { recursive: true, force: true });
    if (process.platform === "darwin") {
      fs.rmSync(l.root.replace(/\.app$/, ".source.txt"), { force: true });
      return log(`removed ${l.root}; ${l.store} was never modified`);
    }
    fs.rmSync(SHORTCUT(), { force: true });
    try {
      fs.rmdirSync(path.dirname(l.root)); // %LOCALAPPDATA%\claude-skins, only if empty
    } catch {}
    return log(`removed ${l.root} and the "Claude (skins)" shortcut; the Store app was never modified`);
  }
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
