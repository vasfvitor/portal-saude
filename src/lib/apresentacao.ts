// The CMED presentation code in plain words: "500 MG COM REV CT BL AL PLAS PVC/PVDC OPC X 14" → dose "500 mg",
// "14 comprimidos revestidos". Only the forms in FORMAS are read; anything else returns null and the page shows
// the original text, which is always shown anyway in small print. The `chave` (dose, form and quantity) lets
// pages compare the same thing across brands. Self-contained on purpose: no imports.

/** Counted forms (tablets, capsules) carry singular and plural; measured ones (ml, g in a container) one name. */
type Forma = { conta: [string, string] } | { medida: string };

const conta = (um: string, varios: string): Forma => ({ conta: [um, varios] });
const medida = (nome: string): Forma => ({ medida: nome });

// CMED codes, longest first when one is a prefix of another (matched against whole words, first match wins)
const TABELA_FORMAS: [string, Forma][] = [
  [
    "COM REV LIB RETARD",
    conta("comprimido revestido de liberação retardada", "comprimidos revestidos de liberação retardada"),
  ],
  [
    "COM REV LIB PROL",
    conta("comprimido revestido de liberação prolongada", "comprimidos revestidos de liberação prolongada"),
  ],
  ["COM LIB PROL", conta("comprimido de liberação prolongada", "comprimidos de liberação prolongada")],
  ["COM LIB RETARD", conta("comprimido de liberação retardada", "comprimidos de liberação retardada")],
  ["COM REV", conta("comprimido revestido", "comprimidos revestidos")],
  ["COMP REV", conta("comprimido revestido", "comprimidos revestidos")],
  ["COM EFEV", conta("comprimido efervescente", "comprimidos efervescentes")],
  ["COM ORODISP", conta("comprimido que dissolve na boca", "comprimidos que dissolvem na boca")],
  ["COM SUBL", conta("comprimido sublingual", "comprimidos sublinguais")],
  ["COM MAST", conta("comprimido mastigável", "comprimidos mastigáveis")],
  ["COM VAG", conta("comprimido vaginal", "comprimidos vaginais")],
  ["COM SUS", conta("comprimido para suspensão", "comprimidos para suspensão")],
  ["COM", conta("comprimido", "comprimidos")],
  ["CAP DURA LIB RETARD", conta("cápsula de liberação retardada", "cápsulas de liberação retardada")],
  ["CAP DURA LIB PROL", conta("cápsula de liberação prolongada", "cápsulas de liberação prolongada")],
  ["CAP DURA", conta("cápsula", "cápsulas")],
  ["CAP MOLE", conta("cápsula mole", "cápsulas moles")],
  ["CAP GEL", conta("cápsula gelatinosa", "cápsulas gelatinosas")],
  ["CAP", conta("cápsula", "cápsulas")],
  ["DRG", conta("drágea", "drágeas")],
  ["PAS DURA", conta("pastilha", "pastilhas")],
  ["PAS", conta("pastilha", "pastilhas")],
  ["SUP", conta("supositório", "supositórios")],
  ["OVL", conta("óvulo", "óvulos")],
  ["ADES TRANSD", conta("adesivo", "adesivos")],
  ["SOL INJ", medida("solução injetável")],
  ["SUS INJ", medida("suspensão injetável")],
  ["PO SOL INJ", medida("pó para solução injetável")],
  ["PO LIOF INJ", medida("pó para injeção")],
  ["PO LIOF SOL INJ", medida("pó para solução injetável")],
  ["PO LIOF SUS INJ", medida("pó para suspensão injetável")],
  ["PO LIOF", medida("pó para injeção")],
  ["PÓ LIOF", medida("pó para injeção")],
  ["PO SUS OR", medida("pó para suspensão oral")],
  ["PO SOL OR", medida("pó para solução oral")],
  ["PO SOL", medida("pó para solução")],
  ["SOL OR", medida("solução oral")],
  ["SOL ORAL", medida("solução oral")],
  ["SOL INFUS", medida("solução para infusão")],
  ["SOL DIL", medida("solução para diluir")],
  ["SOL TOP", medida("solução para a pele")],
  ["SUS SPR", medida("spray (suspensão)")],
  ["PO INJ", medida("pó para injeção")],
  ["PO INAL", medida("pó para inalação")],
  ["PO EFEV", medida("pó efervescente")],
  ["PO OR", medida("pó oral")],
  ["PO SUS", medida("pó para suspensão")],
  ["GRAN SOL", medida("granulado para solução")],
  ["COLUT", medida("enxaguante bucal")],
  ["SUS OR", medida("suspensão oral")],
  ["SOL GOT", medida("solução em gotas")],
  ["SUS GOT OR", medida("suspensão oral em gotas")],
  ["SUS GOT", medida("suspensão em gotas")],
  ["SOL OFT", medida("colírio")],
  ["SUS OFT", medida("colírio (suspensão)")],
  ["SOL NAS", medida("solução nasal")],
  ["SUS NAS", medida("suspensão nasal")],
  ["SOL SPR", medida("spray")],
  ["SOL INAL", medida("solução para inalação")],
  ["SOL CAPI", medida("solução para o couro cabeludo")],
  ["XPE", medida("xarope")],
  ["ELX", medida("elixir")],
  ["EMU", medida("emulsão")],
  ["CREM DERM", medida("creme")],
  ["CREM VAG", medida("creme vaginal")],
  ["CREM", medida("creme")],
  ["POM DERM", medida("pomada")],
  ["POM OFT", medida("pomada para os olhos")],
  ["POM", medida("pomada")],
  ["GEL DERM", medida("gel")],
  ["GEL", medida("gel")],
  ["LOC", medida("loção")],
  ["AER", medida("aerossol")],
  ["GRAN", medida("granulado")],
];

// each code split into words once
const FORMAS = TABELA_FORMAS.map(([codigo, forma]) => ({ partes: codigo.split(" "), forma }));

const RECIPIENTES: Record<string, [string, string]> = {
  AMP: ["ampola", "ampolas"],
  FA: ["frasco-ampola", "frascos-ampola"],
  FR: ["frasco", "frascos"],
  SER: ["seringa", "seringas"],
  ENV: ["envelope", "envelopes"],
  BG: ["bisnaga", "bisnagas"],
  CAN: ["caneta", "canetas"],
  CARP: ["tubete", "tubetes"],
  CAR: ["refil", "refis"],
};
const CARTELAS: Record<string, [string, string]> = {
  BL: ["cartela", "cartelas"],
  STR: ["cartela", "cartelas"],
  FR: ["frasco", "frascos"],
  ENV: ["envelope", "envelopes"],
};

export interface ApresentacaoLida {
  /** "500 mg", "(50 + 850) mg", "20 mg/ml"; empty when the code has no dose */
  dose: string;
  /** "14 comprimidos revestidos", "frasco de 120 ml de xarope", "3 ampolas de 2 ml de solução injetável" */
  conteudo: string;
  /** dose and content together, for the page */
  legivel: string;
  /** what makes two presentations comparable: dose, form and quantity */
  chave: string;
}

const UNIDADE = /^(MG|G|MCG|UI|U|ML|L|%|MEQ|MMOL|KG)(\/(ML|G|L|DOSE|GOTA|KG|ACIONAMENTO|JATO))?$/;

/** "35,0" and "35" are the same dose in the key */
const chaveDose = (dose: string): string =>
  dose
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\d+(?:[.,]\d+)?/g, (n) => String(Number(n.replace(/\./g, "").replace(",", "."))));
const unidade = (u: string): string => u.toLowerCase().replace(/^ui?\b/, (x) => x.toUpperCase());

/** "5MG" → "5 MG" and "(50 + 850) MG" stays; the dose is everything before the form. */
function lerDose(tokens: string[]): string {
  return tokens
    .join(" ")
    .replace(/(\d)([A-Z%])/g, "$1 $2")
    .split(" ")
    .map((t) => (UNIDADE.test(t) ? unidade(t) : t))
    .join(" ")
    .replace(/\s*\+\s*/g, " + ");
}

const plural = (n: string, [um, varios]: [string, string]): string => `${n} ${n === "1" ? um : varios}`;

// every page reads the same ~22,700 codes several times in a build
const lidas = new Map<string, ApresentacaoLida | null>();

export function lerApresentacao(texto: string): ApresentacaoLida | null {
  let lida = lidas.get(texto);
  if (lida === undefined) {
    lida = ler(texto);
    lidas.set(texto, lida);
  }
  return lida;
}

function ler(texto: string): ApresentacaoLida | null {
  const palavras = texto.toUpperCase().replace(/\s+/g, " ").trim().split(" ");
  // the form is the first run of words that matches a code, after the dose
  let inicio = -1;
  let achada: (typeof FORMAS)[number] | undefined;
  for (let i = 0; i < palavras.length && !achada; i++) {
    achada = FORMAS.find(({ partes }) => partes.every((p, j) => palavras[i + j] === p));
    if (achada) inicio = i;
  }
  if (!achada) return null;
  const { forma, partes } = achada;
  const doseTokens = palavras.slice(0, inicio);
  if (doseTokens.length > 0 && !doseTokens.some((x) => /\d/.test(x))) return null;
  const dose = lerDose(doseTokens);
  const resto = palavras.slice(inicio + partes.length).join(" ");
  const semExtras = resto.replace(/\(EMB FRAC\)|\bEMB HOSP\b/g, "").trim();
  // kits (tablets plus placebos, two different ampoules) are left to the original text
  if (/\+\s*\(|\+\s*[\d.,]+\s*(MG|MCG|G\b|UI|PLACEBOS?|COM|CAP|DRG)/.test(semExtras)) return null;

  let conteudo: string | null = null;
  if ("conta" in forma) {
    const m = /\bX\s*(\d+)\b(?!\s*(ML|G|L)\b)/.exec(semExtras);
    const caixas = /\b(?:CT|CX)\s+(\d+)\s+(BL|STR|FR|ENV)\b/.exec(semExtras);
    if (m && caixas && caixas[1] !== "1") {
      const total = String(Number(caixas[1]) * Number(m[1]));
      conteudo = `${plural(total, forma.conta)} (${plural(caixas[1]!, CARTELAS[caixas[2]!]!)} de ${Number(m[1])})`;
    } else if (m) {
      conteudo = plural(m[1]!, forma.conta);
    }
  } else {
    // only the part before the first "+": what follows is an accessory or a diluent with its own volume
    const principal = semExtras.split(/\s\+\s/)[0]!;
    const medida = /\bX\s*([\d.,]+)\s*(ML|G|L|DOSES?)\b/.exec(principal);
    const recip = /\b(?:CT|CX|X)\s*(\d+)\s+(AMP|FA|FR|SER|ENV|BG|CAN|CARP|CAR)\b/.exec(principal);
    const umRecip = /\b(AMP|FA|FR|SER|BG|CAN|CARP|CAR)\b/.exec(principal);
    const soRecip = /\b(\d+)\s+(ENV)\b/.exec(principal);
    const quantoCabe = medida
      ? `${medida[1]} ${/^DOSES?$/.test(medida[2]!) ? (medida[1] === "1" ? "dose" : "doses") : medida[2]!.toLowerCase()}`
      : null;
    if (recip && quantoCabe && recip[1] !== "1") {
      conteudo = `${plural(recip[1]!, RECIPIENTES[recip[2]!]!)} de ${quantoCabe} de ${forma.medida}`;
    } else if (quantoCabe) {
      const r = recip ? RECIPIENTES[recip[2]!]![0] : umRecip ? RECIPIENTES[umRecip[1]!]![0] : null;
      conteudo = r ? `${r} de ${quantoCabe} de ${forma.medida}` : `${quantoCabe} de ${forma.medida}`;
    } else if (soRecip) {
      conteudo = `${plural(soRecip[1]!, RECIPIENTES.ENV!)} de ${forma.medida}`;
    } else if (recip) {
      conteudo = `${plural(recip[1]!, RECIPIENTES[recip[2]!]!)} de ${forma.medida}`;
    }
  }
  if (!conteudo) return null;
  // the content already names the form, so CMED spellings of the same form ("CAP", "CAP DURA") compare as one
  // and how the box is split ("2 cartelas de 7") does not change what is bought: 14 tablets are 14 tablets
  const chave = `${chaveDose(dose)}|${conteudo.replace(/ \(.*\)$/, "")}`;
  return { dose, conteudo, legivel: dose ? `${dose} · ${conteudo}` : conteudo, chave };
}
