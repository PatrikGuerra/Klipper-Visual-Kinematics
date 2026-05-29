import { isKinematicId } from './catalog';
import { num } from './math';
import { createMacroId } from '../macros/presets';
import type { AppState, Diagnostic, FieldValue, MacroDefinition } from './types';

export interface ConfigApplyResult {
  diagnostics: Diagnostic[];
  unmanagedConfigText: string;
}

interface ParsedSection {
  name: string;
  lineNumber: number;
  rawLines: string[];
}

const knownRootSections = new Set([
  'printer',
  'stepper_x',
  'stepper_y',
  'stepper_z',
  'stepper_a',
  'stepper_b',
  'stepper_c',
  'stepper_left',
  'stepper_right',
  'stepper_bed',
  'stepper_arm',
  'extruder',
  'probe',
  'bed_mesh',
  'safe_z_home',
  'screws_tilt_adjust',
  'delta_calibrate'
]);

export function appendUnmanagedConfig(config: string, unmanagedConfigText: string): string {
  const unmanaged = unmanagedConfigText.trim();
  if (!unmanaged) return config;
  return `${config.trim()}\n\n# Unmanaged user config\n${unmanaged}\n`;
}

export function applyConfigTextToState(text: string, state: AppState): ConfigApplyResult {
  const diagnostics: Diagnostic[] = [];
  const sections = parseSections(text, diagnostics);
  const unmanaged: string[] = [];

  sections.forEach((section) => {
    const lower = section.name.toLowerCase();
    if (lower.startsWith('gcode_macro ')) {
      applyMacroSection(section, state, diagnostics);
      return;
    }
    if (!knownRootSections.has(lower)) {
      unmanaged.push(renderSection(section));
      warn(diagnostics, `Unsupported section [${section.name}] was preserved as unmanaged config.`, 'printer.cfg');
      return;
    }
    applyKnownSection(section, state, diagnostics);
  });

  return { diagnostics, unmanagedConfigText: unmanaged.join('\n\n') };
}

function parseSections(text: string, diagnostics: Diagnostic[]): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  text.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    const match = line.trim().match(/^\[([^\]]+)]$/);
    if (match) {
      current = { name: match[1].trim(), lineNumber: index + 1, rawLines: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      if (line.trim() && !line.trim().startsWith('#')) warn(diagnostics, `Line ${index + 1} is outside a section and was ignored.`, 'printer.cfg');
      return;
    }
    current.rawLines.push(line);
  });
  return sections;
}

function applyKnownSection(section: ParsedSection, state: AppState, diagnostics: Diagnostic[]): void {
  const entries = parseKeyValues(section, diagnostics);
  const name = section.name.toLowerCase();
  if (name === 'printer') {
    applyPrinter(entries, state, diagnostics);
    return;
  }
  if (name.startsWith('stepper_')) {
    applyStepper(name, entries, state, diagnostics);
    return;
  }
  if (name === 'extruder') {
    state.values.extruderEnabled = true;
    applyKnownValues(entries, state, diagnostics, {
      rotation_distance: 'extruder_rotation_distance',
      microsteps: 'extruder_microsteps',
      full_steps_per_rotation: 'extruder_full_steps_per_rotation',
      gear_ratio: 'extruder_gear_ratio',
      nozzle_diameter: 'nozzle_diameter',
      filament_diameter: 'filament_diameter',
      max_extrude_only_distance: 'max_extrude_only_distance',
      min_temp: 'extruder_min_temp',
      max_temp: 'extruder_max_temp'
    });
    return;
  }
  if (name === 'probe') {
    state.values.probeFeaturesEnabled = true;
    applyKnownValues(entries, state, diagnostics, {
      pin: 'probe_pin',
      x_offset: 'probe_x_offset',
      y_offset: 'probe_y_offset',
      z_offset: 'probe_z_offset',
      speed: 'probe_speed',
      samples: 'probe_samples',
      sample_retract_dist: 'probe_retract',
      samples_tolerance: 'probe_tolerance'
    });
    return;
  }
  if (name === 'bed_mesh') {
    state.values.probeFeaturesEnabled = true;
    applyKnownValues(entries, state, diagnostics, {
      speed: 'mesh_speed',
      horizontal_move_z: 'mesh_hz'
    });
    applyPair(entries.mesh_min, state.values, 'mesh_xmin', 'mesh_ymin');
    applyPair(entries.mesh_max, state.values, 'mesh_xmax', 'mesh_ymax');
    applyPair(entries.probe_count, state.values, 'mesh_countx', 'mesh_county');
    return;
  }
  if (name === 'safe_z_home') {
    state.values.probeFeaturesEnabled = true;
    applyPair(entries.home_xy_position, state.values, 'home_x', 'home_y');
    if (entries.z_hop !== undefined) state.values.z_hop = parseValue(entries.z_hop);
    return;
  }
  if (name === 'screws_tilt_adjust') {
    state.values.probeFeaturesEnabled = true;
    state.values.screwsEnabled = true;
    applyScrews(entries, state);
    return;
  }
  if (name === 'delta_calibrate') {
    applyKnownValues(entries, state, diagnostics, {
      radius: state.values.kinematics === 'rotary_delta' ? 'rotary_delta_calibrate_radius' : 'delta_calibrate_radius',
      speed: state.values.kinematics === 'rotary_delta' ? 'rotary_delta_calibrate_speed' : 'delta_calibrate_speed',
      horizontal_move_z: state.values.kinematics === 'rotary_delta' ? 'rotary_horizontal_move_z' : 'delta_horizontal_move_z'
    });
  }
}

function applyPrinter(entries: Record<string, string>, state: AppState, diagnostics: Diagnostic[]): void {
  applyPair(entries.visual_bed_offset, state.values, 'bed_x_offset', 'bed_y_offset');
  if (entries.kinematics !== undefined) {
    if (isKinematicId(entries.kinematics)) state.values.kinematics = entries.kinematics;
    else warn(diagnostics, `Unsupported kinematics "${entries.kinematics}" ignored.`, 'kinematics');
  }
  applyKnownValues(entries, state, diagnostics, {
    max_velocity: 'max_velocity',
    max_accel: 'max_accel',
    minimum_cruise_ratio: 'minimum_cruise_ratio',
    max_z_velocity: 'max_z_velocity',
    max_z_accel: 'max_z_accel',
    square_corner_velocity: 'square_corner_velocity',
    minimum_z_position: 'z_min',
    delta_radius: 'delta_radius',
    print_radius: 'print_radius',
    min_angle: 'min_angle',
    print_width: 'print_width',
    slow_ratio: 'slow_ratio',
    shoulder_radius: 'shoulder_radius',
    shoulder_height: 'shoulder_height',
    max_angular_velocity: 'max_angular_velocity'
  });
}

function applyStepper(name: string, entries: Record<string, string>, state: AppState, diagnostics: Diagnostic[]): void {
  applyKnownValues(entries, state, diagnostics, {
    rotation_distance: 'default_rotation_distance',
    microsteps: 'default_microsteps',
    full_steps_per_rotation: 'default_full_steps_per_rotation',
    gear_ratio: 'default_gear_ratio',
    step_pulse_duration: 'default_step_pulse_duration',
    homing_retract_dist: 'default_homing_retract_dist',
    homing_retract_speed: 'default_homing_retract_speed',
    homing_positive_dir: 'default_homing_positive_dir'
  });
  const axis = name.replace('stepper_', '');
  const axisMap: Record<string, { min: string; max: string; home: string; speed: string }> = {
    x: { min: 'x_min', max: 'x_max', home: 'home_x', speed: 'homing_speed_x' },
    y: { min: 'y_min', max: 'y_max', home: 'home_y', speed: 'homing_speed_y' },
    z: { min: 'z_min', max: 'z_max', home: 'home_z', speed: 'homing_speed_z' }
  };
  if (axisMap[axis]) {
    const map = axisMap[axis];
    if (entries.position_min !== undefined) state.values[map.min] = parseValue(entries.position_min);
    if (entries.position_max !== undefined) state.values[map.max] = parseValue(entries.position_max);
    if (entries.position_endstop !== undefined) state.values[map.home] = parseValue(entries.position_endstop);
    if (entries.homing_speed !== undefined) state.values[map.speed] = parseValue(entries.homing_speed);
  }
  const specialEndstops: Record<string, string> = {
    a: 'delta_a_position_endstop',
    b: 'delta_b_position_endstop',
    c: 'delta_c_position_endstop',
    left: 'deltesian_left_position_endstop',
    right: 'deltesian_right_position_endstop',
    arm: 'home_x'
  };
  if (entries.position_endstop !== undefined && specialEndstops[axis]) state.values[specialEndstops[axis]] = parseValue(entries.position_endstop);
  applyKnownValues(entries, state, diagnostics, {
    arm_length: 'arm_length',
    arm_x_length: 'arm_x_length',
    upper_arm_length: 'upper_arm_length',
    lower_arm_length: 'lower_arm_length',
    anchor_x: `${name}_anchor_x`,
    anchor_y: `${name}_anchor_y`,
    anchor_z: `${name}_anchor_z`
  });
}

function applyMacroSection(section: ParsedSection, state: AppState, diagnostics: Diagnostic[]): void {
  const name = section.name.replace(/^gcode_macro\s+/i, '').trim().toUpperCase();
  const lines = section.rawLines;
  let description = '';
  const params: string[] = [];
  const gcode: string[] = [];
  let inGcode = false;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!inGcode && /^gcode\s*:/i.test(trimmed)) {
      inGcode = true;
      return;
    }
    if (inGcode) {
      gcode.push(line.replace(/^\s{1,4}/, ''));
      return;
    }
    if (/^description\s*:/i.test(trimmed)) description = trimmed.replace(/^description\s*:\s*/i, '');
    else if (trimmed) params.push(trimmed);
  });
  if (!name) {
    warn(diagnostics, `Macro section at line ${section.lineNumber} has no name.`, 'macro');
    return;
  }
  const existing = state.macros.find((macro) => macro.name.toUpperCase() === name);
  const next: MacroDefinition = {
    id: existing?.id ?? createMacroId('macro'),
    name,
    description,
    paramsText: params.join('\n'),
    gcode: gcode.join('\n').trim(),
    simulationStartMode: existing?.simulationStartMode ?? 'current',
    simulationStart: existing?.simulationStart ?? { ...state.toolhead }
  };
  if (existing) Object.assign(existing, next);
  else state.macros.push(next);
  state.activeMacroId = next.id;
}

function parseKeyValues(section: ParsedSection, diagnostics: Diagnostic[]): Record<string, string> {
  const entries: Record<string, string> = {};
  section.rawLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) return;
    const candidate = trimmed.startsWith('#') ? trimmed.replace(/^#\s*/, '') : trimmed;
    const match = candidate.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (trimmed.startsWith('#') && !match?.[1].startsWith('visual_')) return;
    if (!match) {
      warn(diagnostics, `Line ${section.lineNumber + index + 1} in [${section.name}] is not a key/value line.`, 'printer.cfg');
      return;
    }
    entries[match[1]] = match[2].trim();
  });
  return entries;
}

function applyKnownValues(entries: Record<string, string>, state: AppState, diagnostics: Diagnostic[], map: Record<string, string>): void {
  Object.entries(entries).forEach(([key, value]) => {
    const target = map[key];
    if (!target) return;
    state.values[target] = parseValue(value);
  });
  Object.keys(entries).forEach((key) => {
    if (!map[key] && !['step_pin', 'dir_pin', 'enable_pin', 'endstop_pin', 'heater_pin', 'sensor_pin', 'sensor_type', 'control', 'pid_Kp', 'pid_Ki', 'pid_Kd'].includes(key)) {
      warn(diagnostics, `Unsupported key "${key}" was ignored.`, key);
    }
  });
}

function applyPair(value: string | undefined, values: Record<string, FieldValue>, xKey: string, yKey: string): void {
  if (!value) return;
  const parts = value.split(',').map((part) => part.trim());
  if (parts[0] !== undefined) values[xKey] = parseValue(parts[0]);
  if (parts[1] !== undefined) values[yKey] = parseValue(parts[1]);
}

function applyScrews(entries: Record<string, string>, state: AppState): void {
  const screws = Object.entries(entries)
    .filter(([key]) => /^screw\d+$/.test(key))
    .map(([key, value]) => {
      const index = Number(key.replace('screw', ''));
      const parts = value.split(',').map((part) => Number(part.trim()));
      return {
        x: Number.isFinite(parts[0]) ? parts[0] + num(state.values.probe_x_offset) : 0,
        y: Number.isFinite(parts[1]) ? parts[1] + num(state.values.probe_y_offset) : 0,
        name: entries[`screw${index}_name`] ?? `Screw ${index}`
      };
    });
  if (screws.length) state.screws = screws;
  if (entries.screw_thread !== undefined) state.values.screw_thread = entries.screw_thread;
}

function parseValue(value: string): FieldValue {
  if (value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function renderSection(section: ParsedSection): string {
  return [`[${section.name}]`, ...section.rawLines].join('\n').trim();
}

function warn(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'warning', message, field });
}
