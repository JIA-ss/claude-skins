// Injection on a minimal fake app.asar tree (no Electron needed).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { injectInto, isPatched, MAIN_NAME } from "../lib/patch.mjs";

function fakeTree() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "cs-unit-"));
  fs.mkdirSync(path.join(t, ".vite", "build"), { recursive: true });
  fs.writeFileSync(path.join(t, "package.json"), JSON.stringify({ main: ".vite/build/index.pre.js" }));
  fs.writeFileSync(path.join(t, ".vite/build/index.pre.js"), '"use strict";boot();require("./index.js");');
  fs.writeFileSync(path.join(t, ".vite/build/mainView.js"), "/* app preload */");
  return t;
}

test("injects main module, preload and bundled themes", () => {
  const t = fakeTree();
  const info = injectInto(t);
  const main = fs.readFileSync(path.join(t, ".vite/build/index.pre.js"), "utf8");
  assert.equal(main, `"use strict";boot();require("./${MAIN_NAME}"),require("./index.js");`);
  const pre = fs.readFileSync(path.join(t, ".vite/build/mainView.js"), "utf8");
  assert.ok(pre.startsWith("/* app preload */") && pre.includes("function claudeSkinsDeco") && pre.includes("claude-skins:list"));
  assert.ok(fs.existsSync(path.join(t, ".vite/build", MAIN_NAME)));
  assert.deepEqual(info.skins.sort(), ["aurora", "campfire", "neon", "sakura"]);
  for (const id of info.skins) assert.ok(fs.existsSync(path.join(t, ".vite/build/claude-skins/skins", id, "skin.json")));
  assert.ok(isPatched(t));
});

test("refuses to patch twice", () => {
  const t = fakeTree();
  injectInto(t);
  assert.throws(() => injectInto(t), /already patched/);
});

test("extra skin folders are added and override bundled ids", () => {
  const t = fakeTree();
  const extra = fs.mkdtempSync(path.join(os.tmpdir(), "cs-skins-"));
  for (const id of ["aurora", "mine"]) {
    fs.mkdirSync(path.join(extra, id));
    fs.writeFileSync(path.join(extra, id, "skin.json"), JSON.stringify({ name: id, hue: 1, sat: 2 }));
  }
  const info = injectInto(t, { skinDirs: [path.resolve("skins"), extra] });
  assert.ok(info.skins.includes("mine"));
  const aurora = JSON.parse(fs.readFileSync(path.join(t, ".vite/build/claude-skins/skins/aurora/skin.json"), "utf8"));
  assert.equal(aurora.name, "aurora");
});
