import { commonFieldGroups } from './fields';
import { kinematicById } from './catalog';
import { isFiniteNumber, isRadialFamily, num } from './math';
import { isOfficialScrewThread, screwThreadOptions } from './screwThreads';
import type { AppState, Diagnostic, KinematicDefinition } from './types';

export function validateState(state: AppState): Diagnostic[] {
  const v = state.values;
  const kin = kinematicById(v.kinematics);
  const items: Diagnostic[] = [];

  validateRequiredNumbers(items, state, kin);
  if (kin.status === 'work-in-progress') warn(items, `${kin.name} is marked as work in progress by Klipper; review generated config carefully.`);
  if (kin.status === 'experimental') warn(items, `${kin.name} support is experimental in Klipper; homing and bounds may require manual handling.`);

  if (num(v.x_min) >= num(v.x_max)) error(items, 'X min must be lower than X max.', 'x_min');
  if (num(v.y_min) >= num(v.y_max)) error(items, 'Y min must be lower than Y max.', 'y_min');
  if (num(v.z_min) >= num(v.z_max)) error(items, 'Z min must be lower than Z max.', 'z_min');
  if (num(v.bed_x) <= 0 || num(v.bed_y) <= 0) error(items, 'Bed dimensions must be positive.', 'bed_x');
  if (hasValue(v.minimum_cruise_ratio) && (num(v.minimum_cruise_ratio) < 0 || num(v.minimum_cruise_ratio) > 1)) {
    error(items, 'Minimum cruise ratio must be between 0 and 1.', 'minimum_cruise_ratio');
  }
  if (num(v.default_microsteps) <= 0) error(items, 'Default microsteps must be greater than zero.', 'default_microsteps');
  if (hasValue(v.default_full_steps_per_rotation) && num(v.default_full_steps_per_rotation) <= 0) {
    error(items, 'Full steps per rotation must be greater than zero.', 'default_full_steps_per_rotation');
  }
  if (num(v.default_homing_retract_dist) < 0) error(items, 'Homing retract distance cannot be negative.', 'default_homing_retract_dist');
  if (v.extruderEnabled) validateExtruder(items, state);

  if (kin.supportsProbeFeatures && v.probeFeaturesEnabled) validateProbeFeatures(items, state, kin);
  if (kin.family === 'delta') validateDelta(items, state);
  if (kin.family === 'rotary_delta') validateRotaryDelta(items, state);
  if (kin.family === 'polar') validatePolar(items, state);
  if (kin.family === 'winch') validateWinch(items, state);
  if (kin.family === 'generic_cartesian') validateGenericCartesian(items, state);

  if (!items.length) info(items, 'No validation issues found for the current values.');
  return items;
}

function validateProbeFeatures(items: Diagnostic[], state: AppState, kin: KinematicDefinition): void {
  const v = state.values;
  const safeX = safeHomeX(v, kin);
  const safeY = safeHomeY(v, kin);
  const probeX = safeX + num(v.probe_x_offset);
  const probeY = safeY + num(v.probe_y_offset);

  if (!inTravel(safeX, safeY, v, kin)) error(items, 'Safe Z home nozzle position is outside nozzle travel.', 'probe_x_offset');
  if (!onBed(probeX, probeY, v, kin)) error(items, 'Safe Z home probe landing point is outside the printable bed.', 'probe_x_offset');

  if (num(v.mesh_xmin) >= num(v.mesh_xmax) || num(v.mesh_ymin) >= num(v.mesh_ymax)) {
    error(items, 'Mesh min values must be lower than mesh max values.', 'mesh_xmin');
  }
  if (!onBed(num(v.mesh_xmin), num(v.mesh_ymin), v, kin) || !onBed(num(v.mesh_xmax), num(v.mesh_ymax), v, kin)) {
    warn(items, 'Mesh corners are outside the selected bed shape.', 'mesh_xmin');
  }
  const meshNozzleMinX = num(v.mesh_xmin) - num(v.probe_x_offset);
  const meshNozzleMaxX = num(v.mesh_xmax) - num(v.probe_x_offset);
  const meshNozzleMinY = num(v.mesh_ymin) - num(v.probe_y_offset);
  const meshNozzleMaxY = num(v.mesh_ymax) - num(v.probe_y_offset);
  if (!inRect(meshNozzleMinX, meshNozzleMinY, v) || !inRect(meshNozzleMaxX, meshNozzleMaxY, v)) {
    warn(items, 'Some mesh points require nozzle positions outside travel because of probe offset.', 'mesh_xmin');
  }
  if (v.screwsEnabled) {
    if (hasValue(v.screw_thread) && !isOfficialScrewThread(v.screw_thread)) {
      warn(items, `Screw thread "${v.screw_thread}" is not one of Klipper's official values: ${screwThreadOptions.join(', ')}.`, 'screw_thread');
    }
    state.screws.forEach((s, index) => {
      if (!inRect(s.x - num(v.probe_x_offset), s.y - num(v.probe_y_offset), v)) {
        warn(items, `Screw ${index + 1} is not reachable by the probe within nozzle travel.`, 'probe_x_offset');
      }
    });
  }
}

function validateDelta(items: Diagnostic[], state: AppState): void {
  const v = state.values;
  if (num(v.print_radius) > num(v.delta_radius)) warn(items, 'Print radius is larger than delta radius.', 'print_radius');
  if (num(v.arm_length) <= num(v.delta_radius)) error(items, 'Delta arm length should be greater than delta radius.', 'arm_length');
  if (Math.hypot(state.toolhead.x, state.toolhead.y) > num(v.print_radius)) {
    warn(items, 'Current toolhead position is outside delta print radius.', 'print_radius');
  }
}

function validateRotaryDelta(items: Diagnostic[], state: AppState): void {
  const v = state.values;
  if (num(v.lower_arm_length) <= num(v.shoulder_radius) / 2) {
    error(items, 'Rotary delta lower arm length is too short for the shoulder radius.', 'lower_arm_length');
  }
  if (Math.hypot(state.toolhead.x, state.toolhead.y) > num(v.rotary_print_radius)) {
    warn(items, 'Current toolhead position is outside rotary delta print radius.', 'rotary_print_radius');
  }
}

function validatePolar(items: Diagnostic[], state: AppState): void {
  const r = Math.hypot(state.toolhead.x, state.toolhead.y);
  if (r < 2) warn(items, 'Polar moves near X0 Y0 are problematic; avoid the exact center.', 'polar_radius');
  if (r > num(state.values.polar_radius)) warn(items, 'Current toolhead radius exceeds polar arm radius.', 'polar_radius');
}

function validateWinch(items: Diagnostic[], state: AppState): void {
  if (state.winches.length < 3) error(items, 'Cable winch kinematics requires at least 3 winches.');
  state.winches.forEach((w, index) => {
    if (w.rotation_distance <= 0) error(items, `Winch ${String.fromCharCode(65 + index)} rotation distance must be positive.`);
  });
}

function validateGenericCartesian(items: Diagnostic[], state: AppState): void {
  const axes: Record<string, boolean> = {};
  state.carriages.forEach((c) => {
    axes[c.axis.toLowerCase()] = true;
    if (c.min >= c.max) error(items, `${c.name} min must be lower than max.`);
  });
  ['x', 'y', 'z'].forEach((axis) => {
    if (!axes[axis]) error(items, `Generic Cartesian requires a primary ${axis.toUpperCase()} carriage.`);
  });
  if (!state.genericSteppers.length) error(items, 'Generic Cartesian requires at least one stepper.');
}

function validateExtruder(items: Diagnostic[], state: AppState): void {
  const v = state.values;
  if (num(v.extruder_microsteps) <= 0) error(items, 'Extruder microsteps must be greater than zero.', 'extruder_microsteps');
  if (hasValue(v.extruder_full_steps_per_rotation) && num(v.extruder_full_steps_per_rotation) <= 0) {
    error(items, 'Extruder full steps per rotation must be greater than zero.', 'extruder_full_steps_per_rotation');
  }
  if (num(v.nozzle_diameter) <= 0) error(items, 'Nozzle diameter must be greater than zero.', 'nozzle_diameter');
  if (num(v.filament_diameter) <= 0) error(items, 'Filament diameter must be greater than zero.', 'filament_diameter');
  if (num(v.max_extrude_only_distance) <= 0) error(items, 'Max extrude only distance must be greater than zero.', 'max_extrude_only_distance');
  if (num(v.extruder_min_temp) >= num(v.extruder_max_temp)) error(items, 'Extruder min temp must be lower than max temp.', 'extruder_min_temp');
}

function validateRequiredNumbers(items: Diagnostic[], state: AppState, kin: KinematicDefinition): void {
  let fields = [
    'max_velocity',
    'max_accel',
    'max_z_velocity',
    'max_z_accel',
    'square_corner_velocity',
    'bed_x',
    'bed_y',
    'bed_x_offset',
    'bed_y_offset',
    'bed_z',
    'x_min',
    'x_max',
    'y_min',
    'y_max',
    'z_min',
    'z_max',
    'home_x',
    'home_y',
    'home_z',
    'homing_speed_x',
    'homing_speed_y',
    'homing_speed_z',
    'second_homing_speed',
    'default_microsteps',
    'default_homing_retract_dist'
  ];
  if (kin.supportsProbeFeatures && state.values.probeFeaturesEnabled) {
    fields = fields.concat(commonFieldGroups.probe.filter((f) => f.type === 'number').map((f) => f.id));
  }
  if (state.values.extruderEnabled) {
    fields = fields.concat(commonFieldGroups.extruder.filter((f) => f.type === 'number').map((f) => f.id));
  }
  fields = fields.concat(kin.fields.filter((f) => f.type === 'number').map((f) => f.id));
  fields.forEach((field) => {
    if (!isFiniteNumber(state.values[field])) error(items, `${field} must be a valid number.`, field);
  });
}

export function safeHomeX(values: AppState['values'], kin: KinematicDefinition): number {
  return isRadialFamily(kin.family) ? -num(values.probe_x_offset) : num(values.bed_x_offset) + num(values.bed_x) / 2 - num(values.probe_x_offset);
}

export function safeHomeY(values: AppState['values'], kin: KinematicDefinition): number {
  return isRadialFamily(kin.family) ? -num(values.probe_y_offset) : num(values.bed_y_offset) + num(values.bed_y) / 2 - num(values.probe_y_offset);
}

function inRect(x: number, y: number, values: AppState['values']): boolean {
  return x >= num(values.x_min) && x <= num(values.x_max) && y >= num(values.y_min) && y <= num(values.y_max);
}

function inTravel(x: number, y: number, values: AppState['values'], kin: KinematicDefinition): boolean {
  if (isRadialFamily(kin.family)) {
    const radius = kin.family === 'polar' ? num(values.polar_radius) : kin.family === 'rotary_delta' ? num(values.rotary_print_radius) : num(values.print_radius);
    return Math.hypot(x, y) <= radius;
  }
  return inRect(x, y, values);
}

function onBed(x: number, y: number, values: AppState['values'], kin: KinematicDefinition): boolean {
  if (isRadialFamily(kin.family)) {
    const radius = kin.family === 'polar' ? num(values.polar_radius) : kin.family === 'rotary_delta' ? num(values.rotary_print_radius) : num(values.print_radius);
    return Math.hypot(x, y) <= radius;
  }
  const plateX = num(values.plate_x) || num(values.bed_x);
  const plateY = num(values.plate_y) || num(values.bed_y);
  const bedCenterX = num(values.bed_x_offset) + num(values.bed_x) / 2;
  const bedCenterY = num(values.bed_y_offset) + num(values.bed_y) / 2;
  const minX = bedCenterX - plateX / 2;
  const maxX = bedCenterX + plateX / 2;
  const minY = bedCenterY - plateY / 2;
  const maxY = bedCenterY + plateY / 2;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function error(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'error', message, field });
}

function warn(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'warning', message, field });
}

function info(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'info', message, field });
}

function hasValue(value: unknown): boolean {
  return value !== '' && value !== null && value !== undefined;
}
