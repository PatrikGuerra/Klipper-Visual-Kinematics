import type { AppState, MacroDefinition, Toolhead } from '../kinematics/types';

export function createMacroId(prefix = 'macro'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function createBlankMacro(start: Toolhead, index = 1): MacroDefinition {
  return {
    id: createMacroId('macro'),
    name: `CUSTOM_MACRO_${index}`,
    description: 'Custom visual macro',
    enabled: true,
    gcode: 'G90\nG0 X0 Y0 Z15 F6000',
    paramsText: '',
    simulationStartMode: 'current',
    simulationStart: { ...start }
  };
}

export function createNozzleCleaningMacro(state: Pick<AppState, 'values' | 'toolhead'>): MacroDefinition {
  const xMax = Number(state.values.x_max) || Number(state.values.bed_x) || 250;
  const yMin = Number(state.values.y_min) || 0;
  const zHop = Number(state.values.z_hop) || 15;
  const brushMin = Math.max(0, xMax - 35);
  const brushMax = Math.max(brushMin + 5, xMax - 5);
  const brushY = yMin + 5;
  const wipeZ = Math.max(Number(state.values.z_min) || 0, 5);
  const lines = [
    'SAVE_GCODE_STATE NAME=clean_nozzle_state',
    'G90',
    'M83',
    `G0 Z${zHop} F900`,
    `G0 X${brushMin} Y${brushY} F12000`,
    `G0 Z${wipeZ} F900`,
    'G1 E4 F300',
    `G1 X${brushMax} F6000`,
    `G1 X${brushMin} F6000`,
    `G1 X${brushMax} F6000`,
    `G1 X${brushMin} F6000`,
    'G1 E-1 F1200',
    `G0 Z${zHop} F900`,
    'RESTORE_GCODE_STATE NAME=clean_nozzle_state'
  ];
  return {
    id: createMacroId('clean'),
    name: 'CLEAN_NOZZLE',
    description: 'Example nozzle wipe macro. Edit freely for your brush location.',
    enabled: true,
    gcode: lines.join('\n'),
    paramsText: '',
    simulationStartMode: 'current',
    simulationStart: { ...state.toolhead }
  };
}

export function createParkToolheadMacro(state: Pick<AppState, 'values' | 'toolhead'>): MacroDefinition {
  const x = Number(state.values.x_min) || 0;
  const y = Number(state.values.y_max) || Number(state.values.bed_y) || 250;
  const z = Math.min(Number(state.values.z_max) || 250, Math.max(15, Number(state.values.z_hop) || 15));
  return {
    id: createMacroId('park'),
    name: 'PARK_TOOLHEAD',
    description: 'Example park macro. Edit freely for your machine.',
    enabled: true,
    gcode: ['SAVE_GCODE_STATE NAME=park_toolhead_state', 'G90', `G0 Z${z} F900`, `G0 X${x} Y${y} F9000`, 'RESTORE_GCODE_STATE NAME=park_toolhead_state'].join('\n'),
    paramsText: '',
    simulationStartMode: 'current',
    simulationStart: { ...state.toolhead }
  };
}
