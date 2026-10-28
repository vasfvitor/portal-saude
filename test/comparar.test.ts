import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerApresentacao } from "../src/lib/apresentacao";
import { maisBarato, porChave, precoNoRegime, quantoMenos } from "../src/lib/comparar";
import { aliquotaPorUf } from "../src/lib/icms";
import { parseProduto, pmcAplicavel, type Produto } from "../src/lib/remedios";

const produto = (r: string): Produto =>
  parseProduto(JSON.parse(readFileSync(new URL(`./fixtures/cmed/produto/${r}.json`, import.meta.url), "utf-8")));

describe("same dose and package across brands", () => {
  const cipro = produto("170560103");
  const eurofarma = produto("100431185");
  const aurobindo = produto("151670007");

  it("groups by key, cheapest first, only what was sold in the last year", () => {
    const grupos = porChave([cipro, eurofarma, aurobindo], "p");
    const todos = [...grupos.values()].flat();
    expect(todos.every((o) => o.apresentacao.comercializado)).toBe(true);
    expect(todos.some((o) => o.produto.registro_produto === "151670007")).toBe(false);
    for (const lista of grupos.values()) {
      expect(lista.map((o) => o.preco)).toEqual([...lista.map((o) => o.preco)].sort((a, b) => a - b));
    }
  });

  it("the cheaper option is another product, below the price given", () => {
    const lida = lerApresentacao(cipro.apresentacoes[0]!.apresentacao)!;
    const op = (registro: string, preco: number) => ({
      produto: { ...cipro, registro_produto: registro },
      apresentacao: cipro.apresentacoes[0]!,
      lida,
      preco,
    });
    const lista = [op("1", 3784), op("2", 5930), op("170560103", 50158)];
    expect(maisBarato(lista, "170560103", 50158)?.preco).toBe(3784);
    expect(maisBarato(lista, "1", 3784)).toBeUndefined();
    expect(maisBarato(undefined, "1", 10)).toBeUndefined();
    expect(quantoMenos(50158, 3784)).toBe(92);
    expect(quantoMenos(1000, 999)).toBe(0);
  });

  it("never compares two different substâncias with the same dose and package", () => {
    const outro = { ...eurofarma, registro_produto: "999999999", substancia: "AMOXICILINA" };
    const grupos = porChave([eurofarma, outro], "p");
    for (const lista of grupos.values()) {
      expect(new Set(lista.map((o) => o.produto.substancia)).size).toBe(1);
    }
  });

  it("each regime ranks at the rates its products pay: generics at 12% where generics pay less", () => {
    const a = eurofarma.apresentacoes[0]!;
    expect(precoNoRegime(eurofarma, a, "g")).toBe(a.pmc["12"]);
    expect(precoNoRegime(cipro, cipro.apresentacoes[0]!, "g")).toBe(cipro.apresentacoes[0]!.pmc["18"]);
    expect(precoNoRegime(eurofarma, a, "p")).toBe(a.pmc["17"]);
  });

  it("a presentation exempt from ICMS costs its 0% price in every regime and every state", () => {
    const a = { ...cipro.apresentacoes[0]!, icms_0: true };
    expect(a.pmc["0"]).toBeDefined();
    for (const regime of ["p", "g"] as const) expect(precoNoRegime(cipro, a, regime)).toBe(a.pmc["0"]);
    const aplicavel = pmcAplicavel(a);
    expect(new Set(Object.values(aplicavel))).toEqual(new Set([a.pmc["0"]]));
    expect(Object.keys(aplicavel)).toEqual(Object.keys(a.pmc));
    expect(pmcAplicavel(cipro.apresentacoes[0]!)).toBe(cipro.apresentacoes[0]!.pmc); // not exempt: unchanged
  });

  it("a flag the upstream has not published yet reads as null", () => {
    // the fixtures predate restricao_hospitalar
    expect(cipro.apresentacoes[0]!.restricao_hospitalar).toBeNull();
  });

  it("generics pay 12% in SP and MG, everything else the state's default", () => {
    expect(aliquotaPorUf(true).SP).toBe("12");
    expect(aliquotaPorUf(false).SP).toBe("18");
    expect(aliquotaPorUf(true).RJ).toBe("22");
    expect(Object.keys(aliquotaPorUf(false))).toHaveLength(27);
  });
});
