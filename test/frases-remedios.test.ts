import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fmtMoney } from "../src/lib/format";
import {
  embalagemInstitucional,
  precoPorUnidade,
  acompanharSubstancia,
  aliquotaRotulo,
  avisoComercializacao,
  avisoProduto,
  classeSemCodigo,
  fraseMedida,
  fraseRegistro,
  precoMaximo,
  precosPorAliquota,
  tarjaExplicada,
  tipoExplicado,
} from "../src/lib/frases-remedios";
import { parseProduto } from "../src/lib/remedios";

const produto = (r: string) =>
  parseProduto(
    JSON.parse(readFileSync(new URL(`./fixtures/cmed/produto/${r}.json`, import.meta.url), "utf-8")) as unknown,
  );

describe("remedios sentences", () => {
  it("money and rate labels", () => {
    expect(fmtMoney(50770)).toBe("R$ 507,70");
    expect(fmtMoney(341576938)).toBe("R$ 3.415.769,38");
    expect(fmtMoney(5)).toBe("R$ 0,05");
    expect(aliquotaRotulo("17.5")).toBe("17,5%");
    expect(aliquotaRotulo("18")).toBe("18%");
  });

  it("prices of the real Cipro, always with the rate", () => {
    const a = produto("170560103").apresentacoes[0]!;
    expect(precoMaximo(a.pmc, "18")).toBe("R$ 507,70");
    expect(JSON.parse(precosPorAliquota(a.pmc))).toMatchObject({ "18": "R$ 507,70" });
    expect(JSON.parse(precosPorAliquota(a.pmc))).not.toHaveProperty("0");
  });

  it("type, stripe and commercialization in plain words", () => {
    expect(tipoExplicado("Genérico")).toMatch(/^Genérico: mesma substância/);
    expect(tipoExplicado("Radiofármaco")).toBeNull();
    expect(tipoExplicado(null)).toBeNull();
    expect(tarjaExplicada("Tarja Vermelha sob restrição")).toContain("retida");
    expect(tarjaExplicada("- (*)")).toBeNull();
    expect(avisoComercializacao(true)).toBeNull();
    expect(classeSemCodigo("J1G1 - FLUORQUINOLONAS ORAIS")).toBe("FLUORQUINOLONAS ORAIS");
    expect(classeSemCodigo("ANALGÉSICOS")).toBe("ANALGÉSICOS");
    expect(avisoComercializacao(produto("151670007").comercializado)).toMatch(/em falta ou fora das farmácias/);
  });
});

describe("acompanhar", () => {
  it("names the substância the feed covers", () => {
    expect(acompanharSubstancia("CLORIDRATO DE CIPROFLOXACINO")).toContain(
      "algum remédio com CLORIDRATO DE CIPROFLOXACINO",
    );
  });
});

describe("registration and ANVISA measures", () => {
  it("says the registration as the data gives it, and nothing when it does not", () => {
    expect(fraseRegistro("116180267", { ativo: true, vencimento: "2028-06" })).toBe(
      "Registro na ANVISA: 116180267, ativo, válido até junho de 2028",
    );
    expect(fraseRegistro("103110182", { ativo: false, vencimento: "2021-01" })).toBe(
      "Registro na ANVISA: 103110182, inativo",
    );
    expect(fraseRegistro("1", null)).toBe("Registro na ANVISA: 1");
  });

  it("words a measure plainly, and a voluntary recall as the company's own", () => {
    // LIZBI, 06/10/2026, in the anvisa-api medidas table
    expect(
      fraseMedida({
        data: "2026-10-06",
        acoes: ["Recolhimento", "Suspensão"],
        atividades: ["Comercialização", "Distribuição", "Uso", "Voluntário"],
        processo: "25351104206202604",
      }),
    ).toBe("06/10/2026: recolhimento e suspensão de comercialização, distribuição e uso, a pedido da própria empresa.");
    expect(fraseMedida({ data: "2025-01-02", acoes: ["Proibição"], atividades: ["Propaganda"], processo: null })).toBe(
      "02/01/2025: proibição de propaganda.",
    );
  });

  it("reads the optional fields, and older data without them as unknown", () => {
    const base = JSON.parse(
      readFileSync(new URL("./fixtures/cmed/produto/170560103.json", import.meta.url), "utf-8"),
    ) as Record<string, unknown>;
    const antigo = parseProduto(base);
    expect(antigo.situacao).toBeNull();
    expect(antigo.medidas).toEqual([]);
    const novo = parseProduto({
      ...base,
      situacao: { ativo: false, vencimento: null },
      medidas: [{ data: "2023-06-07", acoes: ["Recolhimento"], atividades: ["Uso"], processo: "1" }],
    });
    expect(novo.situacao).toEqual({ ativo: false, vencimento: null });
    expect(novo.medidas[0]!.acoes).toEqual(["Recolhimento"]);
    expect(() => parseProduto({ ...base, situacao: { ativo: true, vencimento: "06/2028" } })).toThrow(/vencimento/);
  });

  it("sums up what to check in one line, red only when ANVISA published a measure", () => {
    const recolhimento = { data: "2019-10-02", acoes: ["Recolhimento", "Suspensão"], atividades: [], processo: null };
    const proibicao = { data: "2023-03-01", acoes: ["Proibição"], atividades: ["Propaganda"], processo: null };
    const ativo = { ativo: true, vencimento: null };
    // CARDIZEM: inactive registration and a 2019 recall
    expect(
      avisoProduto({ situacao: { ativo: false, vencimento: null }, comercializado: true, medidas: [recolhimento] }),
    ).toEqual({ resumo: "Registro inativo e recolhimento em 2019.", tom: "alerta" });
    expect(avisoProduto({ situacao: ativo, comercializado: false, medidas: [] })).toEqual({
      resumo: "Sem venda no último ano.",
      tom: "atencao",
    });
    expect(avisoProduto({ situacao: null, comercializado: true, medidas: [proibicao] })?.resumo).toBe(
      "Medida da ANVISA em 2023.",
    );
    expect(
      avisoProduto({
        situacao: { ativo: false, vencimento: null },
        comercializado: false,
        medidas: [recolhimento, proibicao],
      })?.resumo,
    ).toBe("Registro inativo, sem venda no último ano e 2 medidas da ANVISA, a última em 2023.");
    expect(avisoProduto({ situacao: ativo, comercializado: true, medidas: [] })).toBeNull();
  });
});

describe("price per unit", () => {
  it("divides the box price and names the unit plainly", () => {
    expect(precoPorUnidade(8200, { n: 24, nome: "comprimido revestido" })).toBe("R$ 3,42 por comprimido");
    expect(precoPorUnidade(100000, { n: 50, nome: "frasco-ampola" })).toBe("R$ 20,00 por frasco-ampola");
    expect(precoPorUnidade(30, { n: 100, nome: "comprimido" })).toBe("menos de R$ 0,01 por comprimido");
  });
  it("treats hospital-only use as institutional even when the code says nothing", () => {
    expect(
      embalagemInstitucional({ apresentacao: "30 MG/ML SOL INJ CT 1 SER X 1 ML", restricao_hospitalar: true }),
    ).toBe(true);
    expect(
      embalagemInstitucional({ apresentacao: "30 MG/ML SOL INJ CT 1 SER X 1 ML", restricao_hospitalar: null }),
    ).toBe(false);
  });
});
