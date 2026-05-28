import { kinematicsCatalog } from './catalog';
import { createDefaultDimensionLayers } from './dimensionLayers';
import { createNozzleCleaningMacro } from '../macros/presets';
import { simulateMacro } from '../macros/simulator';
import type { AppState, FieldValue } from './types';

export const commonDefaults: Record<string, FieldValue> = {
  kinematics: 'cartesian',
  max_velocity: 200,
  max_accel: 1500,
  minimum_cruise_ratio: '',
  max_z_velocity: 20,
  max_z_accel: 50,
  square_corner_velocity: 3,
  x_min: 0,
  x_max: 250,
  y_min: 0,
  y_max: 280,
  z_min: -5,
  z_max: 346,
  bed_x: 250,
  bed_y: 280,
  bed_x_offset: 0,
  bed_y_offset: 0,
  bed_z: 346,
  plate_x: 300,
  plate_y: 300,
  home_x: 0,
  home_y: 0,
  home_z: 0,
  homing_speed_x: 30,
  homing_speed_y: 20,
  homing_speed_z: 5,
  second_homing_speed: 10,
  default_rotation_distance: '',
  default_microsteps: 16,
  default_full_steps_per_rotation: 200,
  default_gear_ratio: '',
  default_step_pulse_duration: '',
  default_homing_retract_dist: 5,
  default_homing_retract_speed: '',
  default_homing_positive_dir: '',
  extruderEnabled: false,
  extruder_rotation_distance: '',
  extruder_microsteps: 16,
  extruder_full_steps_per_rotation: 200,
  extruder_gear_ratio: '',
  nozzle_diameter: 0.4,
  filament_diameter: 1.75,
  max_extrude_only_distance: 100,
  extruder_min_temp: 0,
  extruder_max_temp: 300,
  z_hop: 15,
  probeFeaturesEnabled: true,
  probe_type: 'generic_probe',
  probe_deploy_pin: '',
  probe_pin: '',
  probe_x_offset: 29,
  probe_y_offset: -26,
  probe_z_offset: 0.53,
  probe_speed: 5,
  probe_samples: 3,
  probe_tolerance: 0.05,
  probe_retract: 8,
  probe_deploy_delay: 500,
  mesh_xmin: 29,
  mesh_xmax: 262,
  mesh_ymin: 5,
  mesh_ymax: 254,
  mesh_countx: 6,
  mesh_county: 6,
  mesh_speed: 120,
  mesh_hz: 5,
  screw_thread: 'CW-M4'
};

export const specificDefaults: Record<string, FieldValue> = kinematicsCatalog.reduce(
  (acc, kin) => ({ ...acc, ...kin.defaults }),
  {}
);

export function createDefaultState(): AppState {
  const baseState: AppState = {
    values: { ...commonDefaults, ...specificDefaults },
    screws: [
      { x: 30, y: 30, name: 'Front Left' },
      { x: 240, y: 30, name: 'Front Right' },
      { x: 240, y: 254, name: 'Rear Right' },
      { x: 30, y: 254, name: 'Rear Left' }
    ],
    winches: [
      { name: 'A', x: -140, y: -140, z: 360, rotation_distance: 40 },
      { name: 'B', x: 140, y: -140, z: 360, rotation_distance: 40 },
      { name: 'C', x: 140, y: 140, z: 360, rotation_distance: 40 },
      { name: 'D', x: -140, y: 140, z: 360, rotation_distance: 40 }
    ],
    carriages: [
      { name: 'carriage_x', axis: 'x', min: 0, max: 250, endstop: 0 },
      { name: 'carriage_y', axis: 'y', min: 0, max: 280, endstop: 0 },
      { name: 'carriage_z', axis: 'z', min: -5, max: 346, endstop: 0 }
    ],
    genericSteppers: [
      { name: 'stepper sx', carriages: 'carriage_x', equation: 'x' },
      { name: 'stepper sy', carriages: 'carriage_y', equation: 'y' },
      { name: 'stepper sz', carriages: 'carriage_z', equation: 'z' }
    ],
    macros: [],
    activeMacroId: '',
    macroPreview: {
      macroId: '',
      segments: [],
      diagnostics: [],
      partial: false,
      start: { x: 125, y: 140, z: 20 },
      finalToolhead: { x: 125, y: 140, z: 20 },
      finalExtruder: 0,
      totalExtrusion: 0
    },
    macroRun: {
      playing: false,
      stepIndex: -1,
      segmentProgress: 0,
      speed: 1,
      loopPreview: false
    },
    toolhead: { x: 125, y: 140, z: 20 },
    ui: {
      zoom: 1,
      panX: 0,
      panY: 0,
      testMode: false,
      dimensionMenuOpen: false,
      dimensionLayers: createDefaultDimensionLayers(),
      sideViewEnabled: true,
      outputCollapsed: false,
      macroOutputCollapsed: false,
      kinematicsPanelCollapsed: false,
      kinematicsPanelExpanded: false,
      kinematicsPanelWidth: 360,
      macrosPanelCollapsed: false,
      macrosPanelExpanded: false,
      macrosPanelWidth: 430,
      printerCfgPanelCollapsed: false,
      printerCfgPanelWidth: 240,
      printerCfgModalOpen: false,
      printerCfgDraft: '',
      printerCfgDirty: false,
      unmanagedConfigText: '',
      printerCfgDiagnostics: []
    }
  };
  const macro = createNozzleCleaningMacro(baseState);
  baseState.macros = [macro];
  baseState.activeMacroId = macro.id;
  baseState.macroPreview = simulateMacro(macro, baseState);
  return baseState;
}
