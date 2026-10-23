import { describe, expect, it } from "vitest";
import { fmtBeneficiarios, fmtDate, fmtDec, fmtPct, fmtPessoas, fmtReais } from "../src/lib/format";
import { nomeExibido } from "../src/lib/operadoras";

describe("format", () => {
  it("people and beneficiaries, with pt-BR agreement", () => {
    expect(fmtPessoas(3391379)).toBe("3,4 milhões");
    expect(fmtPessoas(1200000)).toBe("1,2 milhão");
    expect(fmtPessoas(98203)).toBe("98 mil");
    expect(fmtPessoas(524)).toBe("524");
    expect(fmtBeneficiarios(3391379)).toBe("3,4 milhões de beneficiários");
    expect(fmtBeneficiarios(98203)).toBe("98 mil beneficiários");
    expect(fmtBeneficiarios(1)).toBe("1 beneficiário");
  });

  it("percent never rounds a shortfall up to 100%", () => {
    expect(fmtPct(91.31)).toBe("91%");
    expect(fmtPct(99.6)).toBe("99%");
    expect(fmtPct(100)).toBe("100%");
    expect(fmtPct(0)).toBe("0%");
  });

  it("money, decimals and dates", () => {
    expect(fmtReais(456053738.7)).toBe("R$ 456 mi");
    expect(fmtReais(690728.47)).toBe("R$ 691 mil");
    expect(fmtReais(1.5e9)).toBe("R$ 1,5 bi");
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
