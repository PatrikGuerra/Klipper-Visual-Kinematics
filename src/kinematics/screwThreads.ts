export const screwThreadOptions = ['CW-M3', 'CCW-M3', 'CW-M4', 'CCW-M4', 'CW-M5', 'CCW-M5'] as const;

export type ScrewThreadOption = (typeof screwThreadOptions)[number];

export function normalizeScrewThread(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function isOfficialScrewThread(value: unknown): value is ScrewThreadOption {
  return screwThreadOptions.includes(normalizeScrewThread(value) as ScrewThreadOption);
}
