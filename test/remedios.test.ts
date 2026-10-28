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
    expect(() => parseProduto({ ...base, stamp: "2026-10" })).toThrow(/bad stamp 2026-10/);
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
    expect(() => parseTodos({ ...todos, stamp: "20261109" }, indice)).toThrow(/stamp 20261109.*20261009/);
    expect(() => parseTodos({ ...todos, publicado_em: "x" }, indice)).toThrow(/publicado_em x/);
    expect(() => parseTodos({ ...todos, produtos: todos.produtos.slice(1) }, indice)).toThrow(/2 products.*3/);
    expect(() => parseTodos({ ...todos, produtos: [...todos.produtos].reverse() }, indice)).toThrow(
      /todos.json\[0\] \(170560103\): registro_produto/,
    );
  });

  it("situacao_fonte: absent says nothing, null means not checked this time, an object means checked", () => {
    const indice = parseIndiceProdutos(fixture("produtos.json"));
    const todos = fixture("todos.json") as Record<string, unknown>;
    expect(indice.situacao_build).toBeNull(); // the fixtures predate the field
    expect(parseTodos(todos, indice).every((p) => p.situacaoConferida === null)).toBe(true);
    expect(parseTodos({ ...todos, situacao_fonte: null }, indice).every((p) => p.situacaoConferida === false)).toBe(
      true,
    );
    const fonte = { build_id: "20261028T000851Z", built_at: "2026-10-28T00:08:51Z" };
    expect(parseTodos({ ...todos, situacao_fonte: fonte }, indice).every((p) => p.situacaoConferida)).toBe(true);
    const comFonte = { ...(fixture("produtos.json") as Record<string, unknown>), situacao_fonte: fonte };
    expect(parseIndiceProdutos(comFonte).situacao_build).toBe("20261028T000851Z");
  });

  it("todos.json: each product must carry the list of the file and the index fields", () => {
    const indice = parseIndiceProdutos(fixture("produtos.json"));
    const todos = fixture("todos.json") as { produtos: Record<string, unknown>[] };
    const com = (i: number, mudanca: Record<string, unknown>): unknown => ({
      ...todos,
      produtos: todos.produtos.map((p, j) => (j === i ? { ...p, ...mudanca } : p)),
    });
    expect(() => parseTodos(com(2, { stamp: "20260909" }), indice)).toThrow(/\[2\] \(170560103\): stamp 20260909/);
    expect(() => parseTodos(com(1, { publicado_em: "y" }), indice)).toThrow(/\[1\].*publicado_em y/);
    expect(() => parseTodos(com(2, { produto: "CIPRO XR" }), indice)).toThrow(/produto CIPRO XR, but.*CIPRO$/);
    expect(() => parseTodos(com(0, { substancia: "OUTRA" }), indice)).toThrow(/substancia OUTRA/);
    const [primeira] = todos.produtos[2]!.apresentacoes as unknown[];
    expect(() => parseTodos(com(2, { apresentacoes: [primeira] }), indice)).toThrow(/1 apresentacoes/);
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
