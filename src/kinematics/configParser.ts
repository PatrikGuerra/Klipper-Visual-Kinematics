import { isKinematicId } from './catalog';
import { num } from './math';
import { createMacroId } from '../macros/presets';
import type { AppState, Diagnostic, FieldValue, MacroDefinition } from './types';

export interface ConfigApplyResult {
  diagnostics: Diagnostic[];
  unmanagedConfigText: string;
  configLineOverrides: Record<string, Record<string, string>>;
  configExtraLines: Record<string, string[]>;
}

interface ParsedSection {
  name: string;
  lineNumber: number;
  rawLines: string[];
}

interface ParsedKeyValue {
  key: string;
  value: string;
  rawLine: string;
  lineNumber: number;
}

interface ParsedEntries {
  entries: Record<string, string>;
  items: ParsedKeyValue[];
  extraLines: string[];
  hasInvalidLine: boolean;
}

interface PreservedConfig {
  configLineOverrides: Record<string, Record<string, string>>;
  configExtraLines: Record<string, string[]>;
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

const quietPreservedKeys = new Set([
  'step_pin',
  'dir_pin',
  'enable_pin',
  'endstop_pin',
  'heater_pin',
  'sensor_pin',
  'sensor_type',
  'control',
  'pid_kp',
  'pid_ki',
  'pid_kd',
  'value',
  'samples_tolerance_retries',
  'mesh_pps',
  'algorithm',
  'fade_start',
  'fade_end',
  'z_hop_speed',
  'second_homing_speed',
  'horizontal_move_z',
  'speed',
  'activate_gcode',
  'deactivate_gcode'
]);

const multiLineKeys = new Set(['gcode', 'activate_gcode', 'deactivate_gcode']);

export function getPrinterCfgText(state: AppState, generatedConfig: string): string {
  return state.ui.printerCfgDirty ? state.ui.printerCfgDraft : generatedConfig;
}

export function appendUnmanagedConfig(config: string, unmanagedConfigText: string): string {
  const unmanaged = unmanagedConfigText.trim();
  if (!unmanaged) return config;
  return `${config.trim()}\n\n# Unmanaged user config\n${unmanaged}\n`;
}

export function applyConfigTextToState(text: string, state: AppState): ConfigApplyResult {
  const diagnostics: Diagnostic[] = [];
  const sections = parseSections(text, diagnostics);
  const unmanaged: string[] = [];
  const preserved: PreservedConfig = { configLineOverrides: {}, configExtraLines: {} };

  sections.forEach((section) => {
    const lower = normalizeSectionName(section.name);
    if (lower.startsWith('gcode_macro ')) {
      applyMacroSection(section, state, diagnostics);
      return;
    }
    if (!knownRootSections.has(lower)) {
      unmanaged.push(renderSection(section));
      warn(diagnostics, `Unsupported section [${section.name}] was preserved as unmanaged config.`, 'printer.cfg');
      return;
    }

    const parsed = parseKeyValues(section, diagnostics);
    if (parsed.hasInvalidLine) {
      warn(diagnostics, `Skipped visual apply for [${section.name}] because it contains invalid lines. Raw lines were preserved.`, 'printer.cfg');
      preserveKnownSection(section, parsed, new Set(), preserved, diagnostics, true);
      return;
    }

    const handledKeys = applyKnownSection(section, parsed.entries, state, diagnostics);
    preserveKnownSection(section, parsed, handledKeys, preserved, diagnostics, false);
  });

  return {
    diagnostics,
    unmanagedConfigText: unmanaged.join('\n\n'),
    configLineOverrides: preserved.configLineOverrides,
    configExtraLines: preserved.configExtraLines
  };
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

function applyKnownSection(section: ParsedSection, entries: Record<string, string>, state: AppState, diagnostics: Diagnostic[]): Set<string> {
  const name = normalizeSectionName(section.name);
  if (name === 'printer') return applyPrinter(entries, state, diagnostics);
  if (name.startsWith('stepper_')) return applyStepper(name, entries, state);
  if (name === 'extruder') {
    state.values.extruderEnabled = true;
    return applyKnownValues(entries, state, {
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
  }
  if (name === 'probe') {
    state.values.probeFeaturesEnabled = true;
    return applyKnownValues(entries, state, {
      pin: 'probe_pin',
      x_offset: 'probe_x_offset',
      y_offset: 'probe_y_offset',
      z_offset: 'probe_z_offset',
      speed: 'probe_speed',
      samples: 'probe_samples',
      sample_retract_dist: 'probe_retract',
      samples_tolerance: 'probe_tolerance'
    });
  }
  if (name === 'bed_mesh') {
    state.values.probeFeaturesEnabled = true;
    const handled = applyKnownValues(entries, state, {
      speed: 'mesh_speed',
      horizontal_move_z: 'mesh_hz'
    });
    markPair(entries, handled, 'mesh_min', state.values, 'mesh_xmin', 'mesh_ymin');
    markPair(entries, handled, 'mesh_max', state.values, 'mesh_xmax', 'mesh_ymax');
    markPair(entries, handled, 'probe_count', state.values, 'mesh_countx', 'mesh_county');
    return handled;
  }
  if (name === 'safe_z_home') {
    state.values.probeFeaturesEnabled = true;
    const handled = new Set<string>();
    markPair(entries, handled, 'home_xy_position', state.values, 'home_x', 'home_y');
    if (entries.z_hop !== undefined) {
      state.values.z_hop = parseValue(entries.z_hop);
      handled.add('z_hop');
    }
    return handled;
  }
  if (name === 'screws_tilt_adjust') {
    state.values.probeFeaturesEnabled = true;
    state.values.screwsEnabled = true;
    return applyScrews(entries, state);
  }
  if (name === 'delta_calibrate') {
    return applyKnownValues(entries, state, {
      radius: state.values.kinematics === 'rotary_delta' ? 'rotary_delta_calibrate_radius' : 'delta_calibrate_radius',
      speed: state.values.kinematics === 'rotary_delta' ? 'rotary_delta_calibrate_speed' : 'delta_calibrate_speed',
      horizontal_move_z: state.values.kinematics === 'rotary_delta' ? 'rotary_horizontal_move_z' : 'delta_horizontal_move_z'
    });
  }
  return new Set();
}

function applyPrinter(entries: Record<string, string>, state: AppState, diagnostics: Diagnostic[]): Set<string> {
  const handled = new Set<string>();
  markPair(entries, handled, 'visual_bed_offset', state.values, 'bed_x_offset', 'bed_y_offset');
  if (entries.kinematics !== undefined) {
    handled.add('kinematics');
    if (isKinematicId(entries.kinematics)) state.values.kinematics = entries.kinematics;
    else warn(diagnostics, `Unsupported kinematics "${entries.kinematics}" ignored.`, 'kinematics');
  }
  mergeHandled(
    handled,
    applyKnownValues(entries, state, {
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
    })
  );
  return handled;
}

function applyStepper(name: string, entries: Record<string, string>, state: AppState): Set<string> {
  const handled = applyKnownValues(entries, state, {
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
    if (entries.position_min !== undefined) {
      state.values[map.min] = parseValue(entries.position_min);
      handled.add('position_min');
    }
    if (entries.position_max !== undefined) {
      state.values[map.max] = parseValue(entries.position_max);
      handled.add('position_max');
    }
    if (entries.position_endstop !== undefined) {
      state.values[map.home] = parseValue(entries.position_endstop);
      handled.add('position_endstop');
    }
    if (entries.homing_speed !== undefined) {
      state.values[map.speed] = parseValue(entries.homing_speed);
      handled.add('homing_speed');
    }
    if ((axis === 'x' || axis === 'y') && entries.second_homing_speed !== undefined) {
      state.values.second_homing_speed = parseValue(entries.second_homing_speed);
      handled.add('second_homing_speed');
    }
  }
  const specialEndstops: Record<string, string> = {
    a: 'delta_a_position_endstop',
    b: 'delta_b_position_endstop',
    c: 'delta_c_position_endstop',
    left: 'deltesian_left_position_endstop',
    right: 'deltesian_right_position_endstop',
    arm: 'home_x'
  };
  if (entries.position_endstop !== undefined && specialEndstops[axis]) {
    state.values[specialEndstops[axis]] = parseValue(entries.position_endstop);
    handled.add('position_endstop');
  }
  mergeHandled(
    handled,
    applyKnownValues(entries, state, {
      arm_length: 'arm_length',
      arm_x_length: 'arm_x_length',
      upper_arm_length: 'upper_arm_length',
      lower_arm_length: 'lower_arm_length',
      anchor_x: `${name}_anchor_x`,
      anchor_y: `${name}_anchor_y`,
      anchor_z: `${name}_anchor_z`
    })
  );
  return handled;
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

function parseKeyValues(section: ParsedSection, diagnostics: Diagnostic[]): ParsedEntries {
  const entries: Record<string, string> = {};
  const items: ParsedKeyValue[] = [];
  const extraLines: string[] = [];
  let hasInvalidLine = false;
  let lastKey = '';

  section.rawLines.forEach((line, index) => {
    const lineNumber = section.lineNumber + index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) return;

    if (/^\s/.test(line) && multiLineKeys.has(lastKey)) {
      extraLines.push(line);
      return;
    }

    const candidate = trimmed.startsWith('#') ? trimmed.replace(/^#\s*/, '') : trimmed;
    const match = candidate.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (trimmed.startsWith('#') && (!match || !shouldReadCommentedKey(normalizeKey(match[1])))) return;
    if (!match) {
      warn(diagnostics, `Line ${lineNumber} in [${section.name}] is not a key/value line.`, 'printer.cfg');
      extraLines.push(line);
      hasInvalidLine = true;
      return;
    }

    const key = normalizeKey(match[1]);
    const value = match[2].trim();
    entries[key] = value;
    items.push({ key, value, rawLine: line, lineNumber });
    lastKey = key;
  });

  return { entries, items, extraLines, hasInvalidLine };
}

function preserveKnownSection(section: ParsedSection, parsed: ParsedEntries, handledKeys: Set<string>, preserved: PreservedConfig, diagnostics: Diagnostic[], preserveAll: boolean): void {
  const sectionKey = normalizeSectionName(section.name);
  parsed.items.forEach((item) => {
    if (!preserveAll && handledKeys.has(item.key)) return;
    addLineOverride(preserved.configLineOverrides, sectionKey, item.key, item.rawLine);
    if (!preserveAll && !quietPreservedKeys.has(item.key)) {
      warn(diagnostics, `Unsupported key "${item.key}" in [${section.name}] was preserved.`, item.key);
    }
  });
  parsed.extraLines.forEach((line) => addExtraLine(preserved.configExtraLines, sectionKey, line));
}

function applyKnownValues(entries: Record<string, string>, state: AppState, map: Record<string, string>): Set<string> {
  const handled = new Set<string>();
  Object.entries(map).forEach(([key, target]) => {
    if (entries[key] === undefined) return;
    state.values[target] = parseValue(entries[key]);
    handled.add(key);
  });
  return handled;
}

function markPair(entries: Record<string, string>, handled: Set<string>, key: string, values: Record<string, FieldValue>, xKey: string, yKey: string): void {
  const value = entries[key];
  if (!value) return;
  const parts = value.split(',').map((part) => part.trim());
  if (parts[0] !== undefined) values[xKey] = parseValue(parts[0]);
  if (parts[1] !== undefined) values[yKey] = parseValue(parts[1]);
  handled.add(key);
}

function applyScrews(entries: Record<string, string>, state: AppState): Set<string> {
  const handled = new Set<string>();
  const screws = Object.entries(entries)
    .filter(([key]) => /^screw\d+$/.test(key))
    .map(([key, value]) => {
      handled.add(key);
      const index = Number(key.replace('screw', ''));
      if (entries[`screw${index}_name`] !== undefined) handled.add(`screw${index}_name`);
      const parts = value.split(',').map((part) => Number(part.trim()));
      return {
        x: Number.isFinite(parts[0]) ? parts[0] + num(state.values.probe_x_offset) : 0,
        y: Number.isFinite(parts[1]) ? parts[1] + num(state.values.probe_y_offset) : 0,
        name: entries[`screw${index}_name`] ?? `Screw ${index}`
      };
    });
  if (screws.length) state.screws = screws;
  if (entries.screw_thread !== undefined) {
    state.values.screw_thread = entries.screw_thread;
    handled.add('screw_thread');
  }
  return handled;
}

function parseValue(value: string): FieldValue {
  if (value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function renderSection(section: ParsedSection): string {
  return [`[${section.name}]`, ...section.rawLines].join('\n').trim();
}

function shouldReadCommentedKey(key: string): boolean {
  return key.startsWith('visual_') || quietPreservedKeys.has(key);
}

function addLineOverride(target: Record<string, Record<string, string>>, section: string, key: string, rawLine: string): void {
  target[section] = target[section] ?? {};
  target[section][key] = rawLine;
}

function addExtraLine(target: Record<string, string[]>, section: string, line: string): void {
  target[section] = target[section] ?? [];
  if (!target[section].includes(line)) target[section].push(line);
}

function mergeHandled(target: Set<string>, source: Set<string>): void {
  source.forEach((key) => target.add(key));
}

function normalizeSectionName(section: string): string {
  return section.trim().toLowerCase();
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function warn(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'warning', message, field });
}
