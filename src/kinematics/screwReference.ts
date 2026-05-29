import { num } from './math';
import type { AppState, FieldValue, Screw } from './types';

export type ScrewReference = 'usable_bed' | 'physical_bed';

export const screwReferenceOptions: Array<{ id: ScrewReference; label: string; help: string }> = [
  {
    id: 'usable_bed',
    label: 'Usable bed',
    help: 'X0 Y0 is the usable bed offset.'
  },
  {
    id: 'physical_bed',
    label: 'Bed Physical Size',
    help: 'X0 Y0 is the physical plate corner.'
  }
];

export function normalizeScrewReference(value: FieldValue | undefined): ScrewReference {
  return value === 'physical_bed' ? 'physical_bed' : 'usable_bed';
}

export function screwReferenceOrigin(
  values: AppState['values'],
  reference = normalizeScrewReference(values.screw_reference)
): { x: number; y: number; label: string } {
  const usableX = num(values.bed_x_offset);
  const usableY = num(values.bed_y_offset);
  if (reference === 'physical_bed') {
    return {
      x: usableX + num(values.bed_x) / 2 - num(values.plate_x) / 2,
      y: usableY + num(values.bed_y) / 2 - num(values.plate_y) / 2,
      label: 'Bed Physical Size'
    };
  }
  return { x: usableX, y: usableY, label: 'Usable bed' };
}

export function screwToInput(screw: Screw, values: AppState['values']): { x: number; y: number } {
  const origin = screwReferenceOrigin(values);
  return {
    x: screw.x - origin.x,
    y: screw.y - origin.y
  };
}

export function inputToScrew(x: number, y: number, values: AppState['values']): { x: number; y: number } {
  const origin = screwReferenceOrigin(values);
  return {
    x: origin.x + x,
    y: origin.y + y
  };
}
