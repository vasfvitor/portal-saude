// The site's name and the sentences shared by the pages and llms.txt. Public text is pt-BR, short and plain.
// The name is provisional: change it here when the final name and domain are chosen.
export const NAME = "saude.abelhaninja.de";

export const TITLE = "Plano de saúde e preço de remédios";

export const DESCRIPTION =
  "Compare a sua operadora de plano de saúde com as do mesmo porte e veja quanto a farmácia pode cobrar por cada remédio no seu estado. Números da ANS e da ANVISA, com a fonte de cada um.";

/** followed by the links to both agencies in the footer */
export const DISCLAIMER =
  "Os números são os publicados pela ANS e pela CMED/ANVISA, e o site não tem vínculo com elas. Os dados oficiais estão em";

export const AUTHOR = { name: "Virtuaires", url: "https://virtuaires.com.br" };

export const pageTitle = (title: string): string => `${title} · ${NAME}`;
