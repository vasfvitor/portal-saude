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
  motivoCancelamento,
  comparativoIdss,
  umParaCada,
  resumo,
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

describe("complaints", () => {
  it("each band, in words, with the practical reading first", () => {
    expect(fraseReclamacoes(recl(83.58, 37.55))).toMatchObject({
      titulo: "Recebe mais que o dobro das reclamações de uma operadora típica do mesmo tamanho.",
      tom: "desfavoravel",
    });
    expect(fraseReclamacoes(recl(75.1, 37.55)).titulo).toMatch(/^Recebe o dobro das reclamações/);
    expect(fraseReclamacoes(recl(120, 37.55)).titulo).toMatch(/^Recebe mais que o triplo/);
    expect(fraseReclamacoes(recl(200, 37.55)).titulo).toMatch(/^Recebe cerca de 5 vezes/);
    expect(fraseReclamacoes(recl(55, 37.55)).titulo).toBe(
      "Recebe mais reclamações que uma operadora típica do mesmo tamanho.",
    );
    expect(fraseReclamacoes(recl(40, 37.55))).toMatchObject({ tom: "neutro" });
    expect(fraseReclamacoes(recl(25, 37.55)).titulo).toMatch(/^Recebe menos reclamações/);
    expect(fraseReclamacoes(recl(10, 37.55))).toMatchObject({ tom: "favoravel" });
    expect(fraseReclamacoes(recl(10, 37.55)).titulo).toMatch(/^Recebe bem menos/);
    const { detalhe, comparacao } = fraseReclamacoes(recl(83.58, 37.55, 8484));
    expect(detalhe).toMatch(
      /^Na prática, de julho a setembro de 2026, houve 1 reclamação para cada 400 clientes nesta operadora; na típica, 1 para cada 890 clientes\./,
    );
    expect(detalhe).toContain("No total, foram 8.484 reclamações para 250 mil clientes em média.");
    expect(detalhe).toContain("a do meio entre as 94 operadoras de plano médico-hospitalar de tamanho grande");
    expect(comparacao).toMatchObject({ esta: 83.58, tipica: 37.55, max: 83.58, casas: 1 });
    expect(comparacao?.rotuloTipica).toBe("Típica entre as 94 do mesmo tamanho");
  });

  it("1 complaint for every N clients, rounded to two digits", () => {
    expect(umParaCada(83.58)).toBe(400);
    expect(umParaCada(37.55)).toBe(890);
    expect(umParaCada(1.1)).toBe(30000);
    expect(umParaCada(500)).toBe(67);
    expect(umParaCada(0)).toBeNull();
  });

  it("small base and missing data are never compared", () => {
    expect(fraseReclamacoes(recl(120, 20, 3))).toMatchObject({ tom: "sem-base" });
    expect(fraseReclamacoes(recl(120, 20, 3)).titulo).toMatch(/^Poucas reclamações no trimestre \(3\)/);
    expect(fraseReclamacoes(recl(120, 20, 3)).comparacao).toBeUndefined();
    expect(fraseReclamacoes(recl(120, 20, 3)).detalhe).not.toMatch(/para cada/);
    expect(fraseReclamacoes(recl(null, 20))).toMatchObject({ tom: "sem-base" });
    expect(fraseReclamacoes(recl(5, 0))).toMatchObject({ tom: "sem-base" });
  });

  it("same quarter a year earlier: better, worse or about the same", () => {
    const serie = [
      { trimestre: "3T2025", indice: 42.91, reclamacoes: 126 },
      { trimestre: "2T2026", indice: 40, reclamacoes: 120 },
      { trimestre: "3T2026", indice: 39.03, reclamacoes: 115 },
    ];
    expect(fraseAnoAnterior(serie)).toBe(
      "Parecido com um ano antes: de julho a setembro de 2025, era 1 reclamação para cada 780 clientes.",
    );
    expect(fraseAnoAnterior([{ ...serie[0]!, indice: 20 }, serie[2]!])).toBe(
      "Piorou em um ano: de julho a setembro de 2025, era 1 reclamação para cada 1.700 clientes.",
    );
    expect(fraseAnoAnterior([{ ...serie[0]!, indice: 80 }, serie[2]!])).toMatch(/^Melhorou em um ano/);
    expect(fraseAnoAnterior(serie.slice(1))).toBeNull();
    expect(fraseAnoAnterior([{ ...serie[0]!, reclamacoes: 4 }, serie[2]!])).toBeNull();
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
  it("on the 0-10 scale, against the typical score of the same modality", () => {
    expect(fraseIdss(idss(0.8112, 0.8), "Seguradora Especializada em Saúde")).toMatchObject({
      titulo: "Nota 0,81, no nível das seguradoras.",
      tom: "neutro",
    });
    expect(fraseIdss(idss(0.8112, 0.8), "Medicina de Grupo").comparacao).toMatchObject({ max: 1, casas: 2 });
    expect(fraseIdss(idss(0.9, 0.8), "Medicina de Grupo").tom).toBe("favoravel");
    expect(fraseIdss(idss(0.6, 0.8), "Medicina de Grupo").titulo).toBe(
      "Nota 0,60, abaixo da típica das operadoras de medicina de grupo.",
    );
    const { detalhe } = fraseIdss(idss(0.9, 0.8), "Seguradora Especializada em Saúde");
    expect(detalhe).toContain("a do meio entre 7 seguradoras");
    expect(detalhe).toContain("gestão. Esta é a nota de 2025, referente a 2024.");
    expect(comparativoIdss(idss(0.9, 0.8)).texto).toBe("0,90, acima da típica");
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
      "Recebe mais que o dobro das reclamações de uma operadora típica do mesmo tamanho.",
    );
    expect(fraseIdss(b.idss, b.modalidade).tom).toBe("neutro");
    expect(fraseRessarcimento(b.ressarcimento)?.titulo).toBe("Pagou ao SUS tudo o que devia.");
    expect(fraseRessarcimento(b.ressarcimento)?.detalhe).toMatch(/O SUS cobrou R\$ .* até [a-zç]+ de \d{4}\./);
    expect(fraseCancelamento(b)).toBeNull();
    expect(frasePortabilidade(b)).toBeNull();
  });

  it("summary lines agree with the full sentences", () => {
    expect(resumo(op("005711"))).toEqual([
      { assunto: "Reclamações", texto: "mais que o dobro da típica", tom: "desfavoravel", ancora: "reclamacoes" },
      { assunto: "Nota da ANS", texto: "0,81, no nível da típica", tom: "neutro", ancora: "nota" },
      { assunto: "Pagamentos ao SUS", texto: "pagou tudo", tom: "favoravel", ancora: "sus" },
    ]);
    expect(resumo(op("422134")).find((x) => x.ancora === "nota")?.texto).toBe("sem nota");
    const boa = { ...op("005711"), idss: { ...op("005711").idss!, valor: 0.95 } };
    expect(resumo(boa).find((x) => x.ancora === "nota")?.texto).toBe("0,95, acima da típica");
  });

  it("Univida: cancelled, special portability, no IDSS", () => {
    const u = op("422134");
    expect(fraseCancelamento(u)).toBe(
      "Registro cancelado em 22/09/2026: a ANS mandou fechar a operadora por problemas financeiros (liquidação extrajudicial). Motivo registrado na ANS: “Liquidação Extrajudicial”.",
    );
    expect(frasePortabilidade(u)).toMatch(/a ANS liberou a portabilidade especial em \d{2}\/\d{2}\/\d{4}/);
    expect(fraseIdss(u.idss, u.modalidade).tom).toBe("sem-base");
  });
});

describe("cancellation reasons", () => {
  it("every reason the ANS uses today, in plain words; unknown ones as written", () => {
    expect(motivoCancelamento("Pedido de cancelamento")).toBe("a própria operadora pediu para sair do mercado");
    expect(motivoCancelamento("Alternat. à Liquidação - Deliberação de Diretoria Colegiada")).toMatch(
      /diretoria da ANS/,
    );
    expect(motivoCancelamento("INEXISTÊNCIA DE PRODUTO ATIVO POR MAIS DE 180 DIAS")).toMatch(
      /180 dias sem nenhum plano/,
    );
    expect(motivoCancelamento("BAIXA DE INSCRIÇÃO NO CNPJ")).toBe("o CNPJ da operadora foi encerrado");
    expect(motivoCancelamento("DESCUMPRIMENTO DA RN Nº 543/2022")).toBe(
      "a operadora descumpriu uma norma da ANS (RN nº 543/2022)",
    );
    expect(motivoCancelamento("Motivo novo")).toBe("Motivo novo");
    expect(fraseCancelamento({ cancelamento: { data: "2026-01-02", motivo: "Motivo novo" } })).toBe(
      "Registro cancelado em 02/01/2026: Motivo novo.",
    );
  });
});
