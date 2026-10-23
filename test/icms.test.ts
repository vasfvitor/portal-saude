import { describe, expect, it } from "vitest";
import {
  aliquotaDoEstado,
  aliquotaReferencia,
  colunas,
  ESTADOS,
  ufsPorAliquota,
  type EstadoIcms,
} from "../src/lib/icms";
import { ALIQUOTAS } from "../src/lib/remedios";

const e = (uf: string, aliquota: EstadoIcms["aliquota"]): EstadoIcms => ({
  uf,
  nome: uf,
  aliquota,
  fonte: "https://exemplo.gov.br/lei",
  confirmado: true,
  conferido_em: "2026-10-23",
});

describe("ICMS table helpers", () => {
  it("groups states by rate and picks the columns", () => {
    const estados = [e("SP", "18"), e("MG", "18"), e("RJ", "22"), e("PR", "19.5")];
    expect(ufsPorAliquota(estados).get("18")).toEqual(["MG", "SP"]);
    expect(colunas(estados)).toEqual(["18", "19.5", "22"]);
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
      expect(x.fonte).toMatch(/^https?:\/\//);
      expect(x.conferido_em).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("findings that differ from secondary tables stay in the data", () => {
    const por = new Map(ESTADOS.map((x) => [x.uf, x]));
    expect(por.get("DF")?.aliquota).toBe("17");
    expect(por.get("SE")?.aliquota).toBe("19");
    expect(por.get("AL")?.aliquota).toBe("20.5");
    expect(aliquotaDoEstado(por.get("SP")!, true)).toBe("12");
    expect(aliquotaDoEstado(por.get("SP")!, false)).toBe("18");
    expect(
      ESTADOS.filter((x) => !x.confirmado)
        .map((x) => x.uf)
        .sort(),
    ).toEqual(["PI", "RN", "RR"]);
  });

  it("generic products move SP and MG to the 12% column; doubtful states get a star", () => {
    expect(ufsPorAliquota(ESTADOS, true).get("12")).toEqual(["MG", "SP"]);
    expect(ufsPorAliquota(ESTADOS, false).get("12")).toBeUndefined();
    expect(ufsPorAliquota(ESTADOS).get("20")).toEqual(["AM", "CE", "PB", "RN*", "RR*", "TO"]);
    expect(colunas()).toEqual(["12", "17", "18", "19", "19.5", "20", "20.5", "22", "22.5", "23"]);
  });
});
