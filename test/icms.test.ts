import { describe, expect, it } from "vitest";
import { aliquotaReferencia, colunas, ESTADOS, ufsPorAliquota, type EstadoIcms } from "../src/lib/icms";
import { ALIQUOTAS } from "../src/lib/remedios";

const e = (uf: string, aliquota: EstadoIcms["aliquota"]): EstadoIcms => ({
  uf,
  nome: uf,
  aliquota,
  fonte: "https://exemplo.gov.br/lei",
  conferido_em: "2026-10-23",
});

describe("ICMS table helpers", () => {
  it("groups states by rate and picks the columns", () => {
    const estados = [e("SP", "18"), e("MG", "18"), e("RJ", "22"), e("PR", "19.5")];
    expect(ufsPorAliquota(estados).get("18")).toEqual(["MG", "SP"]);
    expect(colunas(estados)).toEqual(["12", "18", "19.5", "22"]);
    expect(aliquotaReferencia(estados)).toEqual({ aliquota: "18", deEstados: true });
  });

  it("with no table: every rate but 0%, and 18% as an unattributed reference", () => {
    expect(colunas([])).toEqual(ALIQUOTAS.filter((a) => a !== "0"));
    expect(aliquotaReferencia([])).toEqual({ aliquota: "18", deEstados: false });
  });

  it("the curated table, when filled, has every state once, a CMED rate and a source", () => {
    if (ESTADOS.length === 0) return;
    expect(new Set(ESTADOS.map((x) => x.uf)).size).toBe(27);
    for (const x of ESTADOS) {
      expect(ALIQUOTAS).toContain(x.aliquota);
      expect(x.fonte).toMatch(/^https:\/\//);
      expect(x.conferido_em).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
