// The phrases in frases-proibidas.txt (shared by the five health repos) never appear in the source text of the
// site: strings and template text of src/**/*.{astro,vue,ts,mjs}. Comments are blanked first (keeping line
// numbers), since a comment may legitimately quote a banned phrase.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = new URL("..", import.meta.url).pathname;
const EXTENSOES = /\.(astro|vue|ts|mjs)$/;

interface Frase {
  texto: string;
  re: RegExp;
}

function lerFrases(texto: string): Frase[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) =>
      l.startsWith("re:")
        ? { texto: l, re: new RegExp(l.slice(3), "iu") }
        : { texto: l, re: new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu") },
    );
}

/** Block comments and HTML comments become blank space (newlines kept); `//` to the end of the line goes too,
 * unless it is the `//` of a URL (`://`). */
function semComentarios(fonte: string): string {
  const branco = (m: string) => m.replace(/[^\n]/g, " ");
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, branco)
    .replace(/<!--[\s\S]*?-->/g, branco)
    .replace(/(?<!:)\/\/.*$/gm, branco);
}

function achar(arquivo: string, fonte: string, frases: Frase[]): string[] {
  return semComentarios(fonte)
    .split("\n")
    .flatMap((linha, i) => frases.filter((f) => f.re.test(linha)).map((f) => `${arquivo}:${i + 1}: ${f.texto}`));
}

describe("banned phrases", () => {
  const frases = lerFrases(readFileSync(join(RAIZ, "frases-proibidas.txt"), "utf-8"));

  it("reads the list, regexes included", () => {
    expect(frases.length).toBeGreaterThan(10);
    expect(frases.some((f) => f.re.test("Sem cadastro, sem anúncio"))).toBe(true);
    expect(frases.some((f) => f.re.test("SAIBA MAIS"))).toBe(true);
    expect(frases.some((f) => f.re.test("sem venda em 2025"))).toBe(false);
  });

  it("matches strings and template text, never comments", () => {
    const fonte = [
      'const a = "Saiba mais";',
      "// saiba mais",
      "/* sem cadastro, sem anúncio */",
      "<!-- clique aqui -->",
      'const u = "https://x.test/"; const b = "só fatos";',
    ].join("\n");
    expect(achar("x.ts", fonte, frases)).toEqual(["x.ts:1: saiba mais", "x.ts:5: só fatos"]);
  });

  it("are not in the site's source", () => {
    const arquivos = readdirSync(join(RAIZ, "src"), { recursive: true, encoding: "utf-8" })
      .filter((f) => EXTENSOES.test(f))
      .map((f) => join(RAIZ, "src", f));
    expect(arquivos.length).toBeGreaterThan(10);
    const achados = arquivos.flatMap((f) => achar(relative(RAIZ, f), readFileSync(f, "utf-8"), frases));
    expect(achados, achados.join("\n")).toEqual([]);
  });
});
