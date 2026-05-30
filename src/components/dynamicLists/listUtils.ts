export function normalizeFilter(filterText?: string): string {
  return String(filterText ?? '').trim().toLowerCase();
}

export function matchesFilter(filterText: string | undefined, ...parts: unknown[]): boolean {
  const normalized = normalizeFilter(filterText);
  if (!normalized) return true;
  const fullText = parts.map((part) => String(part ?? '').toLowerCase()).join(' ');
  const compactText = parts.map((part) => compact(part)).join('');
  return fullText.includes(normalized) || compactText.includes(compact(normalized));
}

export function numberFromInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[\s_\-:[\]()]+/g, '');
}
