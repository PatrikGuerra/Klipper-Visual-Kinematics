import { dimensionLayerIds } from '../kinematics/dimensionLayers';
import type { AppState, FieldValue } from '../kinematics/types';

export interface ViewerSnapshot {
  values: [string, FieldValue][];
  screws: unknown[];
  winches: unknown[];
  carriages: unknown[];
  genericSteppers: unknown[];
  toolhead: { x: number; y: number; z: number };
  ui: {
    zoom: number;
    panX: number;
    panY: number;
    testMode: boolean;
    dimensionMenuOpen: boolean;
    dimensionLayers: [string, boolean][];
  };
  macroPreview: unknown;
  macroRun: {
    stepIndex: number;
    segmentProgress: number;
  };
}

export function viewerSnapshot(state: AppState): ViewerSnapshot {
  return {
    values: Object.keys(state.values)
      .sort()
      .map((key) => [key, state.values[key]]),
    screws: state.screws.map((screw) => ({ x: screw.x, y: screw.y, name: screw.name })),
    winches: state.winches.map((winch) => ({ name: winch.name, x: winch.x, y: winch.y, z: winch.z, rotation_distance: winch.rotation_distance })),
    carriages: state.carriages.map((carriage) => ({ name: carriage.name, axis: carriage.axis, min: carriage.min, max: carriage.max, endstop: carriage.endstop })),
    genericSteppers: state.genericSteppers.map((stepper) => ({ name: stepper.name, carriages: stepper.carriages, equation: stepper.equation })),
    toolhead: { x: state.toolhead.x, y: state.toolhead.y, z: state.toolhead.z },
    ui: {
      zoom: state.ui.zoom,
      panX: state.ui.panX,
      panY: state.ui.panY,
      testMode: state.ui.testMode,
      dimensionMenuOpen: state.ui.dimensionMenuOpen,
      dimensionLayers: dimensionLayerIds.map((id) => [id, state.ui.dimensionLayers[id]])
    },
    macroPreview: {
      macroId: state.macroPreview.macroId,
      partial: state.macroPreview.partial,
      start: state.macroPreview.start,
      finalToolhead: state.macroPreview.finalToolhead,
      segments: state.macroPreview.segments.map((segment) => ({
        type: segment.type,
        command: segment.command,
        lineNumber: segment.lineNumber,
        from: segment.from,
        to: segment.to,
        fromE: segment.fromE,
        toE: segment.toE,
        extrusionDelta: segment.extrusionDelta,
        feedrate: segment.feedrate,
        durationMs: segment.durationMs,
        simulated: segment.simulated,
        outOfBounds: segment.outOfBounds,
        message: segment.message
      }))
    },
    macroRun: {
      stepIndex: state.macroRun.stepIndex,
      segmentProgress: state.macroRun.segmentProgress
    }
  };
}
