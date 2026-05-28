import { num } from '../kinematics/math';
import type { AppState, KinematicDefinition } from '../kinematics/types';
import type { Bounds, DrawContext } from './canvasTypes';
import { label, rect } from './canvasPrimitives';
import { drawRectangularDimensions } from './dimensions';
import { drawProbeFeatures, drawToolhead } from './shared';

export function rectangularBounds(state: AppState): Bounds {
  const v = state.values;
  const bedX0 = num(v.bed_x_offset);
  const bedY0 = num(v.bed_y_offset);
  return {
    minX: Math.min(num(v.x_min), bedX0, bedX0 + num(v.bed_x) / 2 - num(v.plate_x) / 2),
    maxX: Math.max(num(v.x_max), bedX0 + num(v.bed_x), bedX0 + num(v.bed_x) / 2 + num(v.plate_x) / 2),
    minY: Math.min(num(v.y_min), bedY0, bedY0 + num(v.bed_y) / 2 - num(v.plate_y) / 2),
    maxY: Math.max(num(v.y_max), bedY0 + num(v.bed_y), bedY0 + num(v.bed_y) / 2 + num(v.plate_y) / 2)
  };
}

export function renderRectangular(draw: DrawContext, kin: KinematicDefinition): void {
  const { ctx, map, state } = draw;
  const v = state.values;
  const bedX0 = num(v.bed_x_offset);
  const bedY0 = num(v.bed_y_offset);
  const plateX0 = bedX0 + num(v.bed_x) / 2 - num(v.plate_x) / 2;
  const plateY0 = bedY0 + num(v.bed_y) / 2 - num(v.plate_y) / 2;
  rect(ctx, map, plateX0, plateY0, num(v.plate_x), num(v.plate_y), 'rgba(150,160,185,0.04)', 'rgba(150,160,185,0.28)', [6, 4]);
  rect(ctx, map, num(v.x_min), num(v.y_min), num(v.x_max) - num(v.x_min), num(v.y_max) - num(v.y_min), 'rgba(90,162,255,0.06)', 'rgba(90,162,255,0.45)');
  rect(ctx, map, bedX0, bedY0, num(v.bed_x), num(v.bed_y), 'rgba(75,208,139,0.09)', 'rgba(75,208,139,0.75)');
  if (state.values.probeFeaturesEnabled && kin.supportsProbeFeatures) drawProbeFeatures(draw);
  drawRectangularDimensions(draw, bedX0, bedY0, plateX0, plateY0);
  drawToolhead(draw);
  label(ctx, `${kin.name} rectangular workspace`, 10, 18, '#9aa3b8');
}
