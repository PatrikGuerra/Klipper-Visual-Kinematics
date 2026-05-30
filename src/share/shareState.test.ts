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
