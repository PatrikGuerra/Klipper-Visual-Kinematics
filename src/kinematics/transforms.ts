import { kinematicById } from './catalog';
import { distance3d, fmt, letter, num } from './math';
import type { AppState, MotorReadoutRow } from './types';

export function getMotorReadout(state: AppState): MotorReadoutRow[] {
  const v = state.values;
  const kin = kinematicById(v.kinematics);
  const p = state.toolhead;
  const withExtruder = (rows: MotorReadoutRow[]): MotorReadoutRow[] => [...rows, extruderLine(state)];

  if (kin.id === 'cartesian') {
    return withExtruder([line('stepper_x', p.x), line('stepper_y', p.y), line('stepper_z', p.z)]);
  }
  if (kin.id === 'corexy') {
    return withExtruder([line('stepper_x (A = X+Y)', p.x + p.y), line('stepper_y (B = X-Y)', p.x - p.y), line('stepper_z', p.z)]);
  }
  if (kin.id === 'corexz') {
    return withExtruder([line('stepper_x (A = X+Z)', p.x + p.z), line('stepper_y', p.y), line('stepper_z (B = X-Z)', p.x - p.z)]);
  }
  if (kin.id === 'hybrid_corexy') {
    return withExtruder([line('stepper_x (X-Y coupled)', p.x - p.y), line('stepper_y', p.y), line('stepper_z', p.z)]);
  }
  if (kin.id === 'hybrid_corexz') {
    return withExtruder([line('stepper_x (X-Z coupled)', p.x - p.z), line('stepper_y', p.y), line('stepper_z', p.z)]);
  }
  if (kin.id === 'delta') {
    return withExtruder(towerRows(state, [
      ['stepper_a', num(v.tower_a_x), num(v.tower_a_y)],
      ['stepper_b', num(v.tower_b_x), num(v.tower_b_y)],
      ['stepper_c', num(v.tower_c_x), num(v.tower_c_y)]
    ]));
  }
  if (kin.id === 'deltesian') {
    const left = Math.sqrt(Math.max(0, num(v.arm_length) ** 2 - (p.x - num(v.tower_left_x)) ** 2)) + p.z;
    const right = Math.sqrt(Math.max(0, num(v.arm_length) ** 2 - (p.x - num(v.tower_right_x)) ** 2)) + p.z;
    return withExtruder([line('stepper_left', left), line('stepper_right', right), line('stepper_y', p.y)]);
  }
  if (kin.id === 'rotary_delta') {
    return withExtruder([
      { label: 'stepper_a angle', value: angleForTower(state, 90) },
      { label: 'stepper_b angle', value: angleForTower(state, 210) },
      { label: 'stepper_c angle', value: angleForTower(state, 330) }
    ]);
  }
  if (kin.id === 'polar') {
    return withExtruder([
      { label: 'stepper_bed angle', value: `${fmt((Math.atan2(p.y, p.x) * 180) / Math.PI)} deg` },
      line('stepper_arm radius', Math.hypot(p.x, p.y)),
      line('stepper_z', p.z)
    ]);
  }
  if (kin.id === 'winch') {
    return withExtruder(state.winches.map((w, index) =>
      line(`stepper_${letter(index)} cable`, distance3d(p.x, p.y, p.z, num(w.x), num(w.y), num(w.z)))
    ));
  }
  if (kin.id === 'generic_cartesian') {
    return withExtruder(state.genericSteppers.map((s) => ({
      label: `${s.name} (${s.equation})`,
      value: evaluateGenericEquation(s.equation, p)
    })));
  }
  return withExtruder([{ label: 'kinematics', value: 'disabled' }]);
}

function line(label: string, value: number): MotorReadoutRow {
  return { label, value: `${fmt(value)} mm` };
}

function extruderLine(state: AppState): MotorReadoutRow {
  const preview = state.macroPreview;
  const current = preview.segments[state.macroRun.stepIndex];
  const progress = Number.isFinite(state.macroRun.segmentProgress) ? state.macroRun.segmentProgress : 0;
  const e = current ? current.fromE + (current.toE - current.fromE) * progress : preview.finalExtruder || 0;
  const total = preview.totalExtrusion || 0;
  return { label: 'stepper_e', value: `${fmt(e)} mm${total ? ` (+${fmt(total)})` : ''}` };
}

function towerRows(state: AppState, towers: Array<[string, number, number]>): MotorReadoutRow[] {
  const arm = num(state.values.arm_length);
  const p = state.toolhead;
  return towers.map(([name, x, y]) => {
    const height = Math.sqrt(Math.max(0, arm * arm - (p.x - x) ** 2 - (p.y - y) ** 2)) + p.z;
    return line(name, height);
  });
}

function angleForTower(state: AppState, angle: number): string {
  const radius = Math.max(1, num(state.values.shoulder_radius));
  const radians = (angle * Math.PI) / 180;
  const tx = Math.cos(radians) * radius;
  const ty = Math.sin(radians) * radius;
  const p = state.toolhead;
  return `${fmt((Math.atan2(p.z, Math.hypot(p.x - tx, p.y - ty)) * 180) / Math.PI)} deg`;
}

function evaluateGenericEquation(eq: string, p: AppState['toolhead']): string {
  const clean = String(eq || '').toLowerCase().replace(/[^xyz0-9+\-*/().\s]/g, '');
  if (!clean.trim()) return 'n/a';
  try {
    const fn = new Function('x', 'y', 'z', `return (${clean});`) as (x: number, y: number, z: number) => number;
    const value = fn(p.x, p.y, p.z);
    return Number.isFinite(value) ? `${fmt(value)} mm` : 'n/a';
  } catch {
    return 'invalid';
  }
}
