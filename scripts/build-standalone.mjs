// Builds the whole app into one self-contained HTML file (dist/acuitycheck.html)
// that runs without a server: React, app code and compiled Tailwind CSS are inlined.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
mkdirSync(dist, { recursive: true });

execFileSync(
  path.join(root, "node_modules/.bin/tailwindcss"),
  ["-i", "src/app/globals.css", "-o", "dist/app.css", "--minify"],
  { cwd: root, stdio: "inherit" },
);

const result = await build({
  entryPoints: [path.join(root, "src/standalone/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  logLevel: "warning",
  alias: {
    "@": path.join(root, "src"),
    "next/link": path.join(root, "src/standalone/next-link.tsx"),
    "next/navigation": path.join(root, "src/standalone/next-navigation.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_STANDALONE": '"1"',
  },
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(dist, "app.css"), "utf8");

const html = `<title>AcuityCheck</title>
<style>
${css}
/* Standalone: fill the host frame instead of the raw viewport. */
html, body, #root { height: 100%; background: #ffffff; color: #0f172a; }
.h-\\[100dvh\\] { height: 100% !important; }
</style>
<div id="root"></div>
<script>
${js}
</script>
`;
writeFileSync(path.join(dist, "acuitycheck.html"), html);
console.log(`dist/acuitycheck.html ${(html.length / 1024).toFixed(0)} KB`);
