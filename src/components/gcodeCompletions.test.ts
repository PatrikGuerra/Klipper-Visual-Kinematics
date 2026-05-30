import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { createGcodeCompletionSource } from './gcodeCompletions';

describe('gcode completions', () => {
  it('suggests G-code commands after typing G', () => {
    const result = complete('G');

    expect(labels(result)).toContain('G1');
  });

  it('suggests standard temperature and fan commands', () => {
    const result = complete('M');

    expect(labels(result)).toEqual(expect.arrayContaining(['M104', 'M109', 'M140', 'M190', 'M106', 'M107']));
  });

  it('suggests Klipper extended commands', () => {
    const result = complete('BED');

    expect(labels(result)).toEqual(expect.arrayContaining(['BED_MESH_CALIBRATE', 'BED_MESH_PROFILE', 'BED_SCREWS_ADJUST']));
  });

  it('suggests axis and feedrate parameters after a movement command', () => {
    const result = complete('G1 ');

    expect(labels(result)).toEqual(expect.arrayContaining(['X', 'Y', 'Z', 'E', 'F']));
  });

  it('suggests named parameters after extended commands', () => {
    const result = complete('SAVE_GCODE_STATE ');

    expect(labels(result)).toEqual(expect.arrayContaining(['NAME', 'MOVE', 'MOVE_SPEED']));
  });

  it('suggests local macro names', () => {
    const result = complete('C', ['CLEAN_NOZZLE', 'PARK_TOOLHEAD']);

    expect(labels(result)).toContain('CLEAN_NOZZLE');
  });

  it('does not suggest inside comments', () => {
    expect(complete('; G')).toBeNull();
    expect(complete('# G')).toBeNull();
  });

  it('does not suggest inside Jinja templates', () => {
    expect(complete('{% if G')).toBeNull();
    expect(complete('{ printer')).toBeNull();
  });
});

function complete(text: string, macroNames: string[] = []) {
  const state = EditorState.create({ doc: text });
  const context = new CompletionContext(state, text.length, false);
  return createGcodeCompletionSource({ macroNames })(context);
}

function labels(result: ReturnType<ReturnType<typeof createGcodeCompletionSource>>): string[] {
  return result?.options.map((option) => option.label) ?? [];
}
