// The phrase check over the built pages (scripts/check-dist.mjs): the visible text only, and never the publisher's
// own names and values (elements marked data-dado), so the ANS's or the ANVISA's wording cannot block publishing.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carregarFrases, frasesNaPagina, textoVisivel } from "../scripts/texto-dist.mjs";

const FRASES = carregarFrases(readFileSync(new URL("../frases-proibidas.txt", import.meta.url), "utf-8"));

describe("banned phrases in the built pages", () => {
  it("reads the shared list, regexes included", () => {
    expect(FRASES.length).toBeGreaterThan(20);
    expect(FRASES.some((f) => f.phrase.startsWith("re:"))).toBe(true);
  });

  it("finds a phrase in our text, across tags and line breaks", () => {
    expect(frasesNaPagina("<p>Arquivos <strong>sem\n alteração</strong>.</p>", FRASES)).toHaveLength(1);
    expect(frasesNaPagina("<p>Saiba <a href='/x'>mais</a></p>", FRASES)[0]).toMatch(/^saiba mais/);
    expect(frasesNaPagina("<p>Atualizado hoje.</p>", FRASES)).toHaveLength(1);
  });

  it("skips the publisher's names and values marked data-dado, and nothing else", () => {
    const dado = '<li><a data-dado href="/x">ALTERAÇÃO DE ROTULAGEM SEM ALTERAÇÃO DE TEXTO</a> · ativa</li>';
    expect(frasesNaPagina(dado, FRASES)).toEqual([]);
    // nested elements inside the marked one are skipped too, and the text after it is read again
    expect(
      frasesNaPagina("<p><span data-dado>a <b>sem</b> <span>alteração</span></span> e hoje</p>", FRASES),
    ).toHaveLength(1);
    expect(frasesNaPagina('<p data-dados="x">sem alteração</p>', FRASES)).toHaveLength(1);
  });

  it("reads only what a reader sees", () => {
    const html =
      '<html><head><title>Hoje</title><script type="application/ld+json">{"a":"hoje"}</script></head>' +
      '<body><!-- hoje --><p title="hoje">a&nbsp;b &amp; c</p><style>.hoje{}</style><br/>d</body></html>';
    expect(textoVisivel(html).trim()).toBe("a b & c d");
    expect(frasesNaPagina(html, FRASES)).toEqual([]);
  });
});
