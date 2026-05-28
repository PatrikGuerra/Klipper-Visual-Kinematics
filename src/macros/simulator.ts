import { kinematicById } from '../kinematics/catalog';
import { isRadialFamily, num } from '../kinematics/math';
import type { AppState, Diagnostic, MacroDefinition, MacroPreview, MacroSegment, Toolhead } from '../kinematics/types';

interface SimulationState {
  position: Toolhead;
  extruder: number;
  absolute: boolean;
  extruderAbsolute: boolean;
  sawMotionMode: boolean;
  sawFeedrate: boolean;
  sawSaveState: boolean;
  sawRestoreState: boolean;
  partial: boolean;
  saved: Toolhead[];
  diagnostics: Diagnostic[];
  segments: MacroSegment[];
}

const axisPattern = /([A-Za-z])\s*(-?\d+(?:\.\d+)?)/g;

export function simulateMacro(macro: MacroDefinition, state: AppState): MacroPreview {
  const start = macro.simulationStartMode === 'manual' ? { ...macro.simulationStart } : { ...state.toolhead };
  const sim: SimulationState = {
    position: { ...start },
    extruder: 0,
    absolute: true,
    extruderAbsolute: true,
    sawMotionMode: false,
    sawFeedrate: false,
    sawSaveState: false,
    sawRestoreState: false,
    partial: false,
    saved: [],
    diagnostics: [],
    segments: []
  };
  const localNames = new Set(state.macros.map((item) => item.name.trim().toUpperCase()).filter(Boolean));

  macro.gcode.replace(/\r\n/g, '\n').split('\n').forEach((rawLine, index) => {
    parseLine(rawLine, index + 1, sim, state, localNames);
  });

  if (sim.segments.some((segment) => segment.type === 'move') && (!sim.sawSaveState || !sim.sawRestoreState)) {
    warn(sim.diagnostics, `${macro.name} moves the toolhead without both SAVE_GCODE_STATE and RESTORE_GCODE_STATE.`, 'macro');
  }

  return {
    macroId: macro.id,
    segments: sim.segments,
    diagnostics: sim.diagnostics,
    partial: sim.partial,
    start,
    finalToolhead: { ...sim.position },
    finalExtruder: sim.extruder,
    totalExtrusion: sim.segments.reduce((total, segment) => total + Math.max(0, segment.extrusionDelta), 0)
  };
}

function parseLine(rawLine: string, lineNumber: number, sim: SimulationState, state: AppState, localNames: Set<string>): void {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) return;
  if (/[{}]/.test(trimmed)) {
    sim.partial = true;
    warn(sim.diagnostics, `Line ${lineNumber} contains Jinja/template syntax; visual preview is partial.`, 'macro');
    addEvent(sim, trimmed, lineNumber, false, 'Template line preserved but not executed visually.');
    return;
  }

  const commandText = stripInlineComment(trimmed);
  if (!commandText) return;
  const command = commandText.split(/\s+/)[0].toUpperCase();

  if (command === 'G90') {
    sim.absolute = true;
    sim.sawMotionMode = true;
    addEvent(sim, commandText, lineNumber, true, 'Absolute positioning.');
    return;
  }
  if (command === 'G91') {
    sim.absolute = false;
    sim.sawMotionMode = true;
    addEvent(sim, commandText, lineNumber, true, 'Relative positioning.');
    return;
  }
  if (command === 'G92') {
    setPosition(commandText, sim);
    addEvent(sim, commandText, lineNumber, true, 'Position register changed.');
    return;
  }
  if (command === 'G0' || command === 'G00' || command === 'G1' || command === 'G01') {
    move(commandText, lineNumber, sim, state);
    return;
  }
  if (command === 'G4' || command === 'G04') {
    const durationMs = parseDuration(commandText);
    addSegment(sim, {
      type: 'pause',
      command: commandText,
      lineNumber,
      from: { ...sim.position },
      to: { ...sim.position },
      fromE: sim.extruder,
      toE: sim.extruder,
      extrusionDelta: 0,
      durationMs,
      simulated: true,
      outOfBounds: false,
      message: durationMs ? `Pause ${durationMs}ms.` : 'Pause.'
    });
    return;
  }
  if (command === 'SAVE_GCODE_STATE') {
    sim.sawSaveState = true;
    sim.saved.push({ ...sim.position });
    addEvent(sim, commandText, lineNumber, true, 'State saved.');
    return;
  }
  if (command === 'RESTORE_GCODE_STATE') {
    sim.sawRestoreState = true;
    const restored = sim.saved.pop();
    if (restored) sim.position = { ...restored };
    addEvent(sim, commandText, lineNumber, true, 'State restored.');
    return;
  }
  if (command === 'M82' || command === 'M83') {
    sim.extruderAbsolute = command === 'M82';
    addEvent(sim, commandText, lineNumber, true, command === 'M82' ? 'Absolute extrusion mode.' : 'Relative extrusion mode.');
    return;
  }

  const knownMacroCall = localNames.has(command);
  if (!knownMacroCall) warn(sim.diagnostics, `Line ${lineNumber} command "${command}" is not simulated.`, 'macro');
  addEvent(sim, commandText, lineNumber, false, knownMacroCall ? 'Local macro call preserved but not expanded.' : 'Command preserved but not simulated.');
}

function move(commandText: string, lineNumber: number, sim: SimulationState, state: AppState): void {
  if (!sim.sawMotionMode) warn(sim.diagnostics, `Line ${lineNumber} moves before an explicit G90/G91.`, 'macro');
  const values = parseWords(commandText);
  if (values.F !== undefined) {
    sim.sawFeedrate = true;
  } else if (!sim.sawFeedrate) {
    warn(sim.diagnostics, `Line ${lineNumber} is the first move and has no feedrate F.`, 'macro');
  }
  const from = { ...sim.position };
  const to = { ...sim.position };
  const fromE = sim.extruder;
  const eValue = values.E;
  const toE = eValue === undefined ? fromE : sim.extruderAbsolute ? eValue : fromE + eValue;
  (['X', 'Y', 'Z'] as const).forEach((axis) => {
    const value = values[axis];
    if (value === undefined) return;
    const key = axis.toLowerCase() as keyof Toolhead;
    to[key] = sim.absolute ? value : to[key] + value;
  });
  sim.position = { ...to };
  sim.extruder = toE;
  const outOfBounds = !isReachable(state, to);
  if (outOfBounds) warn(sim.diagnostics, `Line ${lineNumber} moves outside the current kinematic travel.`, 'macro');
  addSegment(sim, {
    type: 'move',
    command: commandText,
    lineNumber,
    from,
    to,
    fromE,
    toE,
    extrusionDelta: toE - fromE,
    feedrate: values.F,
    simulated: true,
    outOfBounds
  });
}

function setPosition(commandText: string, sim: SimulationState): void {
  const values = parseWords(commandText);
  (['X', 'Y', 'Z'] as const).forEach((axis) => {
    const value = values[axis];
    if (value === undefined) return;
    const key = axis.toLowerCase() as keyof Toolhead;
    sim.position[key] = value;
  });
  if (values.E !== undefined) sim.extruder = values.E;
}

function parseWords(commandText: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const match of commandText.matchAll(axisPattern)) {
    result[match[1].toUpperCase()] = Number(match[2]);
  }
  return result;
}

function parseDuration(commandText: string): number | undefined {
  const words = parseWords(commandText);
  if (words.P !== undefined) return words.P;
  if (words.S !== undefined) return words.S * 1000;
  return undefined;
}

function stripInlineComment(line: string): string {
  return line.split(';')[0].trim();
}

function addEvent(sim: SimulationState, command: string, lineNumber: number, simulated: boolean, message: string): void {
  addSegment(sim, {
    type: 'event',
    command,
    lineNumber,
    from: { ...sim.position },
    to: { ...sim.position },
    fromE: sim.extruder,
    toE: sim.extruder,
    extrusionDelta: 0,
    simulated,
    outOfBounds: false,
    message
  });
}

function addSegment(sim: SimulationState, segment: MacroSegment): void {
  sim.segments.push(segment);
}

function isReachable(state: AppState, p: Toolhead): boolean {
  const kin = kinematicById(state.values.kinematics);
  if (p.z < num(state.values.z_min) || p.z > num(state.values.z_max)) return false;
  if (isRadialFamily(kin.family)) {
    const radius = kin.family === 'polar' ? num(state.values.polar_radius) : kin.family === 'rotary_delta' ? num(state.values.rotary_print_radius) : num(state.values.print_radius);
    return Math.hypot(p.x, p.y) <= radius;
  }
  return p.x >= num(state.values.x_min) && p.x <= num(state.values.x_max) && p.y >= num(state.values.y_min) && p.y <= num(state.values.y_max);
}

function warn(items: Diagnostic[], message: string, field?: string): void {
  items.push({ type: 'warning', message, field });
}
