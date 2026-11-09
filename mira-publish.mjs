#!/usr/bin/env node
// Publishes this project's static build to MIRA (Techco.lab prototype review).
// Usage: node mira-publish.mjs [--label "what changed"]  (reads mira.json, or review.json, in the project root)
// Config: MIRA_URL / MIRA_TOKEN in the environment (GitHub Actions: secret MIRA_TOKEN),
//         or ~/.config/techco-review/url and ~/.config/techco-review/token. REVIEW_URL / REVIEW_TOKEN still work.
// Screens: add "screens": ["/", "/dashboard"] (and optionally "viewports": ["1440x900", "390x844"]) to mira.json
//          and install Playwright in the project (npm i -D playwright && npx playwright install chromium).
// Latest version always at https://mira.ntechcolab.com/mira-publish.mjs
import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";

const MAX = 4 * 1024 * 1024;
const MIME = { html: "text/html", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json", map: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", ico: "image/x-icon",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", txt: "text/plain", xml: "application/xml", webmanifest: "application/manifest+json",
  mp4: "video/mp4", webm: "video/webm", wasm: "application/wasm", pdf: "application/pdf" };

const args = process.argv.slice(2);
const labelIdx = args.indexOf("--label");
const ci = process.env.GITHUB_ACTIONS === "true";
// In the Action, the commit message arrives through env (MIRA_LABEL), never interpolated into the shell. First line only.
const label = (labelIdx >= 0 ? args[labelIdx + 1] : process.env.MIRA_LABEL)?.split("\n")[0].trim().slice(0, 200) || undefined;

async function readConfig(name, ...envNames) {
  for (const e of envNames) if (process.env[e]) return process.env[e].trim();
  return (await readFile(path.join(homedir(), ".config", "techco-review", name), "utf8")).trim();
}

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

async function api(base, token, method, route, body, contentType) {
  const res = await fetch(base + route, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(contentType ? { "content-type": contentType } : {}) },
    body,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { error: text }; }
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${json.error ?? text}`);
  return json;
}

/** Where the build came from: remote, commit, branch and whether the tree had uncommitted changes. Without git, sends nothing. */
function gitInfo() {
  const run = (...a) => { const r = spawnSync("git", a, { encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : null; };
  const sha = run("rev-parse", "HEAD");
  if (!sha) return {};
  if (ci) {
    // On GitHub the checkout remote carries a credential; build the public repository URL instead.
    const remote = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}` : null;
    return { gitSha: process.env.GITHUB_SHA || sha, gitBranch: process.env.GITHUB_REF_NAME || run("rev-parse", "--abbrev-ref", "HEAD"), gitRemote: remote, gitDirty: false };
  }
  return { gitSha: sha, gitBranch: run("rev-parse", "--abbrev-ref", "HEAD"), gitRemote: run("config", "--get", "remote.origin.url"), gitDirty: (run("status", "--porcelain") ?? "") !== "" };
}

/** The project's own Playwright (devDependency); null when it is not installed. */
function loadPlaywright() {
  const req = createRequire(path.join(process.cwd(), "/"));
  for (const name of ["playwright", "playwright-core"]) {
    try { return req(name); } catch { /* try the next one */ }
  }
  return null;
}

/**
 * Minimal static server: the build answers on the same path it will live at in MIRA (basePath). `gateScript` (from
 * MIRA, when the project has a prototype password) goes right after <head>, as MIRA does, so captures skip the gate.
 */
function serveDir(dir, prefix, gateScript) {
  const root = path.resolve(dir);
  const read = async (rel) => { try { const f = path.join(root, rel); if (!f.startsWith(root)) return null; const s = await stat(f); return s.isFile() ? { f, body: await readFile(f) } : null; } catch { return null; } };
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (!url.startsWith(prefix)) { res.writeHead(404).end(); return; }
    let rel = url.slice(prefix.length) || "/";
    const tries = rel.endsWith("/") ? [rel + "index.html"] : [rel, rel + ".html", rel + "/index.html"];
    let hit = null;
    for (const t of [...tries, "/404.html", "/index.html"]) { hit = await read(t); if (hit) break; }
    if (!hit) { res.writeHead(404).end(); return; }
    const ext = hit.f.split(".").pop().toLowerCase();
    let body = hit.body;
    if (gateScript && ext === "html") {
      const html = body.toString("utf8");
      const m = /<head\b[^>]*>/i.exec(html) ?? /<html\b[^>]*>/i.exec(html);
      body = m ? html.slice(0, m.index + m[0].length) + gateScript + html.slice(m.index + m[0].length) : gateScript + html;
    }
    res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" }).end(body);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

/** After publishing: captures the mira.json "screens" routes at each viewport and sends them to MIRA. A failure here does not undo the version. */
async function captureScreens(cfg, base, token, v) {
  const routes = Array.isArray(cfg.screens) ? cfg.screens.filter((r) => typeof r === "string" && r.startsWith("/")) : [];
  if (!routes.length) return;
  const pw = loadPlaywright();
  if (!pw) { console.log("→ screens skipped: install Playwright to enable them (npm i -D playwright && npx playwright install chromium)"); return; }
  const viewports = (Array.isArray(cfg.viewports) && cfg.viewports.length ? cfg.viewports : ["1440x900"]).filter((x) => /^\d{3,4}x\d{3,4}$/.test(x));
  const srv = await serveDir(cfg.dir, v.basePath, v.gateScript);
  let browser;
  let sent = 0;
  try {
    browser = await pw.chromium.launch(process.env.MIRA_CHROME ? { executablePath: process.env.MIRA_CHROME } : {});
    for (const vp of viewports) {
      const [width, height] = vp.split("x").map(Number);
      const page = await browser.newPage({ viewport: { width, height } });
      for (const route of routes) {
        await page.goto(srv.url + v.basePath + route, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(800);
        const png = await page.screenshot({ type: "png" });
        await api(base, token, "PUT", `/api/cli/versions/${v.versionId}/screens?route=${encodeURIComponent(route)}&viewport=${vp}`, png, "image/png");
        sent++;
        console.log(`→ screen ${route} at ${vp}`);
      }
      await page.close();
    }
  } catch (e) {
    console.log(`→ screens stopped (the version is published): ${e.message}`);
  } finally {
    await browser?.close();
    srv.close();
  }
  if (sent) console.log(`✓ ${sent} screen${sent > 1 ? "s" : ""} captured`);
}

async function main() {
  const cfgFile = await readFile("mira.json", "utf8").then(() => "mira.json", () => "review.json");
  const cfg = JSON.parse(await readFile(cfgFile, "utf8"));
  if (!cfg.slug || !cfg.build || !cfg.dir) throw new Error(`${cfgFile} needs { "slug", "build", "dir" }`);
  const base = (await readConfig("url", "MIRA_URL", "REVIEW_URL")).replace(/\/$/, "");
  const token = await readConfig("token", "MIRA_TOKEN", "REVIEW_TOKEN");

  const git = gitInfo();
  if (git.gitSha) console.log(`→ commit ${git.gitSha.slice(0, 7)}${git.gitBranch ? ` (${git.gitBranch})` : ""}${git.gitDirty ? " · WARNING: uncommitted changes, this commit does not reproduce the build" : ""}`);
  console.log(`→ reserving a version of "${cfg.slug}" on ${base}`);
  const v = await api(base, token, "POST", "/api/cli/versions", JSON.stringify({ slug: cfg.slug, label, source: ci ? "github" : "cli", ...git }), "application/json");
  console.log(`→ v${v.number} reserved · BASE_PATH=${v.basePath}`);

  console.log(`→ build: ${cfg.build}`);
  const build = spawnSync(cfg.build, { shell: true, stdio: "inherit", env: { ...process.env, BASE_PATH: v.basePath } });
  if (build.status !== 0) {
    await api(base, token, "POST", `/api/cli/versions/${v.versionId}/fail`);
    throw new Error("build failed; version marked as failed");
  }

  const files = await walk(cfg.dir);
  const tooBig = [];
  const queue = [...files];
  let sent = 0;
  let failed = null;
  async function worker() {
    while (queue.length && !failed) {
      const rel = queue.shift();
      const full = path.join(cfg.dir, rel);
      const size = (await stat(full)).size;
      if (size > MAX) { tooBig.push(`${rel} (${(size / 1048576).toFixed(1)} MB)`); continue; }
      const ext = rel.split(".").pop().toLowerCase();
      const type = MIME[ext] ?? "application/octet-stream";
      try {
        await api(base, token, "PUT", `/api/cli/versions/${v.versionId}/files?path=${encodeURIComponent(rel)}`, await readFile(full), type);
      } catch (e) {
        failed = failed ?? new Error(`${rel}: ${e.message}`);
        return;
      }
      sent++;
      process.stdout.write(`\r→ uploaded ${sent}/${files.length}`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  process.stdout.write("\n");

  // Any failure cancels the version right away (otherwise it stays "uploading" until the daily cleanup).
  const cancel = () => api(base, token, "POST", `/api/cli/versions/${v.versionId}/fail`).catch(() => {});
  if (failed) { await cancel(); throw new Error(`upload failed, publish canceled. ${failed.message}`); }
  if (tooBig.length) {
    await cancel();
    throw new Error(`files over 4 MB, publish canceled:\n  ${tooBig.join("\n  ")}`);
  }

  const done = await api(base, token, "POST", `/api/cli/versions/${v.versionId}/finalize`);
  console.log(`✓ v${done.number} published and current: ${done.url}`);
  await captureScreens(cfg, base, token, v);
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
