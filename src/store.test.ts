import { beforeEach, describe, expect, it } from 'vitest';
import { areDimensionLayersActive, createDefaultDimensionLayers } from './kinematics/dimensionLayers';
import { createDefaultState } from './kinematics/defaults';
import { appState, mergeStoredState, patchUi, resetState, resizeDockPanel, setToolhead, setValue, toggleDockPanel, updateActiveMacro, updateMutable } from './store';

describe('solid app store actions', () => {
  beforeEach(() => {
    resetState();
  });

  it('setValue updates values and resets the toolhead for kinematic changes', () => {
    setValue('max_velocity', 321);
    expect(appState.values.max_velocity).toBe(321);

    setValue('kinematics', 'delta');
    expect(appState.values.kinematics).toBe('delta');
    expect(appState.toolhead).toMatchObject({ x: 0, y: 0 });
  });

  it('patchUi preserves existing UI fields', () => {
    const originalZoom = appState.ui.zoom;
    patchUi({ panX: 42 });

    expect(appState.ui.panX).toBe(42);
    expect(appState.ui.zoom).toBe(originalZoom);
  });

  it('updateActiveMacro recalculates preview when requested', () => {
    updateActiveMacro((macro) => {
      macro.gcode = 'G90\nG0 X10 Y20 Z5 F6000';
    });

    expect(appState.macroPreview.segments.some((segment) => segment.command.includes('G0 X10'))).toBe(true);
    expect(appState.macroPreview.finalToolhead).toMatchObject({ x: 10, y: 20, z: 5 });
  });

  it('keeps current-toolhead macro previews anchored to the moved toolhead', () => {
    updateActiveMacro((macro) => {
      macro.simulationStartMode = 'current';
      macro.gcode = 'G91\nG0 X5 Y-2 Z1 F6000';
    });

    setToolhead(42, 55, 12);

    expect(appState.macroPreview.start).toMatchObject({ x: 42, y: 55, z: 12 });
    expect(appState.macroPreview.finalToolhead).toMatchObject({ x: 47, y: 53, z: 13 });
  });

  it('defaults side view and dimension layer state', () => {
    const state = createDefaultState();

    expect('sideViewEnabled' in state.ui).toBe(false);
    expect(areDimensionLayersActive(state.ui.dimensionLayers)).toBe(false);
  });

  it('defaults dock panel state', () => {
    const state = createDefaultState();

    expect(state.ui.dockPanels.kinematics).toEqual({ collapsed: false, width: 360 });
    expect(state.ui.dockPanels.macros).toEqual({ collapsed: false, width: 430 });
    expect(state.ui.dockPanels.printerCfg).toEqual({ collapsed: false, width: 240 });
  });

  it('resets legacy panel layout while loading stored state', () => {
    const state = mergeStoredState({
      values: { kinematics: 'cartesian' },
      ui: {
        kinematicsPanelCollapsed: true,
        kinematicsPanelWidth: 700,
        macrosPanelCollapsed: true,
        macrosPanelWidth: 800,
        printerCfgPanelCollapsed: true,
        printerCfgPanelWidth: 400
      }
    });

    expect(state.ui.dockPanels).toEqual(createDefaultState().ui.dockPanels);
    expect('kinematicsPanelCollapsed' in (state.ui as unknown as Record<string, unknown>)).toBe(false);
    expect('macrosPanelWidth' in (state.ui as unknown as Record<string, unknown>)).toBe(false);
  });

  it('migrates legacy showDimensions into the matching dimension layers', () => {
    const state = mergeStoredState({
      values: { kinematics: 'cartesian' },
      ui: { showDimensions: true, sideViewAxis: 'y' }
    });

    expect(state.ui.dimensionLayers.bedPhysicalSize).toBe(true);
    expect(state.ui.dimensionLayers.usableBed).toBe(true);
    expect(state.ui.dimensionLayers.usableBedOffset).toBe(true);
    expect(state.ui.dimensionLayers.travelLimits).toBe(false);
    expect('showDimensions' in state.ui).toBe(false);
    expect('sideViewAxis' in state.ui).toBe(false);
  });

  it('ignores legacy side view visibility while loading stored state', () => {
    const state = mergeStoredState({
      values: { kinematics: 'cartesian' },
      ui: { sideViewEnabled: false }
    });

    expect('sideViewEnabled' in state.ui).toBe(false);
  });

  it('detects active dimension layers', () => {
    const layers = createDefaultDimensionLayers();
    expect(areDimensionLayersActive(layers)).toBe(false);

    layers.probeOffset = true;
    expect(areDimensionLayersActive(layers)).toBe(true);
  });

  it('toggles and resizes dock panels independently', () => {
    toggleDockPanel('kinematics');
    expect(appState.ui.dockPanels.kinematics.collapsed).toBe(true);
    expect(appState.ui.dockPanels.macros.collapsed).toBe(false);

    resizeDockPanel('kinematics', 9999);
    expect(appState.ui.dockPanels.kinematics).toEqual({ collapsed: false, width: 760 });
  });

  it('stops macro playback when the macro dock panel collapses', () => {
    updateMutable((state) => {
      state.macroRun.playing = true;
    });

    toggleDockPanel('macros');

    expect(appState.ui.dockPanels.macros.collapsed).toBe(true);
    expect(appState.macroRun.playing).toBe(false);
  });

  it('ignores legacy macro enabled flags while loading stored state', () => {
    const state = mergeStoredState({
      values: { kinematics: 'cartesian' },
      macros: [
        {
          id: 'legacy-disabled',
          name: 'LEGACY_DISABLED',
          description: '',
          enabled: false,
          gcode: 'G90',
          paramsText: '',
          simulationStartMode: 'current',
          simulationStart: { x: 1, y: 2, z: 3 }
        }
      ],
      activeMacroId: 'legacy-disabled'
    });

    expect(state.macros[0].name).toBe('LEGACY_DISABLED');
    expect('enabled' in state.macros[0]).toBe(false);
  });
});
