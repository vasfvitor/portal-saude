import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { backoff, getJson } from "../src/lib/fetch";
import {
  atalhoOperadora,
  indiceForBuild,
  operadorasForBuild,
  paginaOperadora,
  parseIndice,
  parseMeta,
  parseOperadora,
  parseTodas,
} from "../src/lib/operadoras";
import { slug } from "../src/lib/slug";

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
    expect(() => parseOperadora({ ...base, feed: "http://x.test/a.xml" })).toThrow(/feed/);
    expect(() => parseOperadora({ ...base, feed: "https://x.test/a.json" })).toThrow(/feed/);
    expect(parseMeta(fixture("meta.json")).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(() => parseMeta({ date: "23/10/2026" })).toThrow(/date/);
    expect(parseMeta({ date: "2026-10-28" }).falhas).toEqual([]); // before ans-feeds published the list
    const falha = { dia: "2026-10-29", fonte: "pda-023-igr.csv", motivo: "1354 bytes contra 6756" };
    expect(parseMeta({ date: "2026-10-28", falhas: [falha] }).falhas).toEqual([falha]);
  });
});

describe("feed", () => {
  it("is optional, so the page only offers it once ans-feeds publishes it", () => {
    const base = fixture("dados/operadora/005711.json") as Record<string, unknown>;
    expect(parseOperadora({ ...base, feed: undefined }).feed).toBeNull();
    const url = "https://ans.feeds.abelhaninja.de/operadora/005711.xml";
    expect(parseOperadora({ ...base, feed: url }).feed).toBe(url);
  });

  it("reads the RN 623 target and the client month as optional fields", () => {
    const base = fixture("dados/operadora/005711.json") as Record<string, unknown>;
    const antigo = parseOperadora({ ...base, meta_rn623: undefined, beneficiarios_em: undefined });
    expect(antigo.meta_rn623).toBeNull();
    expect(antigo.beneficiarios_em).toBeNull();
    const meta = {
      trimestre: "3T2026",
      atingiu: false,
      meta: { "médico-hospitalar": 2.4 },
      ate_reclamacoes: { "médico-hospitalar": 3 },
      listas: [],
    };
    const novo = parseOperadora({ ...base, meta_rn623: meta, beneficiarios_em: "2026-09" });
    expect(novo.meta_rn623?.meta["médico-hospitalar"]).toBe(2.4);
    expect(novo.beneficiarios_em).toBe("2026-09");
    expect(antigo.beneficiarios_ano_antes).toBeNull();
    expect(parseOperadora({ ...base, beneficiarios_ano_antes: 3146777 }).beneficiarios_ano_antes).toBe(3146777);
    expect(() => parseOperadora({ ...base, meta_rn623: { ...meta, atingiu: "não" } })).toThrow(/atingiu/);
  });

  it("entries link to a shortcut that does not depend on the slug", () => {
    expect(atalhoOperadora("005711")).toBe("/plano/005711/");
  });
});

describe("fetching", () => {
  it("retries a 5xx, then succeeds, and busts the Pages cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const p = getJson("https://x.test/a.json");
    await vi.runAllTimersAsync();
    await expect(p).resolves.toEqual({ ok: 1 });
    vi.useRealTimers();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.searchParams.has("t")).toBe(true);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it("does not retry a 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("https://x.test/a.json")).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retries on transport errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    const p = expect(getJson("https://x.test/a.json")).rejects.toThrow(/fetch failed/);
    await vi.runAllTimersAsync();
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(6);
    vi.useRealTimers();
  });

  it("waits and retries a 429, honouring Retry-After", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "7" } }))
      .mockResolvedValueOnce(Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const p = getJson("https://x.test/a.json");
    await vi.advanceTimersByTimeAsync(6_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("backoff doubles from 1 s, takes Retry-After when valid, and is capped", () => {
    expect([0, 1, 2, 3, 4].map((a) => backoff(a))).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(backoff(0, "3")).toBe(3000);
    expect(backoff(2, "Wed, 21 Oct 2026 07:28:00 GMT")).toBe(4000);
    expect(backoff(0, "600")).toBe(60_000);
    expect(backoff(9)).toBe(60_000);
  });

  it("loads every operator listed in the index, once per build", async () => {
    const fetchMock = vi.fn((u: URL) => Promise.resolve(Response.json(fixture(u.pathname.slice(1)))));
    vi.stubGlobal("fetch", fetchMock);
    const dados = "https://fixtures.test/dados";
    const ops = await operadorasForBuild(dados, "https://fixtures.test/meta.json");
    expect(ops.map((o) => o.registro)).toEqual((await indiceForBuild(dados)).map((o) => o.registro));
    await operadorasForBuild(dados, "https://fixtures.test/meta.json");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("todas.json holds the operator files, and must match the index and meta.json", () => {
    const indice = parseIndice(fixture("dados/operadoras.json"));
    const meta = parseMeta(fixture("meta.json"));
    const todas = fixture("dados/todas.json") as { date: string; operadoras: Record<string, unknown>[] };
    expect(parseTodas(todas, indice, meta)).toEqual(
      indice.map((o) => parseOperadora(fixture(`dados/operadora/${o.registro}.json`))),
    );
    expect(() => parseTodas({ ...todas, date: "2026-10-22" }, indice, meta)).toThrow(/date 2026-10-22.*2026-10-23/);
    expect(() => parseTodas({ ...todas, operadoras: todas.operadoras.slice(1) }, indice, meta)).toThrow(
      /2 operators.*3/,
    );
    const r0 = indice[0]!.registro;
    const r2 = indice[2]!.registro;
    expect(() => parseTodas({ ...todas, operadoras: [...todas.operadoras].reverse() }, indice, meta)).toThrow(
      new RegExp(`todas.json\\[0\\] \\(${r2}\\): registro ${r2}, but operadoras.json has ${r0}`),
    );
    const com = (i: number, mudanca: Record<string, unknown>): unknown => ({
      ...todas,
      operadoras: todas.operadoras.map((o, j) => (j === i ? { ...o, ...mudanca } : o)),
    });
    expect(() => parseTodas(com(1, { nome: "OUTRA" }), indice, meta)).toThrow(/\[1\].*nome OUTRA/);
    expect(() => parseTodas(com(2, { beneficiarios: 1 }), indice, meta)).toThrow(/\[2\].*beneficiarios 1/);
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
