import { describe, expect, it } from "vitest";
import { lerApresentacao, marcaInstitucional } from "../src/lib/apresentacao";

const leg = (s: string) => lerApresentacao(s)?.legivel ?? null;

describe("CMED presentation codes in plain words", () => {
  it("counted forms: dose and how many", () => {
    expect(leg("500 MG COM REV CT BL AL PLAS PVC/PVDC OPC X 14")).toBe("500 mg · 14 comprimidos revestidos");
    expect(leg("5MG COM REV CT BL AL PLAS OPC X 15")).toBe("5 mg · 15 comprimidos revestidos");
    expect(leg("(5 + 10) MG COM REV CT BL AL AL X 30")).toBe("(5 + 10) mg · 30 comprimidos revestidos");
    expect(leg("8 MG COM ORODISP CT BL AL AL X 1")).toBe("8 mg · 1 comprimido que dissolve na boca");
    expect(leg("7000 UI CAP MOLE CT BL AL PLAS PVDC OPC X 30")).toBe("7000 UI · 30 cápsulas moles");
    expect(leg("5 MG COM CT BL AL PLAS PVC OPC X 80 (EMB FRAC)")).toBe("5 mg · 80 comprimidos");
  });

  it("boxes with several blisters or bottles are multiplied", () => {
    expect(leg("10 MG COM CT 2 BL AL PLAS AMB X 15")).toBe("10 mg · 30 comprimidos (2 cartelas de 15)");
    expect(leg("500 MG COM REV CT 2 BL AL PLAS TRANS X 07")).toBe(
      "500 mg · 14 comprimidos revestidos (2 cartelas de 7)",
    );
    expect(leg("(10 + 10) MG CAP DURA CT 3 FR PLAS PEAD OPC X 30")).toBe(
      "(10 + 10) mg · 90 cápsulas (3 frascos de 30)",
    );
  });

  it("measured forms: container, volume and form", () => {
    expect(leg("10 MG/ML XPE CT FR VD AMB X 120 ML + COP")).toBe("10 mg/ml · frasco de 120 ml de xarope");
    expect(leg("2 MG/ML SOL INJ CT 3 AMP VD AMB X 2 ML")).toBe("2 mg/ml · 3 ampolas de 2 ml de solução injetável");
    expect(leg("0,3 MG/G POM DERM CT BG PLAS OPC X 30 G")).toBe("0,3 mg/g · bisnaga de 30 g de pomada");
    expect(leg("2 MG/ML SOL OFT CT FR GOT PLAS PE OPC X 10ML")).toBe("2 mg/ml · frasco de 10 ml de colírio");
    expect(leg("770 MG GRAN SOL CT 20 ENV AL/PLAS PE X 3 G (SBR DAMASCO)")).toBe(
      "770 mg · 20 envelopes de 3 g de granulado para solução",
    );
    expect(leg("0,6 U/G + 0,01 G/G POM GINEC CT BG AL X 30 G + 6 APLIC")).toBe(
      "0,6 U/g + 0,01 g/g · bisnaga de 30 g de pomada",
    );
  });

  it("accessories and diluents after a + do not change the content", () => {
    expect(leg("1,34 MG/ML SOL INJ SC CT 2 CAR VD TRANS X 1,5 ML +  2 CAN APLIC  + 10 AGU")).toBe(
      "1,34 mg/ml · 2 refis de 1,5 ml de solução injetável",
    );
    expect(leg("PO LIOF INJ CT 3 FA + 3 AMP VD INC DIL X 0,5 ML")).toBe("3 frascos-ampola de pó para injeção");
    expect(leg("PO LIOF CT 10 FA VD TRANS X 1 DOSE + 10 SER PREENC VD TRANS X 0,5 ML")).toBe(
      "10 frascos-ampola de 1 dose de pó para injeção",
    );
  });

  it("kits and unknown forms are left to the original text", () => {
    expect(lerApresentacao("(15 + 3) MG COM REV CT BL AL PLAS PVC TRANS X 24 + 4 PLACEBOS")).toBeNull();
    expect(
      lerApresentacao(
        "(100,0 + 100,0) MG/ML SOL INJ IM CT 3 AMP VD AMB X 1 ML + (5,0 + 4,37) MG SOL INJ IM 3 AMP X 2 ML",
      ),
    ).toBeNull();
    expect(lerApresentacao("10 MG/ML FORMA NOVA CT FR X 10 ML")).toBeNull();
  });

  it("the key ignores spelling differences of the same dose", () => {
    const a = lerApresentacao("35,0 MG CAP DURA CT BL AL PLAS PVC/PVDC OPC X 14")!;
    const b = lerApresentacao("35 MG CAP DURA CT BL AL AL X 14")!;
    expect(a.chave).toBe(b.chave);
    expect(lerApresentacao("500 MG COM REV CT 2 BL AL PLAS TRANS X 07")!.chave).toBe(
      lerApresentacao("500 MG COM REV CT BL AL AL X 14")!.chave,
    );
    expect(lerApresentacao("500 MG COM REV CT BL AL AL X 14")!.chave).not.toBe(
      lerApresentacao("500 MG COM CT BL AL AL X 14")!.chave,
    );
  });
});

describe("units and institutional boxes", () => {
  const ler = (t: string) => lerApresentacao(t)!;
  it("count what the box holds more than one of", () => {
    expect(ler("500 MG COM REV CT BL AL PLAS PVC/PVDC OPC X 14").unidade).toEqual({
      n: 14,
      nome: "comprimido revestido",
    });
    expect(ler("20 MG COM CT 2 BL AL PLAS X 7").unidade).toEqual({ n: 14, nome: "comprimido" });
    expect(ler("2 MG/ML SOL INJ IM/IV CX 100 AMP VD TRANS X 1 ML").unidade).toEqual({ n: 100, nome: "ampola" });
    expect(ler("3 MG/ML XPE CT FR PLAS PET AMB X 100 ML + COP").unidade).toBeUndefined();
  });
  it("mark the list's own markers and the sizes no one buys for themselves", () => {
    expect(ler("50 MG/ML SOL INJ CX 25 AMP VD AMB X 1 ML (EMB HOSP)").institucional).toBe(true);
    expect(ler("2 MG/ML SOL INJ IM/IV CX 100 AMP VD TRANS X 1 ML").institucional).toBe(true);
    expect(ler("850 MG COM REV CT BL AL PLAS TRANS X 500").institucional).toBe(true);
    expect(ler("3 MG/ML XPE CX 60 FR PLAS PET AMB X 100 ML + 60 COP").institucional).toBe(true);
    expect(ler("267 MG CAP DURA CT FR PLAS PEAD OPC X 270").institucional).toBe(false);
    expect(ler("100 MG GRAN CT 16 ENV PAPEL AL POLIET X 5 G").institucional).toBe(false);
    expect(ler("1G PÓ SOL INJ IV CX 10 FA VD TRANS X 50ML").institucional).toBe(false);
  });
  it("still read the content behind a marker", () => {
    expect(ler("100 MG COM CT BL AL PLAS INC X 200 (EMB MULTIPLA)").conteudo).toBe("200 comprimidos");
    expect(marcaInstitucional("40 MG COM CT BL AL X 30 (EMB. HOSP")).toBe(true);
  });
});
