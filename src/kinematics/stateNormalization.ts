import { kinematicById } from './catalog';
import type { Carriage, FieldValue, GenericStepper, MacroDefinition, Screw, Toolhead, Winch } from './types';

export function resolveDefaultToolhead(values: Record<string, FieldValue>): Toolhead {
  const homeX = optionalNumber(values.home_x);
  const homeY = optionalNumber(values.home_y);
  const homeZ = optionalNumber(values.home_z);

  if (homeX !== null && homeY !== null && homeZ !== null) {
    return { x: homeX, y: homeY, z: homeZ };
  }

  const zHop = optionalNumber(values.z_hop);
  const z = zHop ?? homeZ ?? 10;
  const kin = kinematicById(values.kinematics);
  if (kin.family === 'delta' || kin.family === 'rotary_delta' || kin.family === 'polar') {
    return { x: 0, y: 0, z };
  }
  if (kin.family === 'none') {
    return { x: 0, y: 0, z: 0 };
  }

  const xMin = optionalNumber(values.x_min) ?? 0;
  const xMax = optionalNumber(values.x_max) ?? fallbackMax(values.bed_x_offset, values.bed_x, 250);
  const yMin = optionalNumber(values.y_min) ?? 0;
  const yMax = optionalNumber(values.y_max) ?? fallbackMax(values.bed_y_offset, values.bed_y, 280);

  return {
    x: (xMin + xMax) / 2,
    y: (yMin + yMax) / 2,
    z
  };
}

export function normalizeToolhead(value: unknown, fallback: Toolhead): Toolhead {
  if (!value || typeof value !== 'object') return { ...fallback };
  const candidate = value as Partial<Toolhead>;
  return {
    x: finiteNumber(candidate.x, fallback.x),
    y: finiteNumber(candidate.y, fallback.y),
    z: finiteNumber(candidate.z, fallback.z)
  };
}

export function normalizeScrews(items: unknown, fallback: Screw[]): Screw[] {
  if (!Array.isArray(items)) return cloneScrews(fallback);
  const normalized = items
    .filter((item): item is Partial<Screw> => !!item && typeof item === 'object')
    .map((item, index) => ({
      x: finiteNumber(item.x, 0),
      y: finiteNumber(item.y, 0),
      name: typeof item.name === 'string' && item.name ? item.name : `Screw ${index + 1}`
    }));
  return normalized.length ? normalized : cloneScrews(fallback);
}

export function normalizeWinches(items: unknown, fallback: Winch[]): Winch[] {
  if (!Array.isArray(items)) return cloneWinches(fallback);
  const normalized = items
    .filter((item): item is Partial<Winch> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : String.fromCharCode(65 + index),
      x: finiteNumber(item.x, 0),
      y: finiteNumber(item.y, 0),
      z: finiteNumber(item.z, 0),
      rotation_distance: finiteNumber(item.rotation_distance, 40)
    }));
  return normalized.length ? normalized : cloneWinches(fallback);
}

export function normalizeCarriages(items: unknown, fallback: Carriage[]): Carriage[] {
  if (!Array.isArray(items)) return cloneCarriages(fallback);
  const normalized = items
    .filter((item): item is Partial<Carriage> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : `carriage_${index + 1}`,
      axis: typeof item.axis === 'string' && item.axis ? item.axis : 'x',
      min: finiteNumber(item.min, 0),
      max: finiteNumber(item.max, 100),
      endstop: finiteNumber(item.endstop, 0)
    }));
  return normalized.length ? normalized : cloneCarriages(fallback);
}

export function normalizeGenericSteppers(items: unknown, fallback: GenericStepper[]): GenericStepper[] {
  if (!Array.isArray(items)) return cloneGenericSteppers(fallback);
  const normalized = items
    .filter((item): item is Partial<GenericStepper> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : `stepper s${index}`,
      carriages: typeof item.carriages === 'string' ? item.carriages : 'carriage_x',
      equation: typeof item.equation === 'string' ? item.equation : 'x'
    }));
  return normalized.length ? normalized : cloneGenericSteppers(fallback);
}

export function normalizeMacros(items: unknown, fallbackStart: Toolhead, fallback: MacroDefinition[] = []): MacroDefinition[] {
  if (!Array.isArray(items)) return cloneMacros(fallback);
  const normalized = items
    .filter((item): item is Partial<MacroDefinition> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `macro-${index + 1}`,
      name: typeof item.name === 'string' && item.name ? item.name : `CUSTOM_MACRO_${index + 1}`,
      description: typeof item.description === 'string' ? item.description : '',
      gcode: typeof item.gcode === 'string' ? item.gcode : '',
      paramsText: typeof item.paramsText === 'string' ? item.paramsText : '',
      simulationStartMode: item.simulationStartMode === 'manual' ? 'manual' as const : 'current' as const,
      simulationStart: normalizeToolhead(item.simulationStart, fallbackStart)
    }));
  return normalized.length ? normalized : cloneMacros(fallback);
}

export function normalizeNestedStringRecord(value: unknown): Record<string, Record<string, string>> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Record<string, string>>>((sections, [section, entries]) => {
    if (!entries || typeof entries !== 'object') return sections;
    const normalizedEntries = Object.entries(entries as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, rawLine]) => {
      if (typeof rawLine === 'string') acc[key.toLowerCase()] = rawLine;
      return acc;
    }, {});
    if (Object.keys(normalizedEntries).length) sections[section.toLowerCase()] = normalizedEntries;
    return sections;
  }, {});
}

export function normalizeStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string[]>>((sections, [section, lines]) => {
    if (!Array.isArray(lines)) return sections;
    const normalizedLines = lines.filter((line): line is string => typeof line === 'string');
    if (normalizedLines.length) sections[section.toLowerCase()] = normalizedLines;
    return sections;
  }, {});
}

export function cloneNestedStringRecord(value: Record<string, Record<string, string>> | undefined): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(value ?? {}).map(([section, entries]) => [section, { ...entries }]));
}

export function cloneStringArrayRecord(value: Record<string, string[]> | undefined): Record<string, string[]> {
  return Object.fromEntries(Object.entries(value ?? {}).map(([section, lines]) => [section, [...lines]]));
}

export function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fallbackMax(offsetValue: unknown, sizeValue: unknown, fallback: number): number {
  const offset = optionalNumber(offsetValue) ?? 0;
  const size = optionalNumber(sizeValue) ?? fallback;
  return offset + size;
}

function cloneScrews(items: Screw[]): Screw[] {
  return items.map((item) => ({ ...item }));
}

function cloneWinches(items: Winch[]): Winch[] {
  return items.map((item) => ({ ...item }));
}

function cloneCarriages(items: Carriage[]): Carriage[] {
  return items.map((item) => ({ ...item }));
}

function cloneGenericSteppers(items: GenericStepper[]): GenericStepper[] {
  return items.map((item) => ({ ...item }));
}

function cloneMacros(items: MacroDefinition[]): MacroDefinition[] {
  return items.map((item) => ({ ...item, simulationStart: { ...item.simulationStart } }));
}
