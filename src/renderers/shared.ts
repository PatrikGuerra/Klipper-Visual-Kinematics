import type { DrawContext } from './canvasTypes';
import { formatPoint, label, line, point, rect, worldLabel, worldToScreen } from './canvasPrimitives';
import { num } from '../kinematics/math';

export function drawProbeFeatures(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  const v = state.values;
  rect(ctx, map, num(v.mesh_xmin), num(v.mesh_ymin), num(v.mesh_xmax) - num(v.mesh_xmin), num(v.mesh_ymax) - num(v.mesh_ymin), 'rgba(90,162,255,0.08)', 'rgba(90,162,255,0.55)', [5, 3]);
  const countX = Math.max(2, Math.round(num(v.mesh_countx) || 2));
  const countY = Math.max(2, Math.round(num(v.mesh_county) || 2));
  for (let ix = 0; ix < countX; ix += 1) {
    for (let iy = 0; iy < countY; iy += 1) {
      const x = num(v.mesh_xmin) + (ix * (num(v.mesh_xmax) - num(v.mesh_xmin))) / (countX - 1);
      const y = num(v.mesh_ymin) + (iy * (num(v.mesh_ymax) - num(v.mesh_ymin))) / (countY - 1);
      point(ctx, map, x, y, 2.8, '#4bd08b');
    }
  }
  if (state.values.screwsEnabled) {
    state.screws.forEach((s, index) => {
      point(ctx, map, s.x, s.y, 6, '#c18cff', 'rgba(193,140,255,0.2)');
      worldLabel(ctx, map, String(index + 1), s.x + 7, s.y + 5, '#c18cff');
    });
  }
}

export function drawRadialProbeFeatures(draw: DrawContext): void {
  const { ctx, map, state } = draw;
  if (!state.values.probeFeaturesEnabled) return;
  const v = state.values;
  rect(ctx, map, num(v.mesh_xmin), num(v.mesh_ymin), num(v.mesh_xmax) - num(v.mesh_xmin), num(v.mesh_ymax) - num(v.mesh_ymin), 'rgba(90,162,255,0.05)', 'rgba(90,162,255,0.38)', [5, 3]);
}

export function drawToolhead(draw: DrawContext): void {
  const { ctx, map, state, kin } = draw;
  const v = state.values;
  const p = state.toolhead;
  const probeX = p.x + num(v.probe_x_offset);
  const probeY = p.y + num(v.probe_y_offset);
  if (state.ui.testMode) drawHeadAssembly(draw);
  point(ctx, map, p.x, p.y, 7, '#ef6868', 'rgba(239,104,104,0.22)');
  worldLabel(ctx, map, `nozzle ${formatPoint(p.x, p.y)}`, p.x + 8, p.y + 8, '#ef6868');
  if (kin.supportsProbeFeatures && v.probeFeaturesEnabled) {
    line(ctx, map, p.x, p.y, probeX, probeY, 'rgba(241,200,75,0.55)', 1.5, [4, 3]);
    point(ctx, map, probeX, probeY, 6, '#f1c84b', 'rgba(241,200,75,0.2)');
    worldLabel(ctx, map, 'probe', probeX + 8, probeY - 8, '#f1c84b');
  }
}

function drawHeadAssembly(draw: DrawContext): void {
  const { ctx, map } = draw;
  const b = toolheadBounds(draw);
  const tl = worldToScreen(map, b.minX, b.maxY);
  const br = worldToScreen(map, b.maxX, b.minY);
  ctx.save();
  ctx.fillStyle = 'rgba(90,162,255,0.07)';
  ctx.strokeStyle = 'rgba(90,162,255,0.48)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 3]);
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  ctx.restore();
  label(ctx, 'drag head', tl.x + 4, tl.y + 12, 'rgba(90,162,255,0.75)');
}

export function toolheadBounds(draw: DrawContext): { minX: number; maxX: number; minY: number; maxY: number } {
  const { state, kin, map } = draw;
  const v = state.values;
  const p = state.toolhead;
  const useProbe = kin.supportsProbeFeatures && !!v.probeFeaturesEnabled;
  const probeX = useProbe ? p.x + num(v.probe_x_offset) : p.x;
  const probeY = useProbe ? p.y + num(v.probe_y_offset) : p.y;
  const pad = Math.max(8, 18 / map.scale);
  return {
    minX: Math.min(p.x, probeX) - pad,
    maxX: Math.max(p.x, probeX) + pad,
    minY: Math.min(p.y, probeY) - pad,
    maxY: Math.max(p.y, probeY) + pad
  };
}

export function isInsideToolhead(draw: DrawContext, x: number, y: number): boolean {
  const b = toolheadBounds(draw);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}
