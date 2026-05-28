import { num, polarToXY } from '../kinematics/math';
import type { AppState } from '../kinematics/types';
import type { Bounds, DrawContext } from './canvasTypes';
import { circle, label, line, point, rect, tower, worldLabel } from './canvasPrimitives';
import { drawRadialProbeFeatures, drawToolhead } from './shared';

export function radialBounds(radius: number): Bounds {
  const r = Math.max(radius, 10) * 1.35;
  return { minX: -r, maxX: r, minY: -r, maxY: r };
}

export function deltesianBounds(state: AppState): Bounds {
  const v = state.values;
  const maxX = Math.max(num(v.print_width) / 2, Math.abs(num(v.tower_left_x)), Math.abs(num(v.tower_right_x))) * 1.3;
  return { minX: -maxX, maxX, minY: num(v.z_min) - 20, maxY: num(v.z_max) + 40 };
}

export function winchBounds(state: AppState): Bounds {
  const max = state.winches.reduce((acc, w) => Math.max(acc, Math.abs(w.x), Math.abs(w.y)), 180);
  return { minX: -max * 1.25, maxX: max * 1.25, minY: -max * 1.25, maxY: max * 1.25 };
}

export function renderDelta(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  const v = state.values;
  circle(ctx, map, 0, 0, num(v.delta_radius), 'rgba(90,162,255,0.05)', 'rgba(90,162,255,0.35)');
  circle(ctx, map, 0, 0, num(v.print_radius), 'rgba(75,208,139,0.08)', 'rgba(75,208,139,0.75)');
  const towers: Array<[string, number, number, string]> = [
    ['A', num(v.tower_a_x), num(v.tower_a_y), '#f1c84b'],
    ['B', num(v.tower_b_x), num(v.tower_b_y), '#c18cff'],
    ['C', num(v.tower_c_x), num(v.tower_c_y), '#5aa2ff']
  ];
  towers.forEach(([name, x, y, color]) => {
    tower(ctx, map, name, x, y, color);
    line(ctx, map, x, y, state.toolhead.x, state.toolhead.y, 'rgba(241,200,75,0.45)', 1.5);
  });
  drawRadialProbeFeatures(draw);
  drawToolhead(draw);
  label(ctx, 'Linear delta: tower heights use arm_length reach', 10, 18, '#9aa3b8');
}

export function renderDeltesian(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  const v = state.values;
  rect(ctx, map, -num(v.print_width) / 2, 0, num(v.print_width), num(v.z_max), 'rgba(75,208,139,0.07)', 'rgba(75,208,139,0.55)');
  line(ctx, map, num(v.tower_left_x), num(v.z_max), state.toolhead.x, state.toolhead.z, '#f1c84b', 2);
  line(ctx, map, num(v.tower_right_x), num(v.z_max), state.toolhead.x, state.toolhead.z, '#c18cff', 2);
  tower(ctx, map, 'L', num(v.tower_left_x), num(v.z_max), '#f1c84b');
  tower(ctx, map, 'R', num(v.tower_right_x), num(v.z_max), '#c18cff');
  point(ctx, map, state.toolhead.x, state.toolhead.z, 8, '#ef6868');
  worldLabel(ctx, map, `X/Z arm view, Y=${state.toolhead.y.toFixed(1)}`, state.toolhead.x + 8, state.toolhead.z + 8, '#ef6868');
  label(ctx, 'Deltesian: X/Z arms plus independent Y axis', 10, 18, '#9aa3b8');
}

export function renderRotaryDelta(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  const v = state.values;
  circle(ctx, map, 0, 0, num(v.rotary_print_radius), 'rgba(75,208,139,0.08)', 'rgba(75,208,139,0.7)');
  [90, 210, 330].forEach((deg, index) => {
    const t = polarToXY(num(v.shoulder_radius), deg);
    tower(ctx, map, String.fromCharCode(65 + index), t.x, t.y, '#f1c84b');
    line(ctx, map, t.x, t.y, state.toolhead.x, state.toolhead.y, 'rgba(241,200,75,0.45)', 2);
  });
  drawToolhead(draw);
  label(ctx, 'Rotary delta: shoulder anchors and arm angles', 10, 18, '#9aa3b8');
}

export function renderPolar(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  const radius = num(state.values.polar_radius);
  circle(ctx, map, 0, 0, radius, 'rgba(75,208,139,0.08)', 'rgba(75,208,139,0.7)');
  circle(ctx, map, 0, 0, 3, '#f1c84b', '#f1c84b');
  line(ctx, map, 0, 0, state.toolhead.x, state.toolhead.y, '#5aa2ff', 3);
  drawRadialProbeFeatures(draw);
  drawToolhead(draw);
  label(ctx, 'Polar: rotating bed angle + radial arm', 10, 18, '#9aa3b8');
}

export function renderWinch(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  rect(ctx, map, map.minX / 1.25, map.minY / 1.25, (map.maxX - map.minX) / 1.25, (map.maxY - map.minY) / 1.25, 'rgba(90,162,255,0.04)', 'rgba(90,162,255,0.3)', [4, 4]);
  state.winches.forEach((w, index) => {
    line(ctx, map, w.x, w.y, state.toolhead.x, state.toolhead.y, 'rgba(193,140,255,0.45)', 1.5);
    tower(ctx, map, String.fromCharCode(65 + index), w.x, w.y, '#c18cff');
  });
  drawToolhead(draw);
  label(ctx, 'Cable winch: top projection of anchors and cable lengths', 10, 18, '#9aa3b8');
}

export function renderNone(draw: DrawContext): void {
  const { ctx, map } = draw;
  label(ctx, 'Kinematics disabled', map.width / 2, map.height / 2 - 8, '#172033', 'center');
  label(ctx, 'Only a minimal [printer] section is generated.', map.width / 2, map.height / 2 + 14, '#9aa3b8', 'center');
}
