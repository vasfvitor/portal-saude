import { describe, expect, it } from "vitest";
import {
  contar,
  fmtStamp,
  fmtClientes,
  fmtDate,
  fmtDec,
  fmtMes,
  fmtPct,
  fmtPessoas,
  fmtReais,
  fmtTrimestre,
  fmtTrimestreCurto,
} from "../src/lib/format";
import { nomeExibido } from "../src/lib/operadoras";

describe("format", () => {
  it("people and beneficiaries, with pt-BR agreement", () => {
    expect(fmtPessoas(3391379)).toBe("3,4 milhões");
    expect(fmtPessoas(1200000)).toBe("1,2 milhão");
    expect(fmtPessoas(98203)).toBe("98 mil");
    expect(fmtPessoas(524)).toBe("524");
    expect(fmtClientes(3391379)).toBe("3,4 milhões de clientes");
    expect(fmtClientes(98203)).toBe("98 mil clientes");
    expect(fmtClientes(1)).toBe("1 cliente");
    expect(fmtMes("2026-09")).toBe("setembro de 2026");
    expect(contar(1, "produto", "produtos")).toBe("1 produto");
    expect(contar(1340, "operadora", "operadoras")).toBe("1.340 operadoras");
    expect(fmtStamp("20261009")).toBe("09/10/2026");
    expect(fmtTrimestre("3T2026")).toBe("de julho a setembro de 2026");
    expect(fmtTrimestre("1T2025")).toBe("de janeiro a março de 2025");
    expect(fmtTrimestreCurto("4T2024")).toBe("out-dez/24");
    expect(fmtTrimestreCurto("x")).toBe("x");
  });

  it("percent never rounds a shortfall up to 100%", () => {
    expect(fmtPct(91.31)).toBe("91%");
    expect(fmtPct(99.6)).toBe("99%");
    expect(fmtPct(100)).toBe("100%");
    expect(fmtPct(0)).toBe("0%");
  });

  it("money, decimals and dates", () => {
    expect(fmtReais(456053738.7)).toBe("R$ 456 milhões");
    expect(fmtReais(1.2e6)).toBe("R$ 1 milhão");
    expect(fmtReais(690728.47)).toBe("R$ 691 mil");
    expect(fmtReais(1.5e9)).toBe("R$ 1,5 bilhão");
    expect(fmtReais(2.5e9)).toBe("R$ 2,5 bilhões");
    expect(fmtDec(0.8112)).toBe("0,81");
    expect(fmtDate("2026-10-08")).toBe("08/10/2026");
  });
});

describe("display name", () => {
  it("drops a trade name that is only the legal name without accents", () => {
    expect(nomeExibido({ nome: "BRADESCO SAÚDE S.A.", fantasia: "BRADESCO SAUDE S.A." })).toBe("BRADESCO SAÚDE S.A.");
    expect(nomeExibido({ nome: "SAUDIA ASSISTENCIA MÉDICA LTDA", fantasia: "POP VITA" })).toBe("POP VITA");
    expect(nomeExibido({ nome: "X LTDA", fantasia: null })).toBe("X LTDA");
  });
});
