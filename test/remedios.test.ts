import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALIQUOTAS,
  indiceProdutosForBuild,
  paginaProduto,
  parseIndiceProdutos,
  parseProduto,
  parseTodos,
  produtosForBuild,
  slugsSubstancias,
} from "../src/lib/remedios";

const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/cmed/${path}`, import.meta.url), "utf-8")) as unknown;

afterEach(() => vi.unstubAllGlobals());

describe("parsers", () => {
  it("read the real index and the three products", () => {
    const idx = parseIndiceProdutos(fixture("produtos.json"));
    expect(idx.stamp).toBe("20261009");
    expect(idx.produtos.map((p) => p.registro_produto).sort()).toEqual(["100431185", "151670007", "170560103"]);
    const cipro = parseProduto(fixture("produto/170560103.json"));
    expect(cipro.produto).toBe("CIPRO");
    expect(cipro.tipo_produto).toBe("Novo");
    expect(cipro.comercializado).toBe(true);
    expect(cipro.apresentacoes[0]?.pmc["18"]).toBe(50770);
    expect(cipro.apresentacoes[0]?.pmc["17.5"]).toBe(50463);
    expect(cipro.apresentacoes[0]?.pmc_alc["0"]).toBeUndefined();
    expect(parseProduto(fixture("produto/151670007.json")).comercializado).toBe(false);
  });

  it("every rate key in the data is a CMED rate", () => {
    for (const r of ["170560103", "100431185", "151670007"]) {
      for (const a of parseProduto(fixture(`produto/${r}.json`)).apresentacoes) {
        for (const k of Object.keys(a.pmc)) expect(ALIQUOTAS).toContain(k);
      }
    }
  });

  it("fail loudly on a broken contract", () => {
    const base = fixture("produto/170560103.json") as Record<string, unknown>;
    const apres = (base.apresentacoes as Record<string, unknown>[])[0]!;
    const com = (a: Record<string, unknown>) => ({ ...base, apresentacoes: [{ ...apres, ...a }] });
    expect(() => parseProduto({ ...base, registro_produto: "1705601" })).toThrow(/registro_produto/);
    expect(() => parseProduto(com({ pmc: { "18.25": 100 } }))).toThrow(/unknown rate/);
    expect(() => parseProduto(com({ pmc: { "18": 0 } }))).toThrow(/bad price/);
    expect(() => parseProduto(com({ pmc: { "18": 12.5 } }))).toThrow(/bad price/);
    expect(() => parseProduto(com({ pmc: {} }))).toThrow(/without PMC/);
    expect(() => parseProduto(com({ ggrem: "123" }))).toThrow(/ggrem/);
    expect(() => parseProduto({ ...base, apresentacoes: [] })).toThrow(/no apresentacoes/);
    expect(() => parseIndiceProdutos({ stamp: "2026-10", publicado_em: "x", produtos: [] })).toThrow(/stamp/);
  });
});

describe("fetching", () => {
  it("loads every product listed in the index, once per build", async () => {
    const fetchMock = vi.fn((u: URL) =>
      Promise.resolve(Response.json(fixture(u.pathname.replace(/^\/cmed\/dados\//, "")))),
    );
    vi.stubGlobal("fetch", fetchMock);
    const url = "https://fixtures.test/cmed/dados";
    const produtos = await produtosForBuild(url);
    expect(produtos.map((p) => p.registro_produto)).toEqual(
      (await indiceProdutosForBuild(url)).produtos.map((p) => p.registro_produto),
    );
    await produtosForBuild(url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("todos.json holds the product files, and must match the index", () => {
    const indice = parseIndiceProdutos(fixture("produtos.json"));
    const todos = fixture("todos.json") as { stamp: string; produtos: unknown[] };
    expect(parseTodos(todos, indice)).toEqual(
      indice.produtos.map((p) => parseProduto(fixture(`produto/${p.registro_produto}.json`))),
    );
    expect(() => parseTodos({ ...todos, stamp: "20261109" }, indice)).toThrow(/20261109.*20261009/);
    expect(() => parseTodos({ ...todos, produtos: todos.produtos.slice(1) }, indice)).toThrow(/differ/);
  });
});

describe("URLs", () => {
  it("product page and unique substância slugs", () => {
    expect(paginaProduto({ registro_produto: "170560103", produto: "CIPRO" })).toBe("/remedios/170560103-cipro/");
    const longo = "A".repeat(70);
    const slugs = slugsSubstancias([`${longo} X`, `${longo} Y`, "DIPIRONA MONOIDRATADA", "DIPIRONA MONOIDRATADA"]);
    expect(slugs.get("DIPIRONA MONOIDRATADA")).toBe("dipirona-monoidratada");
    expect(slugs.get(`${longo} X`)).toBe("a".repeat(60));
    expect(slugs.get(`${longo} Y`)).toBe(`${"a".repeat(60)}-2`);
  });
});
