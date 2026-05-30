import { createEffect, onCleanup } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import { createDefaultState, specificDefaults, commonDefaults } from './kinematics/defaults';
import { normalizeDimensionLayers } from './kinematics/dimensionLayers';
import {
  normalizeCarriages,
  normalizeGenericSteppers,
  normalizeMacros,
  normalizeNestedStringRecord,
  normalizeScrews,
  normalizeStringArrayRecord,
  normalizeToolhead,
  normalizeWinches,
  resolveDefaultToolhead
} from './kinematics/stateNormalization';
import { simulateMacro } from './macros/simulator';
import { applyPortableShareState, createPortableShareState, decodeShareState, encodeShareState, readShareHash, writeShareHash } from './share/shareState';
import type { AppState, FieldValue, MacroDefinition } from './kinematics/types';

const STORAGE_KEY = 'klipper-visual-kinematics-solid-v1';
const LEGACY_KEYS = ['klipper-visual-kinematics-svelte-v1', 'klipper-visual-kinematics-v1'];

function normalizeValue(value: FieldValue | string): FieldValue {
  if (value === '') return '';
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return value;
}

function resetToolheadForKinematic(state: AppState): AppState {
  state.toolhead = resolveDefaultToolhead(state.values);
  return state;
}

export function mergeStoredState(raw: unknown): AppState {
  const defaults = createDefaultState();
  if (!raw || typeof raw !== 'object') return defaults;
  const candidate = raw as Partial<AppState>;
  if (!candidate.values || typeof candidate.values !== 'object') return defaults;
  const values = { ...commonDefaults, ...specificDefaults, ...candidate.values };
  const toolhead = normalizeToolhead(candidate.toolhead, resolveDefaultToolhead(values));
  const macros = normalizeMacros(candidate.macros, toolhead, defaults.macros);
  const activeMacroId = candidate.activeMacroId && macros.some((macro) => macro.id === candidate.activeMacroId) ? candidate.activeMacroId : macros[0]?.id ?? '';
  const candidateUi = candidate.ui && typeof candidate.ui === 'object' ? candidate.ui as Partial<AppState['ui']> & { showDimensions?: unknown; sideViewAxis?: unknown; sideViewEnabled?: unknown } : {};
  const { showDimensions: legacyShowDimensions, sideViewAxis: _legacySideViewAxis, sideViewEnabled: _legacySideViewEnabled, ...storedUi } = candidateUi;
  const merged: AppState = {
    ...defaults,
    ...candidate,
    values,
    ui: {
      ...defaults.ui,
      ...storedUi,
      dimensionMenuOpen: false,
      dimensionLayers: normalizeDimensionLayers(storedUi.dimensionLayers, legacyShowDimensions === true),
      configLineOverrides: normalizeNestedStringRecord(storedUi.configLineOverrides),
      configExtraLines: normalizeStringArrayRecord(storedUi.configExtraLines)
    },
    toolhead,
    screws: normalizeScrews(candidate.screws, defaults.screws),
    winches: normalizeWinches(candidate.winches, defaults.winches),
    carriages: normalizeCarriages(candidate.carriages, defaults.carriages),
    genericSteppers: normalizeGenericSteppers(candidate.genericSteppers, defaults.genericSteppers),
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

function refreshCurrentMacroPreview(state: AppState): void {
  if (state.macroRun.playing) return;
  const macro = state.macros.find((item) => item.id === state.activeMacroId);
  if (!macro || macro.simulationStartMode !== 'current') return;
  state.macroPreview = simulateMacro(macro, state);
  state.macroRun = { ...state.macroRun, stepIndex: -1, segmentProgress: 0 };
}

function loadStoredState(): AppState {
  if (typeof localStorage === 'undefined') return createDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return createDefaultState();
    return mergeStoredState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function loadState(): AppState {
  const sharePayload = readShareHash();
  if (sharePayload) {
    const sharedState = createDefaultState();
    try {
      applyPortableShareState(decodeShareState(sharePayload), sharedState);
      return sharedState;
    } catch (error) {
      const fallback = loadStoredState();
      fallback.ui.printerCfgDiagnostics = [
        ...fallback.ui.printerCfgDiagnostics,
        { type: 'warning', message: error instanceof Error ? error.message : 'Invalid share URL payload.', field: 'share' }
      ];
      return fallback;
    }
  }
  return loadStoredState();
}

export const [appState, setAppState] = createStore<AppState>(loadState());

let storeTimer: number | undefined;
let shareTimer: number | undefined;

export function persistAppState(): void {
  createEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const serialized = JSON.stringify(appState);
    window.clearTimeout(storeTimer);
    storeTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, serialized);
    }, 120);
  });
  onCleanup(() => {
    if (typeof window !== 'undefined') window.clearTimeout(storeTimer);
  });
}

export function syncShareUrl(): void {
  createEffect(() => {
    if (typeof window === 'undefined') return;
    const portable = createPortableShareState(appState);
    window.clearTimeout(shareTimer);
    shareTimer = window.setTimeout(() => {
      writeShareHash(encodeShareState(portable));
    }, 450);
  });
  onCleanup(() => {
    if (typeof window !== 'undefined') window.clearTimeout(shareTimer);
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
