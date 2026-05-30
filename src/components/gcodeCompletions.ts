import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

export interface GcodeCompletionOptions {
  macroNames?: string[];
}

const commandCompletions: Completion[] = [
  command('G0', 'Rapid move', 'Move to a position using rapid travel. Common parameters: X Y Z E F.'),
  command('G1', 'Linear move', 'Move to a position using coordinated linear motion. Common parameters: X Y Z E F.'),
  command('G4', 'Dwell / pause', 'Pause for a time. Common parameter: P milliseconds.'),
  command('G28', 'Home axes', 'Home one or more axes. Use X, Y, and/or Z to home selected axes.'),
  command('G90', 'Absolute coordinates', 'Use absolute XYZ positioning.'),
  command('G91', 'Relative coordinates', 'Use relative XYZ positioning.'),
  command('G92', 'Set logical position', 'Set the current logical position for X/Y/Z/E.'),
  command('M18', 'Disable steppers', 'Turn off motors. Same family as M84.'),
  command('M84', 'Disable steppers', 'Turn off motors.'),
  command('M400', 'Wait for moves', 'Wait for queued moves to complete.'),
  command('M82', 'Absolute extrusion', 'Use absolute E positioning.'),
  command('M83', 'Relative extrusion', 'Use relative E positioning.'),
  command('M220', 'Speed factor', 'Set speed factor override percentage. Common parameter: S percent.'),
  command('M221', 'Extrude factor', 'Set extrude factor override percentage. Common parameter: S percent.'),
  command('M204', 'Acceleration', 'Set acceleration. Common parameters: S, P, T.'),
  command('M105', 'Report temperature', 'Get current heater temperatures.'),
  command('M104', 'Set hotend temp', 'Set extruder temperature without waiting. Common parameter: S temperature.'),
  command('M109', 'Set hotend and wait', 'Set extruder temperature and wait for it to settle. Common parameter: S temperature.'),
  command('M140', 'Set bed temp', 'Set bed temperature without waiting. Common parameter: S temperature.'),
  command('M190', 'Set bed and wait', 'Set bed temperature and wait for it to settle. Common parameter: S temperature.'),
  command('M106', 'Fan speed', 'Set fan speed. Common parameter: S value.'),
  command('M107', 'Fan off', 'Turn fan off.'),
  command('M112', 'Emergency stop', 'Trigger an emergency shutdown.'),
  command('M114', 'Report position', 'Report the current printer position.'),
  command('M115', 'Firmware info', 'Report firmware version information.'),
  command('M117', 'Display message', 'Display a message on the printer UI.'),
  command('M118', 'Console message', 'Send a message to the host console.'),
  command('SAVE_GCODE_STATE', 'Save parser state', 'Save current G-code parser state before macro moves. Common parameter: NAME.'),
  command('RESTORE_GCODE_STATE', 'Restore parser state', 'Restore a state saved with SAVE_GCODE_STATE. Common parameters: NAME, MOVE, MOVE_SPEED.'),
  command('SET_GCODE_OFFSET', 'Set coordinate offset', 'Adjust G-code coordinate offsets. Common parameters: X, Y, Z, MOVE.'),
  command('GET_POSITION', 'Report detailed position', 'Report kinematic, toolhead, and stepper position details.'),
  command('SET_POSITION_KINEMATIC', 'Force kinematic position', 'Set low-level kinematic position. Advanced/debug use.'),
  command('SET_VELOCITY_LIMIT', 'Velocity limits', 'Set runtime velocity, acceleration, and square-corner limits.'),
  command('SET_PRESSURE_ADVANCE', 'Pressure advance', 'Set extruder pressure advance at runtime.'),
  command('SET_IDLE_TIMEOUT', 'Idle timeout', 'Set printer idle timeout. Common parameter: TIMEOUT.'),
  command('RESTART', 'Restart host firmware', 'Reload Klipper host software.'),
  command('FIRMWARE_RESTART', 'Restart MCU firmware', 'Restart Klipper firmware and reconnect MCUs.'),
  command('HELP', 'List commands', 'Show available extended commands.'),
  command('STATUS', 'Printer status', 'Report printer status.'),
  command('RESPOND', 'Emit response', 'Send text to console/UI. Common parameters: TYPE, MSG.'),
  command('SET_HEATER_TEMPERATURE', 'Set heater target', 'Set a heater target by name. Common parameters: HEATER, TARGET.'),
  command('TEMPERATURE_WAIT', 'Wait for temperature', 'Wait until a sensor is within a temperature range.'),
  command('TURN_OFF_HEATERS', 'Heaters off', 'Turn off all heaters.'),
  command('SET_FAN_SPEED', 'Set named fan speed', 'Set a configurable fan speed. Common parameters: FAN, SPEED.'),
  command('SET_PIN', 'Set output pin', 'Set a configurable output pin. Common parameters: PIN, VALUE.'),
  command('BED_MESH_CALIBRATE', 'Run bed mesh', 'Probe the bed and build a mesh. Common parameters: PROFILE, METHOD, ADAPTIVE.'),
  command('BED_MESH_OUTPUT', 'Print mesh data', 'Output current mesh information.'),
  command('BED_MESH_MAP', 'Mesh map', 'Output mesh data in map format.'),
  command('BED_MESH_CLEAR', 'Clear mesh', 'Clear active bed mesh state.'),
  command('BED_MESH_PROFILE', 'Mesh profile', 'Load, save, or remove a mesh profile. Common parameters: LOAD, SAVE, REMOVE.'),
  command('BED_MESH_OFFSET', 'Mesh offset', 'Apply X/Y/Z fade offsets for bed mesh lookup.'),
  command('BED_SCREWS_ADJUST', 'Bed screws adjust', 'Start manual bed screw adjustment.'),
  command('SCREWS_TILT_CALCULATE', 'Screws tilt', 'Probe screws and calculate screw tilt adjustments.'),
  command('PROBE', 'Probe point', 'Run a single probe at the current XY position.'),
  command('QUERY_PROBE', 'Probe state', 'Report current probe state.'),
  command('PROBE_ACCURACY', 'Probe repeatability', 'Run repeated probing for accuracy stats.'),
  command('Z_TILT_ADJUST', 'Z tilt adjust', 'Probe and adjust multiple Z steppers.'),
  command('QUAD_GANTRY_LEVEL', 'Quad gantry level', 'Probe and level a quad gantry.'),
  command('DELTA_CALIBRATE', 'Delta calibrate', 'Run delta calibration routine.'),
  command('MANUAL_PROBE', 'Manual probe', 'Start manual probe helper.'),
  command('PAUSE', 'Pause print', 'Pause an active print when pause_resume is enabled.'),
  command('RESUME', 'Resume print', 'Resume a paused print when pause_resume is enabled.'),
  command('CLEAR_PAUSE', 'Clear pause state', 'Clear pause state without resuming.'),
  command('QUERY_FILAMENT_SENSOR', 'Filament sensor state', 'Query a configured filament sensor.'),
  command('SET_FILAMENT_SENSOR', 'Filament sensor control', 'Enable or disable a configured filament sensor.'),
  command('SHAPER_CALIBRATE', 'Input shaper calibrate', 'Run resonance measurements and fit input shaper.'),
  command('TEST_RESONANCES', 'Measure resonances', 'Run resonance test for an axis.'),
  command('ACCELEROMETER_QUERY', 'Accelerometer query', 'Read accelerometer values.'),
  command('ACCELEROMETER_MEASURE', 'Accelerometer measure', 'Start or stop accelerometer data capture.'),
  command('SAVE_CONFIG', 'Save config changes', 'Write pending calibrated config changes to printer.cfg.')
];

export const knownGcodeCommandLabels = commandCompletions.map((completion) => completion.label);

const parameterCompletions: Completion[] = [
  { label: 'X', type: 'property', apply: 'X0', detail: 'X position' },
  { label: 'Y', type: 'property', apply: 'Y0', detail: 'Y position' },
  { label: 'Z', type: 'property', apply: 'Z10', detail: 'Z position' },
  { label: 'E', type: 'property', apply: 'E0', detail: 'Extruder position' },
  { label: 'F', type: 'property', apply: 'F6000', detail: 'Feedrate mm/min' },
  { label: 'S', type: 'property', apply: 'S0', detail: 'Generic value / temperature / speed' },
  { label: 'P', type: 'property', apply: 'P1000', detail: 'Dwell milliseconds / print accel' },
  { label: 'T', type: 'property', apply: 'T0', detail: 'Tool index / travel accel' },
  { label: 'I', type: 'property', apply: 'I0', detail: 'Arc or command parameter' },
  { label: 'J', type: 'property', apply: 'J0', detail: 'Arc or command parameter' },
  { label: 'R', type: 'property', apply: 'R0', detail: 'Radius / command parameter' },
  { label: 'NAME', type: 'property', apply: 'NAME=macro_state', detail: 'State/profile name' },
  { label: 'MOVE', type: 'property', apply: 'MOVE=1', detail: 'Apply movement when restoring/applying' },
  { label: 'MOVE_SPEED', type: 'property', apply: 'MOVE_SPEED=50', detail: 'Move speed' },
  { label: 'HEATER', type: 'property', apply: 'HEATER=extruder', detail: 'Heater name' },
  { label: 'TARGET', type: 'property', apply: 'TARGET=200', detail: 'Target temperature/value' },
  { label: 'SENSOR', type: 'property', apply: 'SENSOR=extruder', detail: 'Temperature sensor name' },
  { label: 'MINIMUM', type: 'property', apply: 'MINIMUM=0', detail: 'Minimum wait value' },
  { label: 'MAXIMUM', type: 'property', apply: 'MAXIMUM=300', detail: 'Maximum wait value' },
  { label: 'FAN', type: 'property', apply: 'FAN=fan', detail: 'Fan name' },
  { label: 'SPEED', type: 'property', apply: 'SPEED=1.0', detail: 'Speed value' },
  { label: 'PIN', type: 'property', apply: 'PIN=', detail: 'Output pin name' },
  { label: 'VALUE', type: 'property', apply: 'VALUE=1', detail: 'Output value' },
  { label: 'PROFILE', type: 'property', apply: 'PROFILE=default', detail: 'Bed mesh profile' },
  { label: 'LOAD', type: 'property', apply: 'LOAD=default', detail: 'Load profile' },
  { label: 'SAVE', type: 'property', apply: 'SAVE=default', detail: 'Save profile' },
  { label: 'REMOVE', type: 'property', apply: 'REMOVE=default', detail: 'Remove profile' },
  { label: 'METHOD', type: 'property', apply: 'METHOD=automatic', detail: 'Calibration method' },
  { label: 'HORIZONTAL_MOVE_Z', type: 'property', apply: 'HORIZONTAL_MOVE_Z=5', detail: 'Probe travel Z height' },
  { label: 'ADAPTIVE', type: 'property', apply: 'ADAPTIVE=1', detail: 'Adaptive bed mesh' },
  { label: 'ADAPTIVE_MARGIN', type: 'property', apply: 'ADAPTIVE_MARGIN=5', detail: 'Adaptive mesh margin' },
  { label: 'VELOCITY', type: 'property', apply: 'VELOCITY=200', detail: 'Velocity limit' },
  { label: 'ACCEL', type: 'property', apply: 'ACCEL=1500', detail: 'Acceleration limit' },
  { label: 'SQUARE_CORNER_VELOCITY', type: 'property', apply: 'SQUARE_CORNER_VELOCITY=5', detail: 'Corner velocity limit' },
  { label: 'TYPE', type: 'property', apply: 'TYPE=echo', detail: 'Response type' },
  { label: 'MSG', type: 'property', apply: 'MSG="message"', detail: 'Response message' }
];

const snippetCompletions: Completion[] = [
  {
    label: 'absolute move block',
    type: 'text',
    detail: 'G90 + move',
    apply: 'G90\nG1 X0 Y0 Z10 F6000'
  },
  {
    label: 'relative move block',
    type: 'text',
    detail: 'G91 + move',
    apply: 'G91\nG1 X0 Y0 Z0 F6000'
  },
  {
    label: 'save restore block',
    type: 'text',
    detail: 'SAVE/RESTORE state',
    apply: 'SAVE_GCODE_STATE NAME=macro_state\nG90\n\nRESTORE_GCODE_STATE NAME=macro_state'
  },
  {
    label: 'purge line',
    type: 'text',
    detail: 'Relative extrude',
    apply: 'M83\nG1 E8 F300\nG1 E-1 F1200'
  },
  {
    label: 'dwell pause',
    type: 'text',
    detail: 'G4 pause',
    apply: 'G4 P1000'
  },
  {
    label: 'heat hotend and bed',
    type: 'text',
    detail: 'M104/M140 + waits',
    apply: 'M140 S60\nM104 S200\nM190 S60\nM109 S200'
  },
  {
    label: 'bed mesh adaptive',
    type: 'text',
    detail: 'BED_MESH_CALIBRATE',
    apply: 'BED_MESH_CALIBRATE ADAPTIVE=1'
  },
  {
    label: 'respond message',
    type: 'text',
    detail: 'RESPOND',
    apply: 'RESPOND TYPE=echo MSG="Macro running"'
  },
  {
    label: 'fan full speed',
    type: 'text',
    detail: 'M106',
    apply: 'M106 S255'
  },
  {
    label: 'turn off heaters',
    type: 'text',
    detail: 'TURN_OFF_HEATERS',
    apply: 'TURN_OFF_HEATERS'
  }
];

export function createGcodeCompletionSource(options: GcodeCompletionOptions = {}) {
  const macroCompletions = createMacroCompletions(options.macroNames ?? []);

  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const linePrefix = line.text.slice(0, context.pos - line.from);
    if (isInsideCommentOrTemplate(linePrefix)) return null;

    const parameterContext = shouldSuggestParameters(linePrefix);
    const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
    const explicit = context.explicit;
    if (!word && !explicit && !parameterContext) return null;

    const from = word?.from ?? context.pos;
    const options = parameterContext
      ? [...parameterCompletions, ...commandCompletions, ...macroCompletions, ...snippetCompletions]
      : [...commandCompletions, ...macroCompletions, ...snippetCompletions];

    return {
      from,
      options,
      validFor: /^[A-Za-z_][A-Za-z0-9_]*$/
    };
  };
}

export function createMacroCompletions(macroNames: string[]): Completion[] {
  return [...new Set(macroNames.map((name) => name.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      label: name,
      type: 'function',
      detail: 'Local macro',
      info: 'Call another macro defined in this app.'
    }));
}

function shouldSuggestParameters(linePrefix: string): boolean {
  const trimmed = linePrefix.trimStart();
  return /^[A-Z_][A-Z0-9_]*\b/i.test(trimmed) && /\s$/.test(linePrefix);
}

function isInsideCommentOrTemplate(linePrefix: string): boolean {
  const commentIndex = firstIndex(linePrefix, [';', '#']);
  if (commentIndex >= 0) return true;

  const lastOpen = Math.max(linePrefix.lastIndexOf('{'), linePrefix.lastIndexOf('{%'));
  const lastClose = linePrefix.lastIndexOf('}');
  return lastOpen > lastClose;
}

function firstIndex(text: string, needles: string[]): number {
  return needles.reduce((lowest, needle) => {
    const index = text.indexOf(needle);
    if (index < 0) return lowest;
    return lowest < 0 ? index : Math.min(lowest, index);
  }, -1);
}

function command(label: string, detail: string, info: string): Completion {
  return { label, type: 'keyword', detail, info };
}
