// Checks on the built site (run after `pnpm build`): the only client JavaScript is the search on /plano/ and
// /remedios/ and the "seu estado" picker on the medicine and substância pages, no e-mail address is published,
// every internal link resolves, and every operator and medicine in the search indexes has its page (and every
// operator its /plano/<registro>/ shortcut). Exits 1 with
// the list of problems.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
// a module script is allowed only where the component that owns it is on the page: the search box or the picker
const DONOS_DE_SCRIPT = /class="(busca|seu-estado)"/;
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
    if (DONOS_DE_SCRIPT.test(html) && /type="module" src="\/_astro\/(Busca|SeuEstado)\./.test(attrs)) continue;
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

const counts = {};
for (const [indice, kind] of [
  ["plano/busca.json", "operator"],
  ["remedios/busca.json", "medicine"],
]) {
  const items = JSON.parse(readFileSync(join(DIST, indice), "utf-8"));
  counts[kind] = items.length;
  for (const { h } of items) {
    if (!resolves(h)) problems.push(`${kind} page missing: ${h}`);
    // ans-feeds links every entry of the operator's feed to this shortcut
    const atalho = kind === "operator" && `/plano/${h.split("/")[2].slice(0, 6)}/`;
    if (atalho && !resolves(atalho)) problems.push(`operator shortcut missing: ${atalho}`);
  }
}

if (problems.length) {
  console.error(problems.slice(0, 50).join("\n"));
  console.error(`${problems.length} problem(s) in ${pages} pages`);
  process.exit(1);
}
console.log(`dist ok: ${pages} pages, ${counts.operator} operators, ${counts.medicine} medicines`);
