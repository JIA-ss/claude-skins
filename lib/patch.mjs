// Injects claude-skins into an extracted app.asar tree. Pure file operations; used by install.mjs and by anyone who
// keeps their own build pipeline (see README "Using it in your own build").
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MAIN_NAME = "claude-skins-main.js";
export const MARK = "/* claude-skins */";

// tree: the extracted app.asar root. skinDirs: folders whose sub-folders are themes (later ones override earlier ones).
export function injectInto(tree, { skinDirs = [path.join(REPO, "skins")] } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(tree, "package.json"), "utf8"));
  const mainFile = path.join(tree, pkg.main);
  const buildDir = path.dirname(mainFile);
  const preloadFile = path.join(buildDir, "mainView.js");
  if (!fs.existsSync(preloadFile)) throw new Error(`main view preload not found: ${preloadFile} (unsupported Claude version)`);

  // main process: require our module before the app's own code
  let main = fs.readFileSync(mainFile, "utf8");
  if (main.includes(MAIN_NAME)) throw new Error(`${pkg.main} is already patched; start from the original app.asar`);
  const needle = 'require("./index.js")';
  const hook = `require("./${MAIN_NAME}"),`;
  if (main.split(needle).length === 2) main = main.replace(needle, hook + needle);
  else main = main.replace(/^("use strict";)?/, (m) => `${m}try{require("./${MAIN_NAME}")}catch{}`);
  fs.writeFileSync(mainFile, main);
  fs.copyFileSync(path.join(REPO, "src", "main.js"), path.join(buildDir, MAIN_NAME));

  // main view preload: append deco + preload, each wrapped so a failure never touches the app
  const parts = ["deco.js", "preload.js"].map((f) => fs.readFileSync(path.join(REPO, "src", f), "utf8"));
  fs.appendFileSync(preloadFile, `\n${MARK}\n${parts.join("\n")}\n`);

  // themes
  const out = path.join(buildDir, "claude-skins", "skins");
  fs.rmSync(path.join(buildDir, "claude-skins"), { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const ids = [];
  for (const dir of skinDirs) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory() || !fs.existsSync(path.join(dir, d.name, "skin.json"))) continue;
      fs.rmSync(path.join(out, d.name), { recursive: true, force: true });
      fs.cpSync(path.join(dir, d.name), path.join(out, d.name), { recursive: true });
      if (!ids.includes(d.name)) ids.push(d.name);
    }
  }
  return { main: pkg.main, preload: path.relative(tree, preloadFile), skins: ids };
}

export function isPatched(tree) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(tree, "package.json"), "utf8"));
    return fs.readFileSync(path.join(tree, pkg.main), "utf8").includes(MAIN_NAME);
  } catch {
    return false;
  }
}
