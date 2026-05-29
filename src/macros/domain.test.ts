import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../kinematics/defaults';
import { generateMacrosConfig } from './configGenerator';
import { createBlankMacro } from './presets';
import { simulateMacro } from './simulator';
import { validateMacros } from './validators';

describe('macro config generator', () => {
  it('generates macros with normalized indentation', () => {
    const state = createDefaultState();
    state.macros = [
      {
        ...createBlankMacro(state.toolhead),
        name: 'clean_nozzle',
        description: 'Clean nozzle',
        gcode: 'G90\n  G0 X10 Y20 F6000'
      }
    ];
    const cfg = generateMacrosConfig(state.macros);
    expect(cfg).toContain('[gcode_macro CLEAN_NOZZLE]');
    expect(cfg).toContain('description: Clean nozzle');
    expect(cfg).toContain('  G90\n  G0 X10 Y20 F6000');
  });

  it('generates legacy disabled macros because all editor macros are exported', () => {
    const state = createDefaultState();
    state.macros = [
      {
        ...createBlankMacro(state.toolhead),
        name: 'legacy_disabled',
        gcode: 'G90',
        enabled: false
      } as unknown as ReturnType<typeof createBlankMacro>
    ];

    expect(generateMacrosConfig(state.macros)).toContain('[gcode_macro LEGACY_DISABLED]');
  });
});

describe('macro simulator', () => {
  it('resolves absolute, relative, register, and move commands', () => {
    const state = createDefaultState();
    const macro = {
      ...createBlankMacro(state.toolhead),
      gcode: 'G90\nG0 X10 Y10 Z10 F6000\nG91\nG1 X5 Y-5\nG92 X0\nG90\nG1 X20'
    };
    const preview = simulateMacro(macro, state);
    expect(preview.finalToolhead).toMatchObject({ x: 20, y: 5, z: 10 });
    expect(preview.segments.filter((segment) => segment.type === 'move')).toHaveLength(3);
  });

  it('tracks relative extrusion for purge moves', () => {
    const state = createDefaultState();
    const macro = { ...createBlankMacro(state.toolhead), gcode: 'G90\nM83\nG1 E8 F300\nG1 E-1 F1200' };
    const preview = simulateMacro(macro, state);
    expect(preview.finalExtruder).toBe(7);
    expect(preview.totalExtrusion).toBe(8);
    expect(preview.segments.some((segment) => segment.extrusionDelta > 0)).toBe(true);
  });

  it('tracks absolute extrusion and G92 E reset', () => {
    const state = createDefaultState();
    const macro = { ...createBlankMacro(state.toolhead), gcode: 'G90\nM82\nG1 E5 F300\nG92 E0\nG1 E2 F300' };
    const preview = simulateMacro(macro, state);
    expect(preview.finalExtruder).toBe(2);
    expect(preview.totalExtrusion).toBe(7);
  });

  it('preserves unknown commands as unsimulated events', () => {
    const state = createDefaultState();
    const macro = { ...createBlankMacro(state.toolhead), gcode: 'G90\nM117 Hello' };
    const preview = simulateMacro(macro, state);
    expect(preview.segments.some((segment) => segment.command === 'M117 Hello' && !segment.simulated)).toBe(true);
  });

  it('detects jinja as partial preview', () => {
    const state = createDefaultState();
    const macro = { ...createBlankMacro(state.toolhead), gcode: 'G90\n{% for i in range(2) %}\nG1 X10\n{% endfor %}' };
    const preview = simulateMacro(macro, state);
    expect(preview.partial).toBe(true);
    expect(preview.diagnostics.some((item) => item.message.includes('Jinja'))).toBe(true);
  });

  it('detects moves outside travel', () => {
    const state = createDefaultState();
    const macro = { ...createBlankMacro(state.toolhead), gcode: 'G90\nG0 X999 Y999 Z10 F6000' };
    const preview = simulateMacro(macro, state);
    expect(preview.segments.some((segment) => segment.outOfBounds)).toBe(true);
  });
});

describe('macro validators', () => {
  it('validates macro name rules', () => {
    const state = createDefaultState();
    state.macros = [{ ...createBlankMacro(state.toolhead), name: 'CLEAN_1_BAD' }];
    expect(validateMacros(state).some((item) => item.type === 'error')).toBe(true);
  });

  it('validates multiple macros with duplicate names', () => {
    const state = createDefaultState();
    state.macros = [createBlankMacro(state.toolhead, 1), createBlankMacro(state.toolhead, 1)];
    expect(validateMacros(state).some((item) => item.message.includes('duplicated'))).toBe(true);
  });

  it('validates empty gcode for every macro because all macros are exported', () => {
    const state = createDefaultState();
    state.macros = [{ ...createBlankMacro(state.toolhead), name: 'EMPTY_MACRO', gcode: '' }];

    expect(validateMacros(state).some((item) => item.message.includes('empty gcode'))).toBe(true);
  });
});
