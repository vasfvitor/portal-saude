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
export function bool(o: Obj, k: string, where: string): boolean {
  const v = o[k];
  if (typeof v !== "boolean") throw new Error(`${where}: no ${k}`);
  return v;
}
