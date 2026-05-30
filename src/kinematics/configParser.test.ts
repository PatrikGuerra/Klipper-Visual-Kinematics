import { describe, expect, it } from 'vitest';
import { generateConfig } from './configGenerator';
import { appendUnmanagedConfig, applyConfigTextToState, getPrinterCfgText } from './configParser';
import { createDefaultState } from './defaults';
import { generateMacrosConfig } from '../macros/configGenerator';

describe('printer.cfg parser', () => {
  it('reads [printer] values into visual state', () => {
    const state = createDefaultState();
    applyConfigTextToState('[printer]\n# visual_bed_offset: 12, -8\nkinematics: corexy\nmax_velocity: 320\nmax_accel: 4000', state);
    expect(state.values.kinematics).toBe('corexy');
    expect(state.values.max_velocity).toBe(320);
    expect(state.values.max_accel).toBe(4000);
    expect(state.values.bed_x_offset).toBe(12);
    expect(state.values.bed_y_offset).toBe(-8);
  });

  it('reads [extruder] values and enables extruder output', () => {
    const state = createDefaultState();
    applyConfigTextToState('[extruder]\nrotation_distance: 22.67\nmicrosteps: 32\nnozzle_diameter: 0.6\nfilament_diameter: 1.75', state);
    expect(state.values.extruderEnabled).toBe(true);
    expect(state.values.extruder_rotation_distance).toBe(22.67);
    expect(state.values.extruder_microsteps).toBe(32);
    expect(state.values.nozzle_diameter).toBe(0.6);
  });

  it('reads [gcode_macro NAME] into macros', () => {
    const state = createDefaultState();
    applyConfigTextToState('[gcode_macro PURGE]\ndescription: Purge filament\ngcode:\n  G90\n  M83\n  G1 E8 F300', state);
    const macro = state.macros.find((item) => item.name === 'PURGE');
    expect(macro?.description).toBe('Purge filament');
    expect(macro?.gcode).toContain('G1 E8 F300');
    expect('enabled' in (macro ?? {})).toBe(false);
  });

  it('reads screws_tilt_adjust nozzle coordinates back as physical screw positions', () => {
    const state = createDefaultState();
    state.values.probe_x_offset = 29;
    state.values.probe_y_offset = -26;
    applyConfigTextToState('[screws_tilt_adjust]\nscrew1: 1, 56\nscrew1_name: Front Left\nscrew_thread: CW-M4', state);
    expect(state.screws[0]).toEqual({ x: 30, y: 30, name: 'Front Left' });
    expect(state.values.screwsEnabled).toBe(true);
    expect(state.values.screw_thread).toBe('CW-M4');
  });

  it('preserves unsupported sections as unmanaged config', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[fan]\npin: PA8', state);
    expect(result.unmanagedConfigText).toContain('[fan]');
    expect(result.diagnostics.some((item) => item.message.includes('Unsupported section'))).toBe(true);
  });

  it('reports invalid key/value lines and skips visual apply for that section', () => {
    const state = createDefaultState();
    state.values.max_velocity = 200;
    const result = applyConfigTextToState('[printer]\nmax_velocity: 777\nthis is not valid', state);
    expect(result.diagnostics.some((item) => item.message.includes('not a key/value'))).toBe(true);
    expect(result.diagnostics.some((item) => item.message.includes('Skipped visual apply'))).toBe(true);
    expect(state.values.max_velocity).toBe(200);
    expect(result.configLineOverrides.printer.max_velocity).toBe('max_velocity: 777');
    expect(result.configExtraLines.printer).toContain('this is not valid');
  });

  it('preserves hardware lines in known sections after parse and generate', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[stepper_x]\nstep_pin: PB13\ndir_pin: PB12\nenable_pin: !PB14\nposition_min: -10\nposition_max: 230', state);
    state.ui.configLineOverrides = result.configLineOverrides;
    state.ui.configExtraLines = result.configExtraLines;
    const generated = generateConfig(state);
    const stepperX = generated.slice(generated.indexOf('[stepper_x]'), generated.indexOf('[stepper_y]'));
    expect(stepperX).toContain('step_pin: PB13');
    expect(stepperX).toContain('dir_pin: PB12');
    expect(stepperX).toContain('enable_pin: !PB14');
    expect(stepperX).not.toContain('step_pin: CHANGE_ME');
  });

  it('reads second_homing_speed from cartesian axis steppers without warning', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[stepper_x]\nhoming_speed: 55\nsecond_homing_speed: 18', state);
    expect(state.values.homing_speed_x).toBe(55);
    expect(state.values.second_homing_speed).toBe(18);
    expect(result.diagnostics.some((item) => item.message.includes('second_homing_speed'))).toBe(false);
  });

  it('preserves unsupported keys inside known sections in the same section', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[extruder]\nrotation_distance: 22.67\npressure_advance: 0.035', state);
    state.ui.configLineOverrides = result.configLineOverrides;
    const generated = generateConfig(state);
    const extruder = generated.slice(generated.indexOf('[extruder]'));
    expect(extruder).toContain('# Preserved user config');
    expect(extruder).toContain('pressure_advance: 0.035');
    expect(result.diagnostics.some((item) => item.message.includes('pressure_advance'))).toBe(true);
  });

  it('keeps an intentionally empty dirty cfg draft instead of falling back to generated cfg', () => {
    const state = createDefaultState();
    const generated = generateConfig(state);
    state.ui.printerCfgDirty = true;
    state.ui.printerCfgDraft = '';
    expect(getPrinterCfgText(state, generated)).toBe('');
  });

  it('round-trips generated cartesian, extruder, and macro config basics', () => {
    const source = createDefaultState();
    source.values.kinematics = 'cartesian';
    source.values.extruderEnabled = true;
    source.macros[0].name = 'PURGE';
    const generated = appendUnmanagedConfig([generateConfig(source), generateMacrosConfig(source.macros)].join('\n\n'), '[fan]\npin: PA8');
    const target = createDefaultState();
    const result = applyConfigTextToState(generated, target);
    expect(target.values.kinematics).toBe('cartesian');
    expect(target.values.extruderEnabled).toBe(true);
    expect(target.macros.some((macro) => macro.name === 'PURGE')).toBe(true);
    expect(result.unmanagedConfigText).toContain('[fan]');
  });
});
