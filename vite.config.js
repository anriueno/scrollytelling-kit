import { defineConfig } from "vite";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Dev-only endpoint: the page's inline editor POSTs the updated story.json here (⌘/Ctrl+S in edit mode). */
function storySaver() {
  return {
    name: "scrolly-story-saver",
    configureServer(server) {
      server.middlewares.use("/__save-story", (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
        let body = ""; req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const obj = JSON.parse(body); const p = resolve(server.config.root, "public/story.json");
            writeFileSync(p + ".bak", readFileSync(p)); writeFileSync(p, JSON.stringify(obj, null, 1) + "\n");
            res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, path: p }));
          } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: String(e.message) })); }
        });
      });
    },
  };
}
export default defineConfig({ plugins: [storySaver()] });
