import { describe, expect, it } from 'vitest';
import { generateConfig } from './configGenerator';
import { appendUnmanagedConfig, applyConfigTextToState } from './configParser';
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
  });

  it('preserves unsupported sections as unmanaged config', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[fan]\npin: PA8', state);
    expect(result.unmanagedConfigText).toContain('[fan]');
    expect(result.diagnostics.some((item) => item.message.includes('Unsupported section'))).toBe(true);
  });

  it('reports invalid key/value lines without throwing', () => {
    const state = createDefaultState();
    const result = applyConfigTextToState('[printer]\nthis is not valid', state);
    expect(result.diagnostics.some((item) => item.message.includes('not a key/value'))).toBe(true);
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
