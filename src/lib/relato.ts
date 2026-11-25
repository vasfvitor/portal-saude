// "Encontrou um erro?": the links a reader uses to report a problem on a page, as a GitHub issue (the form
// .github/ISSUE_TEMPLATE/problema.yml, prefilled by query string) or as an e-mail. The same wording in the five
// health sites. Built at build time, so the pages need no client JavaScript; the HTML comes out as one string, so
// no formatter can break the sentence around its links.
import { RELATO_EMAIL, REPOS } from "./config";

export interface Relato {
  /** the canonical absolute URL of the page */
  pagina: string;
  /** what the page is about, with its identifier ("Unimed Rio (registro ANS 393321)"); empty when about no one item */
  item?: string;
  /** the page title, used in the subject when there is no item */
  titulo: string;
}

export interface LinksRelato {
  assunto: string;
  issue: string;
  mailto: string;
}

/** encodeURIComponent: spaces as %20 (never +), "&", "#", newlines and accents encoded */
const q = encodeURIComponent;

export function linksRelato({ pagina, item = "", titulo }: Relato): LinksRelato {
  const assunto = `Problema em ${item || titulo}`;
  const issue = `${REPOS.portal}/issues/new?template=problema.yml&title=${q(assunto)}&pagina=${q(pagina)}&item=${q(item)}`;
  // RFC 6068: line breaks in a mailto body are CRLF (%0D%0A)
  const corpo = `Página: ${pagina}\r\nItem: ${item}\r\n\r\nO que está errado:\r\n\r\nO que a fonte oficial mostra (link):\r\n`;
  const mailto = `mailto:${RELATO_EMAIL}?subject=${q(assunto)}&body=${q(corpo)}`;
  return { assunto, issue, mailto };
}

/** for an attribute value in double quotes */
const attr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The full sentence, next to the data of a page about one item. */
export function relatoHtml(r: Relato): string {
  const { issue, mailto } = linksRelato(r);
  return (
    `Encontrou um erro? <a href="${attr(issue)}">Abra um relato no GitHub</a> (precisa de conta) ou ` +
    `<a href="${attr(mailto)}">escreva para ${RELATO_EMAIL}</a>. ` +
    "O relato no GitHub é público: não inclua dados pessoais."
  );
}

/** The short form in the footer of every page. */
export function relatoRodapeHtml(r: Relato): string {
  const { issue, mailto } = linksRelato(r);
  return (
    `Encontrou um erro? <a href="${attr(issue)}">Relato no GitHub</a> (público: não inclua dados pessoais) ou ` +
    `<a href="${attr(mailto)}">${RELATO_EMAIL}</a>.`
  );
}
