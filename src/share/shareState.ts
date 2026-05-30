import { deflateRaw, inflateRaw } from 'pako';
import { createDefaultState, commonDefaults, specificDefaults } from '../kinematics/defaults';
import {
  cloneNestedStringRecord,
  cloneStringArrayRecord,
  normalizeCarriages,
  normalizeGenericSteppers,
  normalizeMacros,
  normalizeNestedStringRecord,
  normalizeScrews,
  normalizeStringArrayRecord,
  normalizeWinches,
  resolveDefaultToolhead
} from '../kinematics/stateNormalization';
import { simulateMacro } from '../macros/simulator';
import type { AppState, Carriage, FieldValue, GenericStepper, MacroDefinition, Screw, Winch } from '../kinematics/types';

export const SHARE_SCHEMA_VERSION = 1;
export const SHARE_URL_WARNING_LENGTH = 6000;

export interface PortableShareState {
  schemaVersion: 1;
  values: Record<string, FieldValue>;
  screws: Screw[];
  winches: Winch[];
  carriages: Carriage[];
  genericSteppers: GenericStepper[];
  macros: MacroDefinition[];
  activeMacroId: string;
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
    unmanagedConfigText: String(state.ui.unmanagedConfigText || ''),
    configLineOverrides: cloneNestedStringRecord(state.ui.configLineOverrides),
    configExtraLines: cloneStringArrayRecord(state.ui.configExtraLines)
  };
}

export function applyPortableShareState(portable: PortableShareState, state: AppState): void {
  assertPortableShareState(portable);
  const defaults = createDefaultState();
  const values = { ...commonDefaults, ...specificDefaults, ...portable.values };
  const toolhead = resolveDefaultToolhead(values);
  const macros = normalizeMacros(portable.macros, toolhead, defaults.macros);
  const activeMacroId = portable.activeMacroId && macros.some((macro) => macro.id === portable.activeMacroId) ? portable.activeMacroId : macros[0]?.id ?? '';

  state.values = values;
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

export function encodeShareState(state: AppState | PortableShareState): string {
  const json = JSON.stringify(isPortableShareState(state) ? state : createPortableShareState(state));
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

function isPortableShareState(value: AppState | PortableShareState): value is PortableShareState {
  return 'schemaVersion' in value && value.schemaVersion === SHARE_SCHEMA_VERSION;
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
