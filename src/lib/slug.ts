/** "BRADESCO SAÚDE S.A." → "bradesco-saude-s-a" (at most 60 characters, no dash at the ends). */
export function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}
