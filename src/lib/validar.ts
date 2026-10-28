// Field validators for the upstream JSON: each throws with `where` and the key, so a contract change
// upstream fails the build with a message that says what moved.

export type Obj = Record<string, unknown>;

export function obj(v: unknown, where: string): Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error(`${where}: not an object`);
  return v as Obj;
}
export function list(v: unknown, where: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${where}: not a list`);
  return v;
}
export function str(o: Obj, k: string, where: string): string {
  const v = o[k];
  if (typeof v !== "string" || v === "") throw new Error(`${where}: no ${k}`);
  return v;
}
export function strOrNull(o: Obj, k: string, where: string): string | null {
  const v = o[k];
  if (v === null) return null;
  if (typeof v !== "string") throw new Error(`${where}: bad ${k}`);
  return v;
}
export function num(o: Obj, k: string, where: string): number {
  const v = o[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${where}: no ${k}`);
  return v;
}
export function numOrNull(o: Obj, k: string, where: string): number | null {
  const v = o[k];
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${where}: bad ${k}`);
  return v;
}
/** A field the upstream added later: absent (an older build of the data) reads as null, like a missing value. */
export function numOrAbsent(o: Obj, k: string, where: string): number | null {
  return o[k] === undefined ? null : numOrNull(o, k, where);
}
/** The same for a flag: absent reads as null, so the page can tell "not flagged" from "not published yet". */
export function boolOrAbsent(o: Obj, k: string, where: string): boolean | null {
  return o[k] === undefined ? null : bool(o, k, where);
}
/** An Atom feed URL the page links to. Absent or null means no feed: the upstream may not publish it yet,
 * and the page then leaves the "Acompanhar" block out instead of failing the build. */
export function feedOrNull(o: Obj, k: string, where: string): string | null {
  const v = o[k];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || !/^https:\/\/[^\s"<>]+\.xml$/.test(v)) throw new Error(`${where}: bad ${k}`);
  return v;
}
export function bool(o: Obj, k: string, where: string): boolean {
  const v = o[k];
  if (typeof v !== "boolean") throw new Error(`${where}: no ${k}`);
  return v;
}

/** A bundle (todos.json, todas.json) checked against its index: the same number of entries and, position by
 * position, the same index fields, so a half-deployed upstream fails the build instead of mixing two versions.
 * `extra` checks anything else per entry and throws with the `where` it gets. */
export function conferirComIndice<T, I>(
  itens: T[],
  indice: I[],
  campos: readonly (keyof T & keyof I & string)[],
  nomes: { pacote: string; indice: string; unidade: string; id: (x: T) => string },
  extra?: (x: T, item: I, where: string) => void,
): void {
  if (itens.length !== indice.length)
    throw new Error(`${nomes.pacote}: ${itens.length} ${nomes.unidade}, but ${nomes.indice} lists ${indice.length}`);
  itens.forEach((x, i) => {
    const item = indice[i]!;
    const where = `${nomes.pacote}[${i}] (${nomes.id(x)})`;
    for (const k of campos)
      if (x[k] !== (item[k] as unknown))
        throw new Error(`${where}: ${k} ${String(x[k])}, but ${nomes.indice} has ${String(item[k])}`);
    extra?.(x, item, where);
  });
}
