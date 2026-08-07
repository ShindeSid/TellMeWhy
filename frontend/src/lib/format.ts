export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

export function formatScore(value: number | null | undefined): string {
  return formatPercent(value);
}
