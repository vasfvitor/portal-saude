// The text a reader sees on a built page, checked against frases-proibidas.txt (the list the phrase test reads over
// src/; that test is byte-identical in three repos, so its parser is not shared and this is a small copy of it).
// Text inside an element marked `data-dado` (a name or value as the ANS or the ANVISA wrote it) is left out: the
// publisher's wording is not ours to fix, and it must never block publishing. The <head> (title, meta, JSON-LD) is
// left out too: it repeats names from the data, and its fixed text is covered by the phrase test.

/**
 * One phrase per line, "#" for comments, "re:" for a regular expression; a literal phrase matches with any run of
 * whitespace between its words, ignoring case (the rules of frases-proibidas.txt).
 * @param {string} list
 * @returns {{ phrase: string; re: RegExp }[]}
 */
export function carregarFrases(list) {
  return list
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => ({
      phrase: l,
      re: new RegExp(
        l.startsWith("re:")
          ? l.slice(3)
          : l
              .split(/\s+/)
              .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join("\\s+"),
        "giu",
      ),
    }));
}

const VAZIOS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "wbr"]);
const SEM_TEXTO = new Set(["head", "script", "style", "template", "svg"]);
const TAG = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const DADO = /\sdata-dado(?=[\s=/>]|$)/;
const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * The visible text of a page: every tag is a space, and the content of <head>, <script>, <style>, <template>, <svg>
 * and of any element with `data-dado` is dropped.
 * @param {string} html
 */
export function textoVisivel(html) {
  let out = "";
  let at = 0;
  /** the element being skipped and how deep its own tag name is nested */
  let pular = /** @type {{ nome: string; nivel: number } | null} */ (null);
  for (const m of html.matchAll(TAG)) {
    if (!pular) out += html.slice(at, m.index);
    at = m.index + m[0].length;
    const [, fecha, nomeTag, attrs = ""] = m;
    if (!nomeTag) continue; // a comment
    const nome = nomeTag.toLowerCase();
    const sozinho = VAZIOS.has(nome) || attrs.trimEnd().endsWith("/");
    if (pular) {
      if (nome === pular.nome && !sozinho) pular.nivel += fecha ? -1 : 1;
      if (pular.nivel === 0) pular = null;
      continue;
    }
    out += " ";
    if (!fecha && !sozinho && (SEM_TEXTO.has(nome) || DADO.test(attrs))) pular = { nome, nivel: 1 };
  }
  if (!pular) out += html.slice(at);
  return out
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (e, n) =>
      n[0] === "#"
        ? String.fromCodePoint(n[1].toLowerCase() === "x" ? parseInt(n.slice(2), 16) : Number(n.slice(1)))
        : (ENTIDADES[/** @type {keyof typeof ENTIDADES} */ (n.toLowerCase())] ?? e),
    )
    .replace(/\s+/g, " ");
}

/**
 * The phrases of the list found in a page's visible text, each with a little of the text around it.
 * @param {string} html
 * @param {{ phrase: string; re: RegExp }[]} frases
 */
export function frasesNaPagina(html, frases) {
  const texto = textoVisivel(html);
  return frases.flatMap(({ phrase, re }) =>
    [...texto.matchAll(re)].map(
      (m) => `${phrase} ("${texto.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).trim()}")`,
    ),
  );
}
