// The CMED presentation code in plain words: "500 MG COM REV CT BL AL PLAS PVC/PVDC OPC X 14" → dose "500 mg",
// "14 comprimidos revestidos". Only the forms in FORMAS are read; anything else returns null and the page shows
// the original text, which is always shown anyway in small print. The `chave` (dose, form and quantity) lets
// pages compare the same thing across brands. Self-contained on purpose: no imports.

interface Forma {
  /** singular and plural, for counted forms ("comprimido revestido", "comprimidos revestidos") */
  um: string;
  varios: string;
  /** counted per unit (tablets, capsules); otherwise measured (ml, g) in a container */
  contavel: boolean;
}

const f = (um: string, varios: string, contavel = false): Forma => ({ um, varios, contavel });

// CMED codes, longest first when one is a prefix of another (matched against whole words)
const FORMAS: [string, Forma][] = [
  [
    "COM REV LIB RETARD",
    f("comprimido revestido de liberação retardada", "comprimidos revestidos de liberação retardada", true),
  ],
  [
    "COM REV LIB PROL",
    f("comprimido revestido de liberação prolongada", "comprimidos revestidos de liberação prolongada", true),
  ],
  ["COM LIB PROL", f("comprimido de liberação prolongada", "comprimidos de liberação prolongada", true)],
  ["COM LIB RETARD", f("comprimido de liberação retardada", "comprimidos de liberação retardada", true)],
  ["COM REV", f("comprimido revestido", "comprimidos revestidos", true)],
  ["COMP REV", f("comprimido revestido", "comprimidos revestidos", true)],
  ["COM EFEV", f("comprimido efervescente", "comprimidos efervescentes", true)],
  ["COM ORODISP", f("comprimido que dissolve na boca", "comprimidos que dissolvem na boca", true)],
  ["COM SUBL", f("comprimido sublingual", "comprimidos sublinguais", true)],
  ["COM MAST", f("comprimido mastigável", "comprimidos mastigáveis", true)],
  ["COM VAG", f("comprimido vaginal", "comprimidos vaginais", true)],
  ["COM SUS", f("comprimido para suspensão", "comprimidos para suspensão", true)],
  ["COM", f("comprimido", "comprimidos", true)],
  ["CAP DURA LIB RETARD", f("cápsula de liberação retardada", "cápsulas de liberação retardada", true)],
  ["CAP DURA LIB PROL", f("cápsula de liberação prolongada", "cápsulas de liberação prolongada", true)],
  ["CAP DURA", f("cápsula", "cápsulas", true)],
  ["CAP MOLE", f("cápsula mole", "cápsulas moles", true)],
  ["CAP GEL", f("cápsula gelatinosa", "cápsulas gelatinosas", true)],
  ["CAP", f("cápsula", "cápsulas", true)],
  ["DRG", f("drágea", "drágeas", true)],
  ["PAS DURA", f("pastilha", "pastilhas", true)],
  ["PAS", f("pastilha", "pastilhas", true)],
  ["SUP", f("supositório", "supositórios", true)],
  ["OVL", f("óvulo", "óvulos", true)],
  ["ADES TRANSD", f("adesivo", "adesivos", true)],
  ["SOL INJ", f("solução injetável", "solução injetável")],
  ["SUS INJ", f("suspensão injetável", "suspensão injetável")],
  ["PO SOL INJ", f("pó para solução injetável", "pó para solução injetável")],
  ["PO LIOF INJ", f("pó para injeção", "pó para injeção")],
  ["PO LIOF SOL INJ", f("pó para solução injetável", "pó para solução injetável")],
  ["PO LIOF SUS INJ", f("pó para suspensão injetável", "pó para suspensão injetável")],
  ["PO LIOF", f("pó para injeção", "pó para injeção")],
  ["PÓ LIOF", f("pó para injeção", "pó para injeção")],
  ["PO SUS OR", f("pó para suspensão oral", "pó para suspensão oral")],
  ["PO SOL OR", f("pó para solução oral", "pó para solução oral")],
  ["PO SOL", f("pó para solução", "pó para solução")],
  ["SOL OR", f("solução oral", "solução oral")],
  ["SOL ORAL", f("solução oral", "solução oral")],
  ["SOL INFUS", f("solução para infusão", "solução para infusão")],
  ["SOL DIL", f("solução para diluir", "solução para diluir")],
  ["SOL TOP", f("solução para a pele", "solução para a pele")],
  ["SUS SPR", f("spray (suspensão)", "spray (suspensão)")],
  ["PO INJ", f("pó para injeção", "pó para injeção")],
  ["PO INAL", f("pó para inalação", "pó para inalação")],
  ["PO EFEV", f("pó efervescente", "pó efervescente")],
  ["PO OR", f("pó oral", "pó oral")],
  ["PO SUS", f("pó para suspensão", "pó para suspensão")],
  ["GRAN SOL", f("granulado para solução", "granulado para solução")],
  ["COLUT", f("enxaguante bucal", "enxaguante bucal")],
  ["SUS OR", f("suspensão oral", "suspensão oral")],
  ["SOL GOT", f("solução em gotas", "solução em gotas")],
  ["SUS GOT OR", f("suspensão oral em gotas", "suspensão oral em gotas")],
  ["SUS GOT", f("suspensão em gotas", "suspensão em gotas")],
  ["SOL OFT", f("colírio", "colírio")],
  ["SUS OFT", f("colírio (suspensão)", "colírio (suspensão)")],
  ["SOL NAS", f("solução nasal", "solução nasal")],
  ["SUS NAS", f("suspensão nasal", "suspensão nasal")],
  ["SOL SPR", f("spray", "spray")],
  ["SOL INAL", f("solução para inalação", "solução para inalação")],
  ["SOL CAPI", f("solução para o couro cabeludo", "solução para o couro cabeludo")],
  ["XPE", f("xarope", "xarope")],
  ["ELX", f("elixir", "elixir")],
  ["EMU", f("emulsão", "emulsão")],
  ["CREM DERM", f("creme", "creme")],
  ["CREM VAG", f("creme vaginal", "creme vaginal")],
  ["CREM", f("creme", "creme")],
  ["POM DERM", f("pomada", "pomada")],
  ["POM OFT", f("pomada para os olhos", "pomada para os olhos")],
  ["POM", f("pomada", "pomada")],
  ["GEL DERM", f("gel", "gel")],
  ["GEL", f("gel", "gel")],
  ["LOC", f("loção", "loção")],
  ["AER", f("aerossol", "aerossol")],
  ["GRAN", f("granulado", "granulado")],
];

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

export function lerApresentacao(texto: string): ApresentacaoLida | null {
  const t = texto.toUpperCase().replace(/\s+/g, " ").trim();
  const palavras = t.split(" ");
  let inicio = -1;
  let forma: Forma | null = null;
  let codigo = "";
  // the form is the first run of words that matches a code, after the dose
  for (let i = 0; i < palavras.length && !forma; i++) {
    for (const [c, fm] of FORMAS) {
      const partes = c.split(" ");
      if (partes.every((p, j) => palavras[i + j] === p)) {
        inicio = i;
        forma = fm;
        codigo = c;
        break;
      }
    }
  }
  if (!forma) return null;
  const doseTokens = palavras.slice(0, inicio);
  if (doseTokens.length > 0 && !doseTokens.some((x) => /\d/.test(x))) return null;
  const dose = lerDose(doseTokens);
  const resto = palavras.slice(inicio + codigo.split(" ").length).join(" ");
  const semExtras = resto.replace(/\(EMB FRAC\)|\bEMB HOSP\b/g, "").trim();
  // kits (tablets plus placebos, two different ampoules) are left to the original text
  if (/\+\s*\(|\+\s*[\d.,]+\s*(MG|MCG|G\b|UI|PLACEBOS?|COM|CAP|DRG)/.test(semExtras)) return null;

  let conteudo: string | null = null;
  if (forma.contavel) {
    const m = /\bX\s*(\d+)\b(?!\s*(ML|G|L)\b)/.exec(semExtras);
    const caixas = /\b(?:CT|CX)\s+(\d+)\s+(BL|STR|FR|ENV)\b/.exec(semExtras);
    if (m && caixas && caixas[1] !== "1") {
      const total = String(Number(caixas[1]) * Number(m[1]));
      conteudo = `${plural(total, [forma.um, forma.varios])} (${plural(caixas[1]!, CARTELAS[caixas[2]!]!)} de ${m[1]})`;
    } else if (m) {
      conteudo = plural(m[1]!, [forma.um, forma.varios]);
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
      conteudo = `${plural(recip[1]!, RECIPIENTES[recip[2]!]!)} de ${quantoCabe} de ${forma.um}`;
    } else if (quantoCabe) {
      const r = recip ? RECIPIENTES[recip[2]!]![0] : umRecip ? RECIPIENTES[umRecip[1]!]![0] : null;
      conteudo = r ? `${r} de ${quantoCabe} de ${forma.um}` : `${quantoCabe} de ${forma.um}`;
    } else if (soRecip) {
      conteudo = `${plural(soRecip[1]!, RECIPIENTES.ENV!)} de ${forma.um}`;
    } else if (recip) {
      conteudo = `${plural(recip[1]!, RECIPIENTES[recip[2]!]!)} de ${forma.um}`;
    }
  }
  if (!conteudo) return null;
  const chave = [chaveDose(dose), codigo.replace("COMP REV", "COM REV"), conteudo].join("|");
  return { dose, conteudo, legivel: dose ? `${dose} · ${conteudo}` : conteudo, chave };
}
