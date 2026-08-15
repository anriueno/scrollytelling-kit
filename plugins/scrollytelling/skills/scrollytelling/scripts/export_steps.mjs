#!/usr/bin/env node
/**
 * export_steps.mjs — screenshot every step of a running story (desktop 1440×900) and build a PDF handout.
 * Usage: node scripts/export_steps.mjs http://localhost:5173 out-dir [--theme paper] [--mobile]
 * Needs Playwright: npx playwright install chromium   (first run only; ~150 MB)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const [url = "http://localhost:5173", out = "export", ...rest] = process.argv.slice(2);
const theme = rest.includes("--theme") ? rest[rest.indexOf("--theme") + 1] : null;
const mobile = rest.includes("--mobile");
let chromium;
const pick = (m) => (m.chromium ? m.chromium : m.default && m.default.chromium);
try { chromium = pick(await import("playwright")); }
catch { try { const req = createRequire(join(process.cwd(), "package.json")); chromium = pick(await import(pathToFileURL(req.resolve("playwright")).href)); }
  catch { console.error("Playwright not found in this project. Run in the project dir: npm i -D playwright && npx playwright install chromium"); process.exit(1); } }
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const target = theme ? `${url}${url.includes("?") ? "&" : "?"}theme=${theme}` : url;
await page.goto(target, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const steps = await page.$$eval(".scrolly .step", (els) => els.map((e, i) => ({ i, top: e.getBoundingClientRect().top + window.scrollY, h: e.getBoundingClientRect().height })));
const files = [];
// hero
await page.screenshot({ path: join(out, `00-hero.png`) }); files.push(`00-hero.png`);
for (const s of steps) {
  const y = s.top - (mobile ? 0.7 : 0.55) * (mobile ? 844 : 900) + 30;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
  await page.waitForTimeout(1500);
  const name = `${String(s.i + 1).padStart(2, "0")}-step.png`;
  await page.screenshot({ path: join(out, name) }); files.push(name);
}
// contact sheet → PDF
const html = `<html><body style="margin:0;background:#fff">${files.map((f) => `<div style="page-break-after:always;display:flex;align-items:center;justify-content:center;height:100vh"><img src="${f}" style="max-width:100%;max-height:100%"/></div>`).join("")}</body></html>`;
writeFileSync(join(out, "handout.html"), html);
const p2 = await browser.newPage();
await p2.goto("file://" + join(process.cwd(), out, "handout.html"), { waitUntil: "load" });
await p2.pdf({ path: join(out, "handout.pdf"), landscape: !mobile, printBackground: true, format: "A4" });
await browser.close();
console.log(`Exported ${files.length} images + handout.pdf to ${out}/`);
