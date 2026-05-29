import { createEffect } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import { createDefaultState, specificDefaults, commonDefaults } from './kinematics/defaults';
import { kinematicById } from './kinematics/catalog';
import { normalizeDimensionLayers } from './kinematics/dimensionLayers';
import { simulateMacro } from './macros/simulator';
import type { AppState, FieldValue, MacroDefinition, Toolhead } from './kinematics/types';

const STORAGE_KEY = 'klipper-visual-kinematics-solid-v1';
const LEGACY_KEYS = ['klipper-visual-kinematics-svelte-v1', 'klipper-visual-kinematics-v1'];

function normalizeValue(value: FieldValue | string): FieldValue {
  if (value === '') return '';
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

function resetToolheadForKinematic(state: AppState): AppState {
  const kin = kinematicById(state.values.kinematics);
  const zHop = Number(state.values.z_hop) || 15;
  if (kin.family === 'delta' || kin.family === 'rotary_delta' || kin.family === 'polar') {
    state.toolhead = { x: 0, y: 0, z: Math.max(5, zHop) };
    return state;
  }
  if (kin.family === 'none') {
    state.toolhead = { x: 0, y: 0, z: 0 };
    return state;
  }
  const xMin = Number(state.values.x_min) || 0;
  const xMax = Number(state.values.x_max) || Number(state.values.bed_x) || 250;
  const yMin = Number(state.values.y_min) || 0;
  const yMax = Number(state.values.y_max) || Number(state.values.bed_y) || 280;
  state.toolhead = {
    x: (xMin + xMax) / 2,
    y: (yMin + yMax) / 2,
    z: Math.max(5, zHop)
  };
  return state;
}

export function mergeStoredState(raw: unknown): AppState {
  const defaults = createDefaultState();
  if (!raw || typeof raw !== 'object') return defaults;
  const candidate = raw as Partial<AppState>;
  if (!candidate.values || typeof candidate.values !== 'object') return defaults;
  const toolhead = normalizeToolhead(candidate.toolhead, defaults.toolhead);
  const macros = Array.isArray(candidate.macros) ? normalizeMacros(candidate.macros, toolhead) : defaults.macros;
  const activeMacroId = candidate.activeMacroId && macros.some((macro) => macro.id === candidate.activeMacroId) ? candidate.activeMacroId : macros[0]?.id ?? '';
  const candidateUi = candidate.ui && typeof candidate.ui === 'object' ? candidate.ui as Partial<AppState['ui']> & { showDimensions?: unknown; sideViewAxis?: unknown } : {};
  const { showDimensions: legacyShowDimensions, sideViewAxis: _legacySideViewAxis, ...storedUi } = candidateUi;
  const merged: AppState = {
    ...defaults,
    ...candidate,
    values: { ...commonDefaults, ...specificDefaults, ...candidate.values },
    ui: {
      ...defaults.ui,
      ...storedUi,
      dimensionMenuOpen: false,
      dimensionLayers: normalizeDimensionLayers(storedUi.dimensionLayers, legacyShowDimensions === true),
      sideViewEnabled: typeof storedUi.sideViewEnabled === 'boolean' ? storedUi.sideViewEnabled : defaults.ui.sideViewEnabled
    },
    toolhead,
    screws: Array.isArray(candidate.screws) ? candidate.screws : defaults.screws,
    winches: Array.isArray(candidate.winches) ? candidate.winches : defaults.winches,
    carriages: Array.isArray(candidate.carriages) ? candidate.carriages : defaults.carriages,
    genericSteppers: Array.isArray(candidate.genericSteppers) ? candidate.genericSteppers : defaults.genericSteppers,
    macros,
    activeMacroId,
    macroPreview: defaults.macroPreview,
    macroRun: { ...defaults.macroRun, ...(candidate.macroRun ?? {}) }
  };
  const activeMacro = merged.macros.find((macro) => macro.id === activeMacroId);
  merged.macroPreview = activeMacro ? simulateMacro(activeMacro, merged) : defaults.macroPreview;
  if (!Number.isFinite(Number(merged.macroRun.segmentProgress))) merged.macroRun.segmentProgress = 0;
  return merged;
}

function normalizeToolhead(value: unknown, fallback: Toolhead): Toolhead {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<Toolhead>;
  return {
    x: Number.isFinite(Number(candidate.x)) ? Number(candidate.x) : fallback.x,
    y: Number.isFinite(Number(candidate.y)) ? Number(candidate.y) : fallback.y,
    z: Number.isFinite(Number(candidate.z)) ? Number(candidate.z) : fallback.z
  };
}

function normalizeMacros(macros: unknown[], toolhead: Toolhead): MacroDefinition[] {
  return macros
    .filter((macro): macro is Partial<MacroDefinition> => !!macro && typeof macro === 'object')
    .map((macro, index) => ({
      id: typeof macro.id === 'string' && macro.id ? macro.id : `macro-${index + 1}`,
      name: typeof macro.name === 'string' && macro.name ? macro.name : `CUSTOM_MACRO_${index + 1}`,
      description: typeof macro.description === 'string' ? macro.description : '',
      gcode: typeof macro.gcode === 'string' ? macro.gcode : '',
      paramsText: typeof macro.paramsText === 'string' ? macro.paramsText : '',
      simulationStartMode: macro.simulationStartMode === 'manual' ? 'manual' : 'current',
      simulationStart: normalizeToolhead(macro.simulationStart, toolhead)
    }));
}

function refreshCurrentMacroPreview(state: AppState): void {
  if (state.macroRun.playing) return;
  const macro = state.macros.find((item) => item.id === state.activeMacroId);
  if (!macro || macro.simulationStartMode !== 'current') return;
  state.macroPreview = simulateMacro(macro, state);
  state.macroRun = { ...state.macroRun, stepIndex: -1, segmentProgress: 0 };
}

function loadState(): AppState {
  if (typeof localStorage === 'undefined') return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return createDefaultState();
    return mergeStoredState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export const [appState, setAppState] = createStore<AppState>(loadState());

let storeTimer: number | undefined;

export function persistAppState(): void {
  createEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const serialized = JSON.stringify(appState);
    window.clearTimeout(storeTimer);
    storeTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, serialized);
    }, 120);
  });
}

export function setValue(id: string, value: FieldValue | string): void {
  setAppState(
    produce((state) => {
    state.values[id] = normalizeValue(value);
    if (id === 'kinematics') state = resetToolheadForKinematic(state);
    if (id === 'kinematics') refreshCurrentMacroPreview(state);
    })
  );
}

export function resetState(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }
  setAppState(reconcile(createDefaultState()));
}

export function setToolhead(x: number, y: number, z = appState.toolhead.z): void {
  setAppState(
    produce((state) => {
    state.toolhead = { x, y, z };
    refreshCurrentMacroPreview(state);
    })
  );
}

export function patchUi(patch: Partial<AppState['ui']>): void {
  setAppState(
    produce((state) => {
    state.ui = { ...state.ui, ...patch };
    })
  );
}

export function updateMutable(mutator: (state: AppState) => void): void {
  setAppState(
    produce((state) => {
    mutator(state);
    })
  );
}

export function updateActiveMacro(mutator: (macro: MacroDefinition) => void, refreshPreview = true): void {
  updateMutable((state) => {
    const macro = state.macros.find((item) => item.id === state.activeMacroId);
    if (!macro) return;
    mutator(macro);
    if (refreshPreview) {
      state.macroPreview = simulateMacro(macro, state);
      state.macroRun = { ...state.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    }
  });
}
