import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fmtMoney } from "../src/lib/format";
import {
  aliquotaRotulo,
  avisoComercializacao,
  classeSemCodigo,
  faixaPreco,
  precoMaximo,
  tarjaExplicada,
  tipoExplicado,
} from "../src/lib/frases-remedios";
import { ALIQUOTAS, parseProduto } from "../src/lib/remedios";

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
    expect(precoMaximo(a, "18")).toBe("R$ 507,70");
    const sem0 = ALIQUOTAS.filter((k) => k !== "0");
    expect(faixaPreco(a, sem0)).toBe("De R$ 473,09 (ICMS 12%) a R$ 540,68 (ICMS 23%), conforme o estado.");
    expect(faixaPreco({ ...a, pmc: {} }, sem0)).toBeNull();
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
