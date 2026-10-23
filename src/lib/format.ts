// pt-BR formatting. Times are shown in Brasília, whatever offset the source carries; a date without a time
// (YYYY-MM-DD) is shown as that calendar day.

const TZ = "America/Sao_Paulo";
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const dayTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const fmtInt = (n: number): string => int.format(n);

/** 0.8112 → "0,81"; 39.03 → "39,0" with digits=1. */
export function fmtDec(n: number, digits = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 91.31 (already a percentage) → "91%"; values below 100 never round up to "100%". */
export function fmtPct(value: number): string {
  const shown = value < 100 ? Math.min(Math.round(value), 99) : Math.round(value);
  return `${int.format(shown)}%`;
}

/** 456053738.7 → "R$ 456 mi"; 690728.47 → "R$ 690 mil"; small values in full reais. */
export function fmtReais(value: number): string {
  if (value >= 1e9) return `R$ ${fmtDec(value / 1e9, 1)} bi`;
  if (value >= 1e6) return `R$ ${int.format(Math.round(value / 1e6))} mi`;
  if (value >= 1e4) return `R$ ${int.format(Math.round(value / 1e3))} mil`;
  return `R$ ${int.format(Math.round(value))}`;
}

/** centavos → "R$ 507,70"; 341576938 → "R$ 3.415.769,38". */
export function fmtMoney(centavos: number): string {
  const reais = Math.trunc(centavos / 100);
  const cents = Math.abs(centavos % 100);
  return `R$ ${int.format(reais)},${String(cents).padStart(2, "0")}`;
}

/** 3391379 → "3,4 milhões"; 98203 → "98 mil"; 524 → "524". */
export function fmtPessoas(n: number): string {
  if (n >= 1e6) return `${fmtDec(n / 1e6, 1)} ${n >= 2e6 ? "milhões" : "milhão"}`;
  if (n >= 1e4) return `${int.format(Math.round(n / 1e3))} mil`;
  return int.format(n);
}

/** 3391379 → "3,4 milhões de beneficiários"; 98203 → "98 mil beneficiários"; 1 → "1 beneficiário". */
export function fmtBeneficiarios(n: number): string {
  if (n === 1) return "1 beneficiário";
  return `${fmtPessoas(n)}${n >= 1e6 ? " de" : ""} beneficiários`;
}

/** "2026-10-08" or an ISO timestamp → "08/10/2026". */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return day.format(new Date(iso));
}

/** ISO timestamp → "08/10/2026, 13:11" in Brasília. */
export function fmtDateTime(iso: string): string {
  return dayTime.format(new Date(iso));
}
