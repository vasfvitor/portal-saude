// The site's name and the sentences shared by the pages and llms.txt. Public text is pt-BR, short and plain.
// The name is provisional: change it here when the final name and domain are chosen.
export const NAME = "saude.abelhaninja.de";

export const TITLE = "Seu plano de saúde, em dados abertos";

export const DESCRIPTION =
  "Reclamações comparadas com planos do mesmo porte, nota de qualidade da ANS, cancelamentos e portabilidade de carências. Dados públicos da ANS, com a fonte de cada número.";

export const DISCLAIMER = "Sem vínculo com a ANS. Os dados oficiais estão no site da agência.";

export const AUTHOR = { name: "Virtuaires", url: "https://virtuaires.com.br" };

export const pageTitle = (title: string): string => `${title} · ${NAME}`;
