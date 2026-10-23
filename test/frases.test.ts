import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fraseAnoAnterior,
  fraseCancelamento,
  fraseIdss,
  frasePortabilidade,
  fraseReclamacoes,
  fraseRessarcimento,
  modalidadePlural,
  trimestre,
  trimestreCurto,
} from "../src/lib/frases";
import { parseOperadora, type Idss, type Reclamacoes } from "../src/lib/operadoras";

const op = (reg: string) =>
  parseOperadora(
    JSON.parse(readFileSync(new URL(`./fixtures/dados/operadora/${reg}.json`, import.meta.url), "utf-8")) as unknown,
  );

const recl = (indice: number | null, mediana: number | null, reclamacoes = 100): Reclamacoes => ({
  cobertura: "médico-hospitalar",
  trimestre: "3T2026",
  indice,
  reclamacoes,
  beneficiarios_media: 250000,
  porte: "Grande",
  mediana_mesmo_porte: mediana,
  operadoras_mesmo_porte: 94,
  serie: [],
});

describe("quarters", () => {
  it("long and short labels", () => {
    expect(trimestre("3T2026")).toBe("3º trimestre de 2026 (jul a set)");
    expect(trimestre("1T2025")).toBe("1º trimestre de 2025 (jan a mar)");
    expect(trimestreCurto("4T2024")).toBe("4º tri/24");
  });
});

describe("complaints", () => {
  it("each band, with the base in the detail", () => {
    expect(fraseReclamacoes(recl(83.58, 37.55))).toMatchObject({
      titulo: "Recebe 2,2 vezes as reclamações de um plano típico de porte grande.",
      tom: "desfavoravel",
    });
    expect(fraseReclamacoes(recl(55, 37.55)).titulo).toBe(
      "Recebe mais reclamações que um plano típico de porte grande.",
    );
    expect(fraseReclamacoes(recl(40, 37.55))).toMatchObject({ tom: "neutro" });
    expect(fraseReclamacoes(recl(25, 37.55)).titulo).toMatch(/^Recebe menos reclamações/);
    expect(fraseReclamacoes(recl(10, 37.55))).toMatchObject({ tom: "favoravel" });
    expect(fraseReclamacoes(recl(10, 37.55)).titulo).toMatch(/^Recebe bem menos/);
    const { detalhe } = fraseReclamacoes(recl(83.58, 37.55, 8484));
    expect(detalhe).toContain("8.484 reclamações na ANS no 3º trimestre de 2026 (jul a set)");
    expect(detalhe).toContain("250 mil beneficiários");
    expect(detalhe).toContain("mediana entre 94 operadoras médico-hospitalares de porte grande");
    expect(detalhe).toContain("37,6");
    expect(detalhe).toContain("83,6");
  });

  it("small base and missing data are never compared", () => {
    expect(fraseReclamacoes(recl(120, 20, 3))).toMatchObject({ tom: "sem-base" });
    expect(fraseReclamacoes(recl(120, 20, 3)).titulo).toMatch(/Poucas reclamações/);
    expect(fraseReclamacoes(recl(null, 20))).toMatchObject({ tom: "sem-base" });
    expect(fraseReclamacoes(recl(5, 0))).toMatchObject({ tom: "sem-base" });
  });

  it("same quarter a year earlier", () => {
    const serie = [
      { trimestre: "3T2025", indice: 42.91, reclamacoes: 126 },
      { trimestre: "2T2026", indice: 40, reclamacoes: 120 },
      { trimestre: "3T2026", indice: 39.03, reclamacoes: 115 },
    ];
    expect(fraseAnoAnterior(serie)).toBe("No mesmo trimestre do ano anterior: 42,9 (126 reclamações).");
    expect(fraseAnoAnterior(serie.slice(1))).toBeNull();
  });
});

describe("IDSS", () => {
  const idss = (valor: number | null, mediana: number | null): Idss => ({
    ano: 2025,
    ano_base: 2024,
    valor,
    motivo: valor === null ? "não divulgado pela ANS" : null,
    dimensoes: {},
    mediana_mesma_modalidade: mediana,
    operadoras_mesma_modalidade: 7,
  });
  it("against the typical score of the same modality", () => {
    expect(fraseIdss(idss(0.8112, 0.8), "Seguradora Especializada em Saúde")).toMatchObject({
      titulo: "Nota 0,81 no índice de desempenho da ANS, no nível das seguradoras.",
      tom: "neutro",
    });
    expect(fraseIdss(idss(0.9, 0.8), "Medicina de Grupo").tom).toBe("favoravel");
    expect(fraseIdss(idss(0.6, 0.8), "Medicina de Grupo").titulo).toContain("abaixo da nota típica");
    expect(fraseIdss(idss(0.9, 0.8), "Seguradora Especializada em Saúde").detalhe).toContain(
      "mediana entre 7 seguradoras",
    );
  });
  it("no score: says why", () => {
    expect(fraseIdss(idss(null, 0.65), "Medicina de Grupo").titulo).toContain("não divulgado pela ANS");
    expect(fraseIdss(null, "Medicina de Grupo").tom).toBe("sem-base");
  });
  it("modality plurals", () => {
    expect(modalidadePlural("Cooperativa Médica")).toBe("cooperativas médicas");
    expect(modalidadePlural("Nova Modalidade")).toBe("operadoras da modalidade Nova Modalidade");
  });
});

describe("real operators", () => {
  it("Bradesco: complaints above peers, IDSS at the level, SUS paid in full", () => {
    const b = op("005711");
    expect(fraseReclamacoes(b.reclamacoes[0]!).titulo).toBe(
      "Recebe 2,2 vezes as reclamações de um plano típico de porte grande.",
    );
    expect(fraseIdss(b.idss, b.modalidade).tom).toBe("neutro");
    expect(fraseRessarcimento(b.ressarcimento)?.titulo).toBe(
      "Pagou 100% do que o SUS cobrou por atender clientes desta operadora.",
    );
    expect(fraseCancelamento(b)).toBeNull();
    expect(frasePortabilidade(b)).toBeNull();
  });

  it("Univida: cancelled, special portability, no IDSS", () => {
    const u = op("422134");
    expect(fraseCancelamento(u)).toBe("Registro cancelado pela ANS em 22/09/2026. Motivo: Liquidação Extrajudicial.");
    expect(frasePortabilidade(u)).toMatch(/^A ANS liberou a portabilidade especial em \d{2}\/\d{2}\/\d{4}/);
    expect(fraseIdss(u.idss, u.modalidade).tom).toBe("sem-base");
  });
});
