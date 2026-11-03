import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALIQUOTAS,
  anoDeVenda,
  dcbForBuild,
  indiceProdutosForBuild,
  outrasGrafias,
  paginaProduto,
  parseDcb,
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
    expect(() => parseProduto(com({ comercializacao_periodo: "2025/2026" }))).toThrow(/comercializacao_periodo/);
  });

  it("reads the contract version when anvisa-feeds publishes it, and fails on a version it does not know", () => {
    const indice = fixture("produtos.json") as Record<string, unknown>;
    // the fixtures predate the key: absent reads, and so does 1
    expect(parseIndiceProdutos({ ...indice, schema_version: 1 }).stamp).toBe("20261009");
    expect(() => parseIndiceProdutos({ ...indice, schema_version: 2 })).toThrow(/produtos.json: schema_version 2/);
    const todos = fixture("todos.json") as Record<string, unknown>;
    const idx = parseIndiceProdutos(indice);
    expect(parseTodos({ ...todos, schema_version: 1 }, idx)).toHaveLength(3);
    expect(() => parseTodos({ ...todos, schema_version: "1" }, idx)).toThrow(/todos.json: schema_version "1"/);
    const dcb = { fonte: { titulo: "Lista", licenca: { name: "CC", url: "https://x.test" } }, substancias: {} };
    expect(parseDcb({ ...dcb, schema_version: 1 })?.titulo).toBe("Lista");
    expect(() => parseDcb({ ...dcb, schema_version: 3 })).toThrow(/substancias.json: schema_version 3/);
  });

  it("reads the year the sales flags are about, and one year for a list only when the presentations agree", () => {
    const base = fixture("produto/170560103.json") as Record<string, unknown>;
    const apres = (base.apresentacoes as Record<string, unknown>[])[0]!;
    const cipro = parseProduto(base);
    expect(cipro.apresentacoes.map((a) => a.comercializacao_periodo)).toEqual(["2025", "2025"]);
    expect(anoDeVenda(cipro.apresentacoes)).toBe("2025");
    // data from before anvisa-feeds published the field
    const antes = { ...apres };
    delete antes.comercializacao_periodo;
    expect(parseProduto({ ...base, apresentacoes: [antes] }).apresentacoes[0]!.comercializacao_periodo).toBeNull();
    expect(anoDeVenda([{ comercializacao_periodo: null }])).toBeNull();
    expect(anoDeVenda([{ comercializacao_periodo: "2025" }, { comercializacao_periodo: "2026" }])).toBeNull();
    expect(anoDeVenda([{ comercializacao_periodo: "2025" }, { comercializacao_periodo: null }])).toBeNull();
    expect(anoDeVenda([])).toBeNull();
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
    const base = fixture("produtos.json") as Record<string, unknown>;
    const antigo = parseIndiceProdutos(base); // the fixtures predate the field
    expect([antigo.situacao_conferida, antigo.situacao_build]).toEqual([null, null]);
    const naoLida = parseIndiceProdutos({ ...base, situacao_fonte: null });
    expect([naoLida.situacao_conferida, naoLida.situacao_build]).toEqual([false, null]);
    const fonte = { build_id: "20261028T000851Z", built_at: "2026-10-28T00:08:51Z" };
    const lida = parseIndiceProdutos({ ...base, situacao_fonte: fonte });
    expect([lida.situacao_conferida, lida.situacao_build]).toEqual([true, "20261028T000851Z"]);
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

describe("official names", () => {
  const fonte = {
    build_id: "b",
    built_at: "2026-11-01T16:19:34Z",
    titulo: "Lista consolidada das DCB: versão IN Anvisa n° 473",
    licenca: { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  };
  const arquivo = { fonte, substancias: { LOSARTANA: ["losartana"], "A;B": ["a", "b"] } };

  it("reads the names with the list and the license to cite", () => {
    const dcb = parseDcb(arquivo)!;
    expect(dcb.titulo).toBe(fonte.titulo);
    expect(dcb.licenca).toEqual({ nome: "CC BY-NC-SA 4.0", url: fonte.licenca.url });
    expect(dcb.nomes.get("A;B")).toEqual(["a", "b"]);
  });

  it("is null when anvisa-feeds could not read them, and fails on a broken file", () => {
    expect(parseDcb({ fonte: null, substancias: {} })).toBeNull();
    expect(() => parseDcb({ fonte: { ...fonte, titulo: "" }, substancias: {} })).toThrow(/no titulo/);
    expect(() => parseDcb({ fonte, substancias: { X: [] } })).toThrow(/X: not a list of names/);
    expect(() => parseDcb({ fonte, substancias: { X: [null] } })).toThrow(/X: not a list of names/);
  });

  it("treats a file not published yet as no names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 404 }))),
    );
    await expect(dcbForBuild("https://x.test/ausente")).resolves.toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json(arquivo))),
    );
    await expect(dcbForBuild("https://x.test/presente")).resolves.toMatchObject({ titulo: fonte.titulo });
  });

  it("finds the other spellings of a substância by its official names", () => {
    const nomes = new Map([
      ["ÁCIDO", ["ácido"]],
      ["ACIDO", ["ácido"]],
      ["ÁCIDO;B", ["ácido", "b"]],
      ["SEM PAR", ["outro"]],
      ["FORA DA LISTA", ["ácido"]],
    ]);
    const grafias = outrasGrafias(nomes, ["ÁCIDO", "ACIDO", "ÁCIDO;B", "SEM PAR", "SEM NOME"]);
    expect([...grafias]).toEqual([
      ["ÁCIDO", ["ACIDO"]],
      ["ACIDO", ["ÁCIDO"]],
    ]);
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
