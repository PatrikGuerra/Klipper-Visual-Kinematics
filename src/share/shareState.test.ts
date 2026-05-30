import { describe, expect, it } from 'vitest';
import { deflateRaw } from 'pako';
import { createDefaultState } from '../kinematics/defaults';
import { applyPortableShareState, createPortableShareState, decodeShareState, encodeShareState, extractSharePayload } from './shareState';

describe('shareState', () => {
  it('round-trips a compressed share payload', () => {
    const state = createDefaultState();
    state.values.kinematics = 'corexy';
    state.values.max_velocity = 345;
    state.macros[0].name = 'SHARED_MACRO';

    const decoded = decodeShareState(encodeShareState(state));

    expect(decoded.schemaVersion).toBe(1);
    expect(decoded.values.kinematics).toBe('corexy');
    expect(decoded.values.max_velocity).toBe(345);
    expect(decoded.macros[0].name).toBe('SHARED_MACRO');
  });

  it('does not include transient app state in the portable payload', () => {
    const portable = createPortableShareState(createDefaultState()) as unknown as Record<string, unknown>;

    expect(portable.toolhead).toBeUndefined();
    expect(portable.macroPreview).toBeUndefined();
    expect(portable.macroRun).toBeUndefined();
    expect(portable.ui).toBeUndefined();
    expect(portable.printerCfgDraft).toBeUndefined();
  });

  it('applies shared state and recalculates macro preview', () => {
    const source = createDefaultState();
    source.values.kinematics = 'delta';
    source.macros[0].gcode = 'G90\nG0 X10 Y20 Z30 F6000';
    const portable = decodeShareState(encodeShareState(source));
    const target = createDefaultState();

    applyPortableShareState(portable, target);

    expect(target.values.kinematics).toBe('delta');
    expect(target.macroPreview.finalToolhead).toMatchObject({ x: 10, y: 20, z: 30 });
    expect(target.macroRun.playing).toBe(false);
  });

  it('places the imported toolhead at configured home', () => {
    const source = createDefaultState();
    source.values.home_x = 12;
    source.values.home_y = 34;
    source.values.home_z = 5;
    source.toolhead = { x: 999, y: 999, z: 999 };
    const target = createDefaultState();

    applyPortableShareState(decodeShareState(encodeShareState(source)), target);

    expect(target.toolhead).toEqual({ x: 12, y: 34, z: 5 });
  });

  it('places the imported toolhead at the rectangular center when home is incomplete', () => {
    const source = createDefaultState();
    source.values.home_x = '';
    source.values.home_y = '';
    source.values.home_z = '';
    source.values.x_min = 10;
    source.values.x_max = 30;
    source.values.y_min = 20;
    source.values.y_max = 60;
    source.values.z_hop = 7;
    source.toolhead = { x: 999, y: 999, z: 999 };
    const target = createDefaultState();

    applyPortableShareState(decodeShareState(encodeShareState(source)), target);

    expect(target.toolhead).toEqual({ x: 20, y: 40, z: 7 });
  });

  it('preserves manual macro simulation start while excluding transient toolhead', () => {
    const source = createDefaultState();
    source.macros[0].simulationStartMode = 'manual';
    source.macros[0].simulationStart = { x: 1, y: 2, z: 3 };
    source.toolhead = { x: 999, y: 999, z: 999 };
    const target = createDefaultState();

    applyPortableShareState(decodeShareState(encodeShareState(source)), target);

    expect(target.toolhead).not.toEqual(source.toolhead);
    expect(target.macros[0].simulationStartMode).toBe('manual');
    expect(target.macros[0].simulationStart).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('does not change the share payload when only the current toolhead moves', () => {
    const state = createDefaultState();
    const before = encodeShareState(state);

    state.toolhead = { x: state.toolhead.x + 50, y: state.toolhead.y + 25, z: state.toolhead.z + 5 };

    expect(encodeShareState(state)).toBe(before);
  });

  it('rejects invalid payloads and unsupported schema versions', () => {
    expect(() => decodeShareState('not-a-valid-payload')).toThrow('Invalid share URL payload');

    const state = createDefaultState();
    const portable = createPortableShareState(state) as unknown as { schemaVersion: number };
    portable.schemaVersion = 999;
    const payload = encodePayloadObject(portable);
    expect(() => decodeShareState(payload)).toThrow('Unsupported share schema version');
  });

  it('extracts payloads from a URL, hash, or raw payload', () => {
    expect(extractSharePayload('https://example.test/#s=abc_123')).toBe('abc_123');
    expect(extractSharePayload('#s=abc_123')).toBe('abc_123');
    expect(extractSharePayload('abc_123')).toBe('abc_123');
  });
});

function encodePayloadObject(value: unknown): string {
  const bytes = deflateRaw(new TextEncoder().encode(JSON.stringify(value)));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
