import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getJson,
  indiceForBuild,
  operadorasForBuild,
  paginaOperadora,
  parseIndice,
  parseMeta,
  parseOperadora,
  pool,
  slug,
} from "../src/lib/operadoras";

const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${path}`, import.meta.url), "utf-8")) as unknown;

afterEach(() => vi.unstubAllGlobals());

describe("parsers", () => {
  it("read the real index and the three operators", () => {
    const indice = parseIndice(fixture("dados/operadoras.json"));
    expect(indice.map((o) => o.registro).sort()).toEqual(["005711", "333689", "422134"]);
    const bradesco = parseOperadora(fixture("dados/operadora/005711.json"));
    expect(bradesco.situacao).toBe("ativa");
    expect(bradesco.reclamacoes[0]?.serie).toHaveLength(8);
    expect(bradesco.idss?.valor).toBeCloseTo(0.8112);
    const univida = parseOperadora(fixture("dados/operadora/422134.json"));
    expect(univida.cancelamento?.motivo).toBe("Liquidação Extrajudicial");
    expect(univida.portabilidade_vigente.length).toBeGreaterThan(0);
    expect(univida.idss?.valor).toBeNull();
    expect(univida.idss?.motivo).toBeTruthy();
    const mediservice = parseOperadora(fixture("dados/operadora/333689.json"));
    expect(mediservice.reclamacoes.map((r) => r.cobertura).sort()).toEqual(["médico-hospitalar", "odontológica"]);
  });

  it("fail loudly on a broken contract", () => {
    const base = fixture("dados/operadora/005711.json") as Record<string, unknown>;
    expect(() => parseOperadora({ ...base, registro: "5711" })).toThrow(/registro/);
    expect(() => parseOperadora({ ...base, situacao: "suspensa" })).toThrow(/situacao/);
    expect(() => parseOperadora({ ...base, situacao: "cancelada", cancelamento: null })).toThrow(/cancelamento/);
    expect(() => parseOperadora({ ...base, reclamacoes: "x" })).toThrow(/reclamacoes/);
    expect(() => parseIndice([])).toThrow(/empty/);
    expect(parseMeta(fixture("meta.json")).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(() => parseMeta({ date: "23/10/2026" })).toThrow(/date/);
  });
});

describe("fetching", () => {
  it("retries a 5xx, then succeeds, and busts the Pages cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("https://x.test/a.json")).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.searchParams.has("t")).toBe(true);
  });

  it("does not retry a 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("https://x.test/a.json")).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retries on transport errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("https://x.test/a.json")).rejects.toThrow(/fetch failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("pool keeps the order and the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await pool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5 * (8 - n)));
      inFlight--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBe(3);
  });

  it("loads every operator listed in the index, once per build", async () => {
    const fetchMock = vi.fn((u: URL) => {
      const path = u.pathname.replace(/^\/dados\//, "dados/");
      return Promise.resolve(Response.json(fixture(path)));
    });
    vi.stubGlobal("fetch", fetchMock);
    const dados = "https://fixtures.test/dados";
    const ops = await operadorasForBuild(dados);
    expect(ops.map((o) => o.registro)).toEqual((await indiceForBuild(dados)).map((o) => o.registro));
    await operadorasForBuild(dados);
    expect(fetchMock).toHaveBeenCalledTimes(1 + ops.length);
  });
});

describe("URLs", () => {
  it("slug and operator page", () => {
    expect(slug("BRADESCO SAÚDE S.A.")).toBe("bradesco-saude-s-a");
    expect(slug("  -- Ação & Cia --  ")).toBe("acao-cia");
    expect(slug("x".repeat(80))).toHaveLength(60);
    expect(paginaOperadora({ registro: "005711", nome: "BRADESCO SAÚDE S.A." })).toBe(
      "/plano/005711-bradesco-saude-s-a/",
    );
  });
});
