import type { FieldValue } from './types';

export function num(value: FieldValue | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function fmt(value: number, digits = 2): string {
  return Number(value).toFixed(digits);
}

export function isFiniteNumber(value: FieldValue | undefined): boolean {
  return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
}

export function letter(index: number): string {
  return String.fromCharCode(97 + index);
}

export function distance3d(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  return Math.hypot(x1 - x2, y1 - y2, z1 - z2);
}

export function polarToXY(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius };
}

export function isRadialFamily(family: string): boolean {
  return family === 'delta' || family === 'rotary_delta' || family === 'polar';
}
