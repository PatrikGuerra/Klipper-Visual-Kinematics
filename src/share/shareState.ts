import { deflateRaw, inflateRaw } from 'pako';
import { createDefaultState, commonDefaults, specificDefaults } from '../kinematics/defaults';
import { simulateMacro } from '../macros/simulator';
import type { AppState, Carriage, FieldValue, GenericStepper, MacroDefinition, Screw, Toolhead, Winch } from '../kinematics/types';

export const SHARE_SCHEMA_VERSION = 1;

export interface PortableShareState {
  schemaVersion: 1;
  values: Record<string, FieldValue>;
  screws: Screw[];
  winches: Winch[];
  carriages: Carriage[];
  genericSteppers: GenericStepper[];
  macros: MacroDefinition[];
  activeMacroId: string;
  toolhead: Toolhead;
  unmanagedConfigText: string;
  configLineOverrides: Record<string, Record<string, string>>;
  configExtraLines: Record<string, string[]>;
}

export function createPortableShareState(state: AppState): PortableShareState {
  return {
    schemaVersion: SHARE_SCHEMA_VERSION,
    values: { ...state.values },
    screws: state.screws.map((screw) => ({ ...screw })),
    winches: state.winches.map((winch) => ({ ...winch })),
    carriages: state.carriages.map((carriage) => ({ ...carriage })),
    genericSteppers: state.genericSteppers.map((stepper) => ({ ...stepper })),
    macros: state.macros.map((macro) => ({ ...macro, simulationStart: { ...macro.simulationStart } })),
    activeMacroId: state.activeMacroId,
    toolhead: { ...state.toolhead },
    unmanagedConfigText: String(state.ui.unmanagedConfigText || ''),
    configLineOverrides: cloneNestedStringRecord(state.ui.configLineOverrides),
    configExtraLines: cloneStringArrayRecord(state.ui.configExtraLines)
  };
}

export function applyPortableShareState(portable: PortableShareState, state: AppState): void {
  assertPortableShareState(portable);
  const defaults = createDefaultState();
  const toolhead = normalizeToolhead(portable.toolhead, defaults.toolhead);
  const macros = normalizeMacros(portable.macros, toolhead, defaults.macros);
  const activeMacroId = portable.activeMacroId && macros.some((macro) => macro.id === portable.activeMacroId) ? portable.activeMacroId : macros[0]?.id ?? '';

  state.values = { ...commonDefaults, ...specificDefaults, ...portable.values };
  state.screws = normalizeScrews(portable.screws, defaults.screws);
  state.winches = normalizeWinches(portable.winches, defaults.winches);
  state.carriages = normalizeCarriages(portable.carriages, defaults.carriages);
  state.genericSteppers = normalizeGenericSteppers(portable.genericSteppers, defaults.genericSteppers);
  state.macros = macros;
  state.activeMacroId = activeMacroId;
  state.toolhead = toolhead;
  state.macroRun = { ...defaults.macroRun };
  state.macroPreview = activeMacroId ? simulateMacro(macros.find((macro) => macro.id === activeMacroId) ?? macros[0], state) : defaults.macroPreview;
  state.ui = {
    ...state.ui,
    printerCfgModalOpen: false,
    printerCfgDraft: '',
    printerCfgDirty: false,
    printerCfgDiagnostics: [],
    unmanagedConfigText: String(portable.unmanagedConfigText || ''),
    configLineOverrides: normalizeNestedStringRecord(portable.configLineOverrides),
    configExtraLines: normalizeStringArrayRecord(portable.configExtraLines)
  };
}

export function encodeShareState(state: AppState): string {
  const json = JSON.stringify(createPortableShareState(state));
  return bytesToBase64Url(deflateRaw(new TextEncoder().encode(json)));
}

export function decodeShareState(payload: string): PortableShareState {
  try {
    const bytes = base64UrlToBytes(payload.trim());
    const json = new TextDecoder().decode(inflateRaw(bytes));
    const parsed = JSON.parse(json) as unknown;
    assertPortableShareState(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported share schema')) throw error;
    throw new Error('Invalid share URL payload.');
  }
}

export function readShareHash(): string | null {
  if (typeof window === 'undefined') return null;
  return extractSharePayload(window.location.hash);
}

export function writeShareHash(payload: string): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  params.set('s', payload);
  const nextUrl = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  window.history.replaceState(null, '', nextUrl);
}

export function createShareUrl(payload: string): string {
  if (typeof window === 'undefined') return `#s=${payload}`;
  const url = new URL(window.location.href);
  url.hash = `s=${payload}`;
  return url.toString();
}

export function extractSharePayload(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  try {
    const maybeUrl = text.startsWith('http://') || text.startsWith('https://') ? new URL(text) : null;
    if (maybeUrl) return extractSharePayload(maybeUrl.hash);
  } catch {
    return null;
  }
  const hash = text.startsWith('#') ? text.slice(1) : text;
  if (hash.startsWith('s=')) return new URLSearchParams(hash).get('s');
  if (hash.includes('&s=')) return new URLSearchParams(hash).get('s');
  return /^[A-Za-z0-9_-]+$/.test(hash) ? hash : null;
}

function assertPortableShareState(value: unknown): asserts value is PortableShareState {
  if (!value || typeof value !== 'object') throw new Error('Invalid share URL payload.');
  const candidate = value as Partial<PortableShareState> & { schemaVersion?: unknown };
  if (candidate.schemaVersion !== SHARE_SCHEMA_VERSION) throw new Error(`Unsupported share schema version "${String(candidate.schemaVersion)}".`);
  if (!candidate.values || typeof candidate.values !== 'object') throw new Error('Invalid share URL payload.');
}

function normalizeToolhead(value: unknown, fallback: Toolhead): Toolhead {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<Toolhead>;
  return {
    x: finiteNumber(candidate.x, fallback.x),
    y: finiteNumber(candidate.y, fallback.y),
    z: finiteNumber(candidate.z, fallback.z)
  };
}

function normalizeScrews(items: unknown, fallback: Screw[]): Screw[] {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .filter((item): item is Partial<Screw> => !!item && typeof item === 'object')
    .map((item, index) => ({
      x: finiteNumber(item.x, 0),
      y: finiteNumber(item.y, 0),
      name: typeof item.name === 'string' && item.name ? item.name : `Screw ${index + 1}`
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeWinches(items: unknown, fallback: Winch[]): Winch[] {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .filter((item): item is Partial<Winch> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : String.fromCharCode(65 + index),
      x: finiteNumber(item.x, 0),
      y: finiteNumber(item.y, 0),
      z: finiteNumber(item.z, 0),
      rotation_distance: finiteNumber(item.rotation_distance, 40)
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeCarriages(items: unknown, fallback: Carriage[]): Carriage[] {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .filter((item): item is Partial<Carriage> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : `carriage_${index + 1}`,
      axis: typeof item.axis === 'string' && item.axis ? item.axis : 'x',
      min: finiteNumber(item.min, 0),
      max: finiteNumber(item.max, 100),
      endstop: finiteNumber(item.endstop, 0)
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeGenericSteppers(items: unknown, fallback: GenericStepper[]): GenericStepper[] {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .filter((item): item is Partial<GenericStepper> => !!item && typeof item === 'object')
    .map((item, index) => ({
      name: typeof item.name === 'string' && item.name ? item.name : `stepper s${index}`,
      carriages: typeof item.carriages === 'string' ? item.carriages : 'carriage_x',
      equation: typeof item.equation === 'string' ? item.equation : 'x'
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeMacros(items: unknown, toolhead: Toolhead, fallback: MacroDefinition[]): MacroDefinition[] {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .filter((item): item is Partial<MacroDefinition> => !!item && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `macro-${index + 1}`,
      name: typeof item.name === 'string' && item.name ? item.name : `CUSTOM_MACRO_${index + 1}`,
      description: typeof item.description === 'string' ? item.description : '',
      gcode: typeof item.gcode === 'string' ? item.gcode : '',
      paramsText: typeof item.paramsText === 'string' ? item.paramsText : '',
      simulationStartMode: item.simulationStartMode === 'manual' ? 'manual' as const : 'current' as const,
      simulationStart: normalizeToolhead(item.simulationStart, toolhead)
    }));
  return normalized.length ? normalized : fallback;
}

function normalizeNestedStringRecord(value: unknown): Record<string, Record<string, string>> {
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

function normalizeStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string[]>>((sections, [section, lines]) => {
    if (!Array.isArray(lines)) return sections;
    const normalizedLines = lines.filter((line): line is string => typeof line === 'string');
    if (normalizedLines.length) sections[section.toLowerCase()] = normalizedLines;
    return sections;
  }, {});
}

function cloneNestedStringRecord(value: Record<string, Record<string, string>>): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(value ?? {}).map(([section, entries]) => [section, { ...entries }]));
}

function cloneStringArrayRecord(value: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(value ?? {}).map(([section, lines]) => [section, [...lines]]));
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
