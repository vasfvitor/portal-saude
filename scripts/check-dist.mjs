// Checks on the built site (run after `pnpm build`): the only client JavaScript is the search on /plano/ and /remedios/,
// no e-mail address is published, every internal link resolves, and every operator in the search index has
// its page. Exits 1 with the list of problems.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
const SEARCH_PAGES = new Set(["plano/index.html", "remedios/index.html"]);
const problems = [];

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (name.endsWith(".html")) yield path;
  }
}

function resolves(href) {
  const path = decodeURI(href.split(/[?#]/)[0]);
  const target = join(DIST, path);
  return path.endsWith("/") ? existsSync(join(target, "index.html")) : existsSync(target);
}

let pages = 0;
for (const file of htmlFiles(DIST)) {
  pages++;
  const page = relative(DIST, file);
  const html = readFileSync(file, "utf-8");
  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/g)) {
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    if (SEARCH_PAGES.has(page) && /type="module"/.test(attrs)) continue;
    problems.push(`${page}: unexpected <script${attrs}>`);
  }
  const email = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.exec(
    html.replace(/<script type="application\/ld\+json">.*?<\/script>/gs, ""),
  );
  if (email) problems.push(`${page}: e-mail-like text ${email[0]}`);
  for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) {
    if (!resolves(href)) problems.push(`${page}: broken internal link ${href}`);
  }
}

const index = JSON.parse(readFileSync(join(DIST, "plano/busca.json"), "utf-8"));
for (const { h } of index) {
  if (!resolves(h)) problems.push(`operator page missing: ${h}`);
}

if (problems.length) {
  console.error(problems.slice(0, 50).join("\n"));
  console.error(`${problems.length} problem(s) in ${pages} pages`);
  process.exit(1);
}
console.log(`dist ok: ${pages} pages, ${index.length} operators`);
