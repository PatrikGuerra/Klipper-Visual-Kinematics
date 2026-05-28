import { describe, expect, it } from 'vitest';
import { kinematicsCatalog } from './catalog';
import { createDefaultState } from './defaults';
import { generateConfig } from './configGenerator';
import { getMotorReadout } from './transforms';
import { safeHomeX, safeHomeY, validateState } from './validators';
import { kinematicById } from './catalog';

const ids = ['cartesian', 'corexy', 'corexz', 'hybrid_corexy', 'hybrid_corexz', 'delta', 'deltesian', 'rotary_delta', 'polar', 'winch', 'generic_cartesian', 'none'];

describe('kinematics catalog', () => {
  it('contains every supported Klipper kinematic id', () => {
    expect(kinematicsCatalog.map((k) => k.id)).toEqual(ids);
  });
});

describe('validators', () => {
  it('reports inverted axis limits', () => {
    const state = createDefaultState();
    state.values.x_min = 300;
    state.values.x_max = 200;
    expect(validateState(state).some((d) => d.type === 'error' && d.field === 'x_min')).toBe(true);
  });

  it('reports invalid delta arm geometry', () => {
    const state = createDefaultState();
    state.values.kinematics = 'delta';
    state.values.arm_length = 50;
    expect(validateState(state).some((d) => d.message.includes('Delta arm length'))).toBe(true);
  });

  it('warns near polar center', () => {
    const state = createDefaultState();
    state.values.kinematics = 'polar';
    state.toolhead = { x: 0, y: 0, z: 15 };
    expect(validateState(state).some((d) => d.message.includes('Polar moves near'))).toBe(true);
  });

  it('uses usable bed offset for rectangular safe home', () => {
    const state = createDefaultState();
    state.values.bed_x_offset = 20;
    state.values.bed_y_offset = -10;
    state.values.probe_x_offset = 5;
    state.values.probe_y_offset = -3;
    const kin = kinematicById(state.values.kinematics);
    expect(safeHomeX(state.values, kin)).toBe(140);
    expect(safeHomeY(state.values, kin)).toBe(133);
  });
});

describe('config generator', () => {
  it.each(ids)('generates a printer section for %s', (id) => {
    const state = createDefaultState();
    state.values.kinematics = id;
    expect(generateConfig(state)).toContain(`kinematics: ${id}`);
  });

  it('emits common stepper options for rectangular kinematics', () => {
    const state = createDefaultState();
    const cfg = generateConfig(state);
    expect(cfg).toContain('step_pin: CHANGE_ME');
    expect(cfg).toContain('dir_pin: CHANGE_ME');
    expect(cfg).toContain('microsteps: 16');
    expect(cfg).toContain('homing_retract_dist: 5');
    expect(cfg).toContain('position_endstop: 0');
  });

  it('reports invalid common stepper defaults', () => {
    const state = createDefaultState();
    state.values.default_microsteps = 0;
    expect(validateState(state).some((d) => d.field === 'default_microsteps')).toBe(true);
  });

  it('reports missing z home because it is emitted as a stepper endstop', () => {
    const state = createDefaultState();
    state.values.home_z = '';
    expect(validateState(state).some((d) => d.field === 'home_z')).toBe(true);
  });

  it('emits deltesian printer-level kinematic options', () => {
    const state = createDefaultState();
    state.values.kinematics = 'deltesian';
    const cfg = generateConfig(state);
    expect(cfg).toContain('min_angle: 20');
    expect(cfg).toContain('print_width: 220');
    expect(cfg).toContain('slow_ratio: 3');
  });

  it('emits delta calibration speed and lift fields', () => {
    const state = createDefaultState();
    state.values.kinematics = 'delta';
    const cfg = generateConfig(state);
    expect(cfg).toContain('[delta_calibrate]');
    expect(cfg).toContain('speed: 50');
    expect(cfg).toContain('horizontal_move_z: 5');
  });

  it('emits optional extruder section when enabled', () => {
    const state = createDefaultState();
    state.values.extruderEnabled = true;
    const cfg = generateConfig(state);
    expect(cfg).toContain('[extruder]');
    expect(cfg).toContain('nozzle_diameter: 0.4');
    expect(cfg).toContain('filament_diameter: 1.75');
  });

  it('emits visual usable bed offset metadata', () => {
    const state = createDefaultState();
    state.values.bed_x_offset = 12;
    state.values.bed_y_offset = -8;
    const cfg = generateConfig(state);
    expect(cfg).toContain('# visual_bed_offset: 12, -8');
  });
});

describe('motor readout', () => {
  it('includes stepper_e with macro extrusion position', () => {
    const state = createDefaultState();
    state.macroPreview.finalExtruder = 7;
    state.macroPreview.totalExtrusion = 8;
    const row = getMotorReadout(state).find((item) => item.label === 'stepper_e');
    expect(row?.value).toContain('7.00 mm');
    expect(row?.value).toContain('+8.00');
  });
});
