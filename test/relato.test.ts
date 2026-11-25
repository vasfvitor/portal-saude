import { describe, expect, it } from "vitest";
import { RELATO_EMAIL, REPOS } from "../src/lib/config";
import { linksRelato, relatoHtml, relatoRodapeHtml } from "../src/lib/relato";

const PAGINA = "https://saude.abelhaninja.de/plano/393321-unimed-rio/";
const query = (url: string): URLSearchParams => new URLSearchParams(url.slice(url.indexOf("?") + 1));

describe("relato", () => {
  it("the address is the one the user chose", () => {
    expect(RELATO_EMAIL).toBe("ajuda@abelhaninja.de");
  });

  it("issue URL: this repo's form, with the page, the item and the title", () => {
    const { issue, assunto } = linksRelato({
      pagina: PAGINA,
      item: "Unimed Rio (registro ANS 393321)",
      titulo: "Unimed Rio",
    });
    expect(assunto).toBe("Problema em Unimed Rio (registro ANS 393321)");
    expect(issue.startsWith(`${REPOS.portal}/issues/new?template=problema.yml&`)).toBe(true);
    const p = query(issue);
    expect(p.get("template")).toBe("problema.yml");
    expect(p.get("pagina")).toBe(PAGINA);
    expect(p.get("item")).toBe("Unimed Rio (registro ANS 393321)");
    expect(p.get("title")).toBe("Problema em Unimed Rio (registro ANS 393321)");
    expect(issue).toContain(`&pagina=${encodeURIComponent(PAGINA)}&`);
    expect(issue).toContain("&item=Unimed%20Rio%20(registro%20ANS%20393321)");
  });

  it("encodes accents, spaces, '&', '#' and newlines; spaces as %20, never +", () => {
    const item = "Pão & Água #2\nsegunda linha";
    const { issue, mailto } = linksRelato({ pagina: `${PAGINA}?a=1#x`, item, titulo: "t" });
    for (const url of [issue, mailto]) {
      expect(url).not.toContain("+");
      expect(url).not.toContain(" ");
      expect(url).not.toContain("\n");
      expect(url.split("#")).toHaveLength(1);
    }
    expect(issue).toContain("&item=P%C3%A3o%20%26%20%C3%81gua%20%232%0Asegunda%20linha");
    const p = query(issue);
    expect(p.get("item")).toBe(item);
    expect(p.get("pagina")).toBe(`${PAGINA}?a=1#x`);
    // "&" inside a value never splits it into another parameter
    expect([...p.keys()]).toEqual(["template", "title", "pagina", "item"]);
  });

  it("mailto: same subject as the title, the body with the page and the item", () => {
    const { mailto } = linksRelato({ pagina: PAGINA, item: "Novalgina, registro 100900029", titulo: "x" });
    expect(mailto.startsWith(`mailto:${RELATO_EMAIL}?subject=`)).toBe(true);
    const p = query(mailto);
    expect(p.get("subject")).toBe("Problema em Novalgina, registro 100900029");
    expect(p.get("body")).toBe(
      `Página: ${PAGINA}\nItem: Novalgina, registro 100900029\n\nO que está errado:\n\nO que a fonte oficial mostra (link):\n`,
    );
    expect(mailto).toContain("subject=Problema%20em%20Novalgina%2C%20registro%20100900029&body=P%C3%A1gina%3A%20");
  });

  it("no item: the subject uses the page title, item stays empty", () => {
    const { issue, mailto, assunto } = linksRelato({ pagina: "https://saude.abelhaninja.de/", titulo: "Remédios" });
    expect(assunto).toBe("Problema em Remédios");
    expect(query(issue).get("item")).toBe("");
    expect(query(issue).get("pagina")).toBe("https://saude.abelhaninja.de/");
    expect(query(mailto).get("body")).toContain("Item: \n\n");
  });

  it("renders the full sentence, one space at each seam, '&' escaped in the attributes", () => {
    const html = relatoHtml({ pagina: PAGINA, item: "A & B", titulo: "A & B" });
    const texto = html.replace(/<[^>]+>/g, "");
    expect(texto).toBe(
      "Encontrou um erro? Abra um relato no GitHub (precisa de conta) ou escreva para ajuda@abelhaninja.de. O relato no GitHub é público: não inclua dados pessoais.",
    );
    expect(html).toContain(
      '<a href="https://github.com/vasfvitor/portal-saude/issues/new?template=problema.yml&amp;title=',
    );
    expect(html).toContain('<a href="mailto:ajuda@abelhaninja.de?subject=Problema%20em%20A%20%26%20B&amp;body=');
    expect(html).not.toMatch(/href="[^"]*&(?!amp;)/);
  });

  it("renders the footer form", () => {
    const html = relatoRodapeHtml({ pagina: PAGINA, titulo: "Remédios" });
    expect(html.replace(/<[^>]+>/g, "")).toBe("Encontrou um erro? Relato no GitHub ou ajuda@abelhaninja.de.");
    expect(html).toContain("title=Problema%20em%20Rem%C3%A9dios&amp;pagina=");
  });
});
