import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SINAIS_CONTEXTO,
  sinaisDeDificuldade,
  fraseMetaRn623,
  fraseAnoAnterior,
  fraseCancelamento,
  fraseIdss,
  frasePortabilidade,
  fraseReclamacoes,
  fraseFalhas,
  fraseCopiaPortabilidade,
  falhaDe,
  falhasDaPagina,
  assuntosDaOperadora,
  COLETA_COMPLETA,
  fraseRessarcimento,
  modalidadePlural,
  motivoCancelamento,
  comparativoIdss,
  umParaCada,
  resumo,
  tituloOperadora,
} from "../src/lib/frases";
import { parseMeta, parseOperadora, type Idss, type Reclamacoes } from "../src/lib/operadoras";

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
    expect(detalhe).not.toContain("a do meio");
    expect(fraseReclamacoes(recl(83.58, 37.55, 8484)).explica?.texto).toContain(
      "a do meio entre as 94 operadoras de plano médico-hospitalar de tamanho grande",
    );
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
    const { detalhe, explica } = fraseIdss(idss(0.9, 0.8), "Seguradora Especializada em Saúde");
    expect(detalhe).toBe("Esta é a nota de 2025, referente a 2024.");
    expect(explica?.texto).toContain("gestão. A típica é a do meio entre 7 seguradoras");
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
    expect(fraseRessarcimento(b.ressarcimento)?.titulo).toBe("Pagou ou parcelou tudo o que o SUS cobrou.");
    expect(fraseRessarcimento(b.ressarcimento)?.detalhe).toMatch(/^O SUS cobrou R\$ .* até [a-zç]+ de \d{4}\.$/);
    expect(fraseRessarcimento(b.ressarcimento)?.explica?.texto).toMatch(/^Quando um cliente de plano/);
    expect(fraseCancelamento(b)).toBeNull();
    expect(frasePortabilidade(b)).toBeNull();
  });

  it("SUS: the ANS index counts the parcelado as paid, and the rest may be contested", () => {
    // Univida: 0.06% of R$ 466 mil; the bundle predates valor_parcelado, which then reads as null
    const u = op("422134").ressarcimento!;
    expect(u.valor_parcelado).toBeNull();
    const f = fraseRessarcimento(u)!;
    expect(f.titulo).toBe("Pagou ou parcelou menos de 1% do que o SUS cobrou.");
    expect(f.detalhe).toContain("parte pode estar em discussão na própria ANS ou na Justiça");
    expect(f.detalhe).not.toContain("parcelados");
    expect(f.tom).toBe("desfavoravel");
    const comParcela = fraseRessarcimento({ ...u, indice_pagamento: 60, valor_parcelado: 100000 })!;
    expect(comParcela.titulo).toBe("Pagou ou parcelou 60% do que o SUS cobrou.");
    expect(comParcela.detalhe).toContain("Desse total, R$ 100 mil foram parcelados.");
  });

  it("SUS: a value the ANS did not publish is said, never read as nothing charged", () => {
    const u = op("422134").ressarcimento!;
    const zero = fraseRessarcimento({ ...u, valor_cobrado: 0, indice_pagamento: null })!;
    expect(zero.titulo).toBe("O SUS não cobrou nada desta operadora.");
    const semCobranca = fraseRessarcimento({ ...u, valor_cobrado: null, indice_pagamento: null })!;
    expect(semCobranca.titulo).toBe("A ANS não informou quanto o SUS cobrou desta operadora.");
    expect(semCobranca.tom).toBe("sem-base");
    const semIndice = fraseRessarcimento({ ...u, indice_pagamento: null })!;
    expect(semIndice.titulo).toBe("A ANS não informou quanto a operadora pagou do que o SUS cobrou.");
    expect(semIndice.detalhe).toMatch(/^O SUS cobrou R\$ 466 mil desta operadora até [a-zç]+ de \d{4}\.$/);
    const sus = (r: typeof u) => resumo({ ...op("422134"), ressarcimento: r }).find((x) => x.ancora === "sus")?.texto;
    expect(sus({ ...u, valor_cobrado: 0 })).toBe("nada cobrado");
    expect(sus({ ...u, valor_cobrado: null })).toBe("cobrança não informada");
    expect(sus({ ...u, indice_pagamento: null })).toBe("pagamento não informado");
  });

  it("summary lines agree with the full sentences", () => {
    expect(resumo(op("005711"))).toEqual([
      { assunto: "Reclamações", texto: "mais que o dobro da típica", tom: "desfavoravel", ancora: "reclamacoes" },
      { assunto: "Nota da ANS", texto: "0,81, no nível da típica", tom: "neutro", ancora: "nota" },
      { assunto: "Pagamentos ao SUS", texto: "pagou ou parcelou tudo", tom: "favoravel", ancora: "sus" },
    ]);
    expect(resumo(op("422134")).find((x) => x.ancora === "sus")?.texto).toBe(
      "pagou ou parcelou menos de 1% do que foi cobrado",
    );
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

describe("RN 623 target", () => {
  const base = {
    trimestre: "3T2026",
    meta: { "médico-hospitalar": 2.4, odontológica: 0.6 },
    ate_reclamacoes: { "médico-hospitalar": 3, odontológica: 2 },
  };
  it("says in or out, with both limits, and that the list comes later", () => {
    const fora = fraseMetaRn623({ ...base, atingiu: false, listas: [] });
    expect(fora).toContain("de julho a setembro de 2026, a operadora ficou fora da meta");
    expect(fora).toContain("plano médico-hospitalar até 2,4 reclamações por mês para cada 100 mil clientes, ou até 3");
    expect(fora).toContain("plano odontológico até 0,6");
    expect(fora).toContain("algumas semanas depois");
    const dentro = fraseMetaRn623({ ...base, atingiu: true, listas: ["https://x.test/l.pdf"] });
    expect(dentro).toContain("ficou dentro da meta");
    expect(dentro).toContain("já publicou a lista oficial");
  });
});

describe("signs of difficulty", () => {
  const base = {
    situacao: "ativa" as const,
    beneficiarios: 8000,
    beneficiarios_em: "2026-09",
    beneficiarios_ano_antes: 10000,
    eventos: [],
    portabilidade_vigente: [],
  };
  it("count a loss of 20% from 1,000 clients, naming both months", () => {
    expect(sinaisDeDificuldade(base, "2026-10-26")).toEqual([
      "Perdeu 20% dos clientes em 12 meses: eram 10 mil clientes em setembro de 2025 e são 8.000 clientes em setembro de 2026.",
    ]);
    expect(sinaisDeDificuldade({ ...base, beneficiarios: 8100 }, "2026-10-26")).toEqual([]);
    expect(sinaisDeDificuldade({ ...base, beneficiarios_ano_antes: 999, beneficiarios: 10 }, "2026-10-26")).toEqual([]);
    expect(sinaisDeDificuldade({ ...base, beneficiarios_ano_antes: null }, "2026-10-26")).toEqual([]);
  });
  it("list technical direction of the last three years and portability in force", () => {
    const dt = (data: string) => ({ tipo: "direcao-tecnica", id: `direcao-tecnica/${data}`, data, titulo: "" });
    const s = sinaisDeDificuldade(
      {
        ...base,
        beneficiarios: 9000,
        eventos: [dt("2025-06-04"), dt("2024-03-01"), dt("2022-12-15")],
        portabilidade_vigente: [{ ro: "3094", data: "2026-02-24", link: null }],
      },
      "2026-10-26",
    );
    expect(s).toEqual([
      "A ANS pôs a operadora sob direção técnica em 04/06/2025 e em 01/03/2024.",
      "A ANS liberou a troca de plano sem carência para os clientes (quadro acima).",
    ]);
  });
  it("say nothing about an operator that already closed", () => {
    expect(sinaisDeDificuldade({ ...base, situacao: "cancelada" }, "2026-10-26")).toEqual([]);
  });
  it("never forecast", () => {
    expect(SINAIS_CONTEXTO).toMatch(/^Nenhum destes sinais quer dizer que a operadora vai fechar\./);
  });
});

describe("sources the ANS collection keeps failing", () => {
  const meta = (falhas: unknown[], extra: object = {}) => {
    const m = parseMeta({ date: "2026-11-23", falhas, ...extra });
    return { ...m, falhas: m.falhas! };
  };
  const rn623 = { dia: "2026-11-23", fonte: "listas RN 623", motivo: "página fora do ar", assunto: "rn623" };
  const port = {
    dia: "2026-11-23",
    fonte: "portabilidade-especial.html",
    motivo: "HTTP 000",
    assunto: "portabilidade",
  };

  it("names each source by subject, once, with the first day of its run of failures", () => {
    expect(fraseFalhas([])).toBeNull();
    expect(
      fraseFalhas(
        meta([
          { ...rn623, desde: "2026-11-21" },
          { ...port, desde: "2026-11-21" },
        ]).falhas,
      ),
    ).toBe(
      "Desde 21/11/2026, o site não consegue baixar da ANS: Listas de metas de reclamação (RN 623), Portabilidade especial. Os dados dessas fontes são os da última coleta que deu certo, antes dessa data.",
    );
    expect(
      fraseFalhas([
        { dia: "2026-10-30", desde: "2026-10-29", fonte: "índice de ressarcimento", assunto: "ressarcimento" },
        {
          dia: "2026-10-30",
          desde: "2026-10-27",
          fonte: "202609_Indice_de_Efetivo_Pagamento.csv",
          assunto: "ressarcimento",
        },
        { dia: "2026-10-30", desde: "2026-10-29", fonte: "pda-023-igr.csv", assunto: "reclamacoes" },
        { dia: "2026-10-30", desde: "2026-10-29", fonte: "outra_fonte.csv", assunto: null },
      ]),
    ).toBe(
      "Desde 27/10/2026, o site não consegue baixar da ANS: Ressarcimento ao SUS. Desde 29/10/2026, o site não consegue baixar da ANS: Índice de reclamações, outra_fonte.csv. Os dados dessas fontes são os da última coleta que deu certo, antes dessas datas.",
    );
  });

  it("without desde, names the failed collection's day and never says since when", () => {
    // `dia` moves with every run: "Desde {dia}" would give a new, wrong first day each day
    const sem = meta([rn623, port]).falhas;
    expect(sem[0]!.desde).toBeNull();
    expect(fraseFalhas(sem)).toBe(
      "Na coleta de 23/11/2026, o site não conseguiu baixar da ANS: Listas de metas de reclamação (RN 623), Portabilidade especial. Os dados dessas fontes são os da última coleta que deu certo, antes dessa data.",
    );
    // one source with its first day, one without: each says what is known
    expect(fraseFalhas(meta([{ ...rn623, desde: "2026-11-21" }, port]).falhas)).toBe(
      "Desde 21/11/2026, o site não consegue baixar da ANS: Listas de metas de reclamação (RN 623). Na coleta de 23/11/2026, o site não conseguiu baixar da ANS: Portabilidade especial. Os dados dessas fontes são os da última coleta que deu certo, antes dessas datas.",
    );
    expect(meta([{ ...rn623, desde: "2026-11-21" }]).falhas[0]!.desde).toBe("2026-11-21");
    expect(() => meta([{ ...rn623, desde: "21/11/2026" }])).toThrow(/bad falhas desde/);
  });

  it("dates the copy shown when ans-feeds publishes ultima_copia, and only then", () => {
    // ultima_copia is the day of the stored version shown, not a download day: said as "a cópia mostrada é de"
    const comCopia = meta([
      { ...rn623, desde: "2026-11-21", ultima_copia: "2026-11-20" },
      { ...port, desde: "2026-11-21", ultima_copia: "2026-11-20" },
    ]).falhas;
    expect(fraseFalhas(comCopia)).toBe(
      "Desde 21/11/2026, o site não consegue baixar da ANS: Listas de metas de reclamação (RN 623), Portabilidade especial; as cópias mostradas são de 20/11/2026. Os dados dessas fontes são os da última coleta que deu certo, antes dessa data.",
    );
    // one copy dated, one not: each says what is known
    expect(fraseFalhas(meta([{ ...rn623, ultima_copia: "2026-02-24" }, port]).falhas)).toBe(
      "Na coleta de 23/11/2026, o site não conseguiu baixar da ANS: Listas de metas de reclamação (RN 623); a cópia mostrada é de 24/02/2026. Na coleta de 23/11/2026, o site não conseguiu baixar da ANS: Portabilidade especial. Os dados dessas fontes são os da última coleta que deu certo, antes dessa data.",
    );
    expect(fraseCopiaPortabilidade(meta(comCopia, { portabilidade_atualizada_em: "2026-02-24" }))).toBe(
      "Desde 21/11/2026, o site não consegue baixar a página de portabilidade especial da ANS. A lista é a da última coleta que deu certo, antes dessa data (a cópia mostrada é de 20/11/2026); naquela coleta, a página dizia ter sido atualizada em 24/02/2026.",
    );
    const m = {
      trimestre: "3T2026",
      atingiu: true,
      meta: { odontológica: 0.6 },
      ate_reclamacoes: { odontológica: 2 },
      listas: [],
    };
    expect(fraseMetaRn623(m, falhaDe(comCopia, "rn623"))).toMatch(
      /\. Desde 21\/11\/2026, o site não consegue baixar a página da ANS onde ficam as listas oficiais \(a cópia mostrada é de 20\/11\/2026\): uma lista publicada depois disso ainda não aparece aqui\.$/,
    );
  });

  it("reads well when the collection stopped halfway without naming a source", () => {
    // ans-feeds' feeds.yml writes this fonte, with no assunto, when snapshot.sh stops halfway
    expect(
      fraseFalhas([
        { dia: "2026-11-08", desde: "2026-11-07", fonte: "algumas fontes (a coleta parou no meio)", assunto: null },
      ]),
    ).toBe(
      "Desde 07/11/2026, o site não consegue baixar da ANS: algumas fontes (a coleta parou no meio). Os dados dessas fontes são os da última coleta que deu certo, antes dessa data.",
    );
  });

  it("each page names only the failing sources it is built from, plus a collection that stopped halfway", () => {
    const parou = { dia: "2026-11-23", fonte: "algumas fontes (a coleta parou no meio)", motivo: "x", assunto: null };
    const outra = { dia: "2026-11-23", fonte: "fora_das_paginas.csv", motivo: "x", assunto: null };
    const igr = { dia: "2026-11-23", fonte: "pda-023-igr.csv", motivo: "x", assunto: "reclamacoes" };
    const falhas = meta([rn623, port, parou, outra, igr]).falhas;
    const semMeta = { ...op("333689"), meta_rn623: null };
    expect([...assuntosDaOperadora(semMeta)].sort()).toEqual([
      "cadastro",
      "cancelamentos",
      "direcao_tecnica",
      "idss",
      "portabilidade",
      "reclamacoes",
      "ressarcimento",
    ]);
    expect(assuntosDaOperadora({ ...semMeta, meta_rn623: { trimestre: "3T2026" } as never }).has("rn623")).toBe(true);
    expect(falhasDaPagina(falhas, assuntosDaOperadora(semMeta))!.map((f) => f.fonte)).toEqual([
      "portabilidade-especial.html",
      "algumas fontes (a coleta parou no meio)",
      "pda-023-igr.csv",
    ]);
    expect(falhasDaPagina(meta([rn623]).falhas, new Set(["cadastro"]))).toEqual([]);
  });

  it("tells a list of no failures (every source collected) from no list at all", () => {
    // COLETA_COMPLETA goes on the page only for a present, empty list
    expect(parseMeta({ date: "2026-11-23" }).falhas).toBeNull();
    expect(falhasDaPagina(null, new Set(["cadastro"]))).toBeNull();
    expect(falhaDe(null, "rn623")).toBeNull();
    expect(falhasDaPagina(parseMeta({ date: "2026-11-23", falhas: [] }).falhas, new Set(["cadastro"]))).toEqual([]);
  });

  it("only says every source was collected as a fact of that collection, never a cadence", () => {
    expect(COLETA_COMPLETA).not.toMatch(/todo dia|diariamente|sempre/);
  });

  it("the RN 623 sentence says the lists page fails, from its first day", () => {
    const m = {
      trimestre: "3T2026",
      atingiu: true,
      meta: { odontológica: 0.6 },
      ate_reclamacoes: { odontológica: 2 },
      listas: [],
    };
    expect(fraseMetaRn623(m)).not.toContain("Desde");
    const falha = falhaDe(meta([{ ...rn623, desde: "2026-11-21" }, port]).falhas, "rn623");
    expect(fraseMetaRn623(m, falha)).toMatch(
      /algumas semanas depois do fim do trimestre\. Desde 21\/11\/2026, o site não consegue baixar a página da ANS onde ficam as listas oficiais: uma lista publicada depois disso ainda não aparece aqui\.$/,
    );
    // without desde: the day of the failed collection, never "Desde"
    const semDesde = fraseMetaRn623(m, falhaDe(meta([rn623]).falhas, "rn623"));
    expect(semDesde).not.toContain("Desde");
    expect(semDesde).toMatch(
      /\. Na coleta de 23\/11\/2026, o site não conseguiu baixar a página da ANS onde ficam as listas oficiais: uma lista publicada depois da última coleta que deu certo ainda não aparece aqui\.$/,
    );
    expect(falhaDe(meta([port]).falhas, "rn623")).toBeNull();
  });

  it("the portability list gives the date of its copy, and the failure when the page cannot be read", () => {
    const ok = meta([], { portabilidade_atualizada_em: "2026-02-24" });
    expect(fraseCopiaPortabilidade(ok)).toBe(
      "Lista copiada da página de portabilidade especial da ANS na coleta de 23/11/2026; a página diz que foi atualizada em 24/02/2026.",
    );
    expect(fraseCopiaPortabilidade(meta([]))).toBe(
      "Lista copiada da página de portabilidade especial da ANS na coleta de 23/11/2026.",
    );
    expect(fraseCopiaPortabilidade(meta([rn623, port], { portabilidade_atualizada_em: "2026-02-24" }))).toBe(
      "Na coleta de 23/11/2026, o site não conseguiu baixar a página de portabilidade especial da ANS. A lista é a da última coleta que deu certo, antes dessa data; naquela coleta, a página dizia ter sido atualizada em 24/02/2026.",
    );
    expect(fraseCopiaPortabilidade(meta([{ ...port, desde: "2026-11-21" }]))).toMatch(/^Desde 21\/11\/2026, /);
    // another source failing does not touch the portability sentence
    expect(fraseCopiaPortabilidade(meta([rn623]))).toMatch(/^Lista copiada/);
  });
});

describe("page title", () => {
  it("says what the page has, in the words people search with, and only what the data holds", () => {
    const ativa = op("333689"); // complaints published
    expect(tituloOperadora(ativa)).toMatch(/: reclamações na ANS$/);
    expect(tituloOperadora(op("422134"))).toMatch(/: registro cancelado na ANS$/); // cancelled comes first
    expect(tituloOperadora({ ...ativa, reclamacoes: [] })).toMatch(/: plano de saúde na ANS$/);
    // the name is the one the h1 shows
    expect(tituloOperadora(ativa).startsWith(`${ativa.fantasia ?? ativa.nome}:`)).toBe(true);
  });
});
