// ICMS rate that each state applies to medicines sold to consumers: the only hand-curated table on the site, so
// every row carries its source and the day it was checked. It never states a price for a state on its own: the
// pages show every rate and name the states whose default it is, with exceptions and doubts made visible.
//
// Researched on 2026-10-23 against state laws and SEFAZ texts. Findings that differ from most secondary tables:
// DF is 17% for medicines (Lei 1.254/96 art. 18, II, "i"), not the general 20%; AL and SE poverty-fund surcharges
// exclude "medicamentos de uso humano". The CMED columns use the nominal rate: tax-base reductions (CE) are not
// reflected, so the column stays the legal ceiling. Areas of Free Trade (ALC) are not covered here.
import { ALIQUOTAS, type Aliquota } from "./remedios";

export interface EstadoIcms {
  uf: string;
  nome: string;
  aliquota: Aliquota;
  /** rate for generic medicines when the state law sets one */
  aliquota_genericos?: Aliquota;
  /** primary source when there is one (state law, decree, SEFAZ); otherwise the best reproduction */
  fonte: string;
  /** false when only secondary sources were found: shown as "a confirmar" */
  confirmado: boolean;
  /** YYYY-MM-DD */
  conferido_em: string;
  /** known exceptions or doubts, in plain words */
  observacao?: string;
}

const C = "2026-10-23";

export const ESTADOS: EstadoIcms[] = [
  {
    uf: "AC",
    nome: "Acre",
    aliquota: "19",
    fonte: "https://sefaz.ac.gov.br/2021/?p=12159",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "AL",
    nome: "Alagoas",
    aliquota: "20.5",
    fonte: "https://www.legisweb.com.br/legislacao/?id=495048",
    confirmado: true,
    conferido_em: C,
    observacao: "20,5% desde 1º/4/2026. O adicional de 1% do fundo de pobreza não vale para remédios.",
  },
  {
    uf: "AM",
    nome: "Amazonas",
    aliquota: "20",
    fonte: "https://sistemas.sefaz.am.gov.br/get/Normas.do?metodo=viewDoc&uuidDoc=ac5497ab-4fbd-4bc8-a51b-32405f61dc30",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "AP",
    nome: "Amapá",
    aliquota: "18",
    fonte: "https://www.legisweb.com.br/legislacao/?id=118630",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "BA",
    nome: "Bahia",
    aliquota: "20.5",
    fonte: "http://mbusca.sefaz.ba.gov.br/DITRI/leis/leis_estaduais/legest_1996_7014_icmscomnotas.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "CE",
    nome: "Ceará",
    aliquota: "20",
    fonte: "https://www2.al.ce.gov.br/legislativo/legislacao5/leis2023/18665.htm",
    confirmado: true,
    conferido_em: C,
    observacao:
      "Alguns remédios da cesta básica (como dipirona e AAS) têm redução de imposto que a lista da CMED não mostra; o preço pode ficar abaixo da coluna de 20%.",
  },
  {
    uf: "DF",
    nome: "Distrito Federal",
    aliquota: "17",
    fonte: "https://www.sinj.df.gov.br/sinj/Norma/49208/Lei_1254_08_11_1996.html",
    confirmado: true,
    conferido_em: C,
    observacao: "Remédios têm alíquota própria de 17%, menor que a geral do DF.",
  },
  {
    uf: "ES",
    nome: "Espírito Santo",
    aliquota: "17",
    fonte:
      "https://sefaz.es.gov.br/Media/Receita%20Estadual/Legislacao/LEI%20N.%C2%B0%207.000%20-%20Atualizada%20(1).pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "GO",
    nome: "Goiás",
    aliquota: "19",
    fonte: "https://appasp.economia.go.gov.br/legislacao/arquivos/Cte/CTE.htm",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "MA",
    nome: "Maranhão",
    aliquota: "23",
    fonte: "https://www.legisweb.com.br/legislacao/?id=469350",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "MG",
    nome: "Minas Gerais",
    aliquota: "18",
    aliquota_genericos: "12",
    fonte: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/l6763_1975_02.html",
    confirmado: true,
    conferido_em: C,
    observacao: "Genéricos: 12%.",
  },
  {
    uf: "MS",
    nome: "Mato Grosso do Sul",
    aliquota: "17",
    fonte:
      "https://aacpdappls.net.ms.gov.br/appls/legislacao/serc/legato.nsf/a54e9c856eb2682e04256b210079ce21/9b9e5fd2565751de042579cf004d33a6",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "MT",
    nome: "Mato Grosso",
    aliquota: "17",
    fonte:
      "http://app1.sefaz.mt.gov.br/0325677500623408/07FA81BED2760C6B84256710004D3940/CC9C3B9886404BAA0325678B0043A842",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "PA",
    nome: "Pará",
    aliquota: "19",
    fonte: "https://bancodeleis.alepa.pa.gov.br/arquivos/lei9755_2022_29351.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "PB",
    nome: "Paraíba",
    aliquota: "20",
    fonte: "https://sapl.al.pb.leg.br/media/sapl/public/normajuridica/2023/16327/16327_texto_integral.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "PE",
    nome: "Pernambuco",
    aliquota: "20.5",
    fonte:
      "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/legislacao/Leis_Tributarias/2016/Lei15730_2016.htm",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "PI",
    nome: "Piauí",
    aliquota: "22.5",
    fonte: "https://inventti.com.br/sefaz-pi-lei-8-885-2024-aumenta-aliquota-geral-do-icms",
    confirmado: false,
    conferido_em: C,
  },
  {
    uf: "PR",
    nome: "Paraná",
    aliquota: "19.5",
    fonte: "https://www.sefanet.pr.gov.br/dados/sefadocumentos/7199611580.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "RJ",
    nome: "Rio de Janeiro",
    aliquota: "22",
    fonte: "https://www.legisweb.com.br/legislacao/?id=447911",
    confirmado: true,
    conferido_em: C,
    observacao:
      "20% mais 2% do fundo de combate à pobreza. Não foi possível descartar uma alíquota própria para algum remédio.",
  },
  {
    uf: "RN",
    nome: "Rio Grande do Norte",
    aliquota: "20",
    fonte:
      "https://www.substituicaotributaria.com/SST/substituicao-tributaria/noticia/20/12/2024/rio-grande-do-norte-majora-aliquota-interna-de-icms",
    confirmado: false,
    conferido_em: C,
  },
  {
    uf: "RO",
    nome: "Rondônia",
    aliquota: "19.5",
    fonte: "https://www.sefin.ro.gov.br/portalsefin/anexos/L96-688---consolidada---L24-5716_24.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "RR",
    nome: "Roraima",
    aliquota: "20",
    fonte:
      "https://www.substituicaotributaria.com/SST/substituicao-tributaria/noticia/02/01/2023/roraima-aumenta-aliquota-do-icms",
    confirmado: false,
    conferido_em: C,
  },
  {
    uf: "RS",
    nome: "Rio Grande do Sul",
    aliquota: "17",
    fonte:
      "https://atendimento.receita.rs.gov.br/upload/arquivos/202508/06142532-duvidas-frequentes-prod-farmaceuticos-v7-04042023.pdf",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "SC",
    nome: "Santa Catarina",
    aliquota: "17",
    fonte: "https://legislacao.sef.sc.gov.br/html/leis/1996/lei_96_10297.htm",
    confirmado: true,
    conferido_em: C,
  },
  {
    uf: "SE",
    nome: "Sergipe",
    aliquota: "19",
    fonte: "https://coad.com.br/app/webroot/imagensMat/lei9348-23.pdf",
    confirmado: true,
    conferido_em: C,
    observacao: "O adicional de 1% do fundo de pobreza não vale para remédios.",
  },
  {
    uf: "SP",
    nome: "São Paulo",
    aliquota: "18",
    aliquota_genericos: "12",
    fonte: "https://legislacao.fazenda.sp.gov.br/Paginas/textoricms.aspx",
    confirmado: true,
    conferido_em: C,
    observacao: "Genéricos: 12%.",
  },
  {
    uf: "TO",
    nome: "Tocantins",
    aliquota: "20",
    fonte: "https://www.al.to.leg.br/arquivos/lei_1287-2001_68306.PDF",
    confirmado: true,
    conferido_em: C,
  },
];

/** The rate a state applies to a product: the generics rate when it has one and the product is generic. */
export function aliquotaDoEstado(e: EstadoIcms, generico = false): Aliquota {
  return generico && e.aliquota_genericos ? e.aliquota_genericos : e.aliquota;
}

/** States per rate; "RN*" marks a state confirmed only by secondary sources. */
export function ufsPorAliquota(estados: EstadoIcms[] = ESTADOS, generico = false): Map<Aliquota, string[]> {
  const out = new Map<Aliquota, string[]>();
  for (const e of estados) {
    const a = aliquotaDoEstado(e, generico);
    out.set(a, [...(out.get(a) ?? []), e.confirmado ? e.uf : `${e.uf}*`].sort());
  }
  return out;
}

/** The rate used to compare products of a substância: the most common default among the states (ties go to
 * the lower rate), or 18% while the table is empty. `deEstados` says whether it came from the table. */
export function aliquotaReferencia(estados: EstadoIcms[] = ESTADOS): { aliquota: Aliquota; deEstados: boolean } {
  const contagem = [...ufsPorAliquota(estados).entries()].sort(
    (a, b) => b[1].length - a[1].length || ALIQUOTAS.indexOf(a[0]) - ALIQUOTAS.indexOf(b[0]),
  );
  const topo = contagem[0];
  return topo ? { aliquota: topo[0], deEstados: true } : { aliquota: "18", deEstados: false };
}

/** Rate columns on a product page: every rate some state uses (defaults and generics); every rate but 0% while
 * the table is empty. */
export function colunas(estados: EstadoIcms[] = ESTADOS): Aliquota[] {
  if (estados.length === 0) return ALIQUOTAS.filter((a) => a !== "0");
  const usadas = new Set<Aliquota>(
    estados.flatMap((e) => [e.aliquota, ...(e.aliquota_genericos ? [e.aliquota_genericos] : [])]),
  );
  return ALIQUOTAS.filter((a) => usadas.has(a));
}
