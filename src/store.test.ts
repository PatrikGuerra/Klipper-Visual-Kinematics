import { beforeEach, describe, expect, it } from 'vitest';
import { areDimensionLayersActive, createDefaultDimensionLayers } from './kinematics/dimensionLayers';
import { createDefaultState } from './kinematics/defaults';
import { appState, mergeStoredState, patchUi, resetState, setToolhead, setValue, updateActiveMacro } from './store';

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

    expect(state.ui.sideViewEnabled).toBe(true);
    expect(areDimensionLayersActive(state.ui.dimensionLayers)).toBe(false);
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

  it('detects active dimension layers', () => {
    const layers = createDefaultDimensionLayers();
    expect(areDimensionLayersActive(layers)).toBe(false);

    layers.probeOffset = true;
    expect(areDimensionLayersActive(layers)).toBe(true);
  });
});
