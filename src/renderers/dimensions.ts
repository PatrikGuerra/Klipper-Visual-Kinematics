import { areDimensionLayersActive } from '../kinematics/dimensionLayers';
import { fmt, num } from '../kinematics/math';
import { screwReferenceOrigin } from '../kinematics/screwReference';
import type { CanvasMap, DrawContext } from './canvasTypes';
import { line, point, worldToScreen } from './canvasPrimitives';

interface RectDimension {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  horizontalOffset: number;
  verticalOffset: number;
  horizontalGuideY?: number;
  verticalGuideX?: number;
}

export function drawRectangularDimensions(draw: DrawContext, bedX0: number, bedY0: number, plateX0: number, plateY0: number): void {
  const { ctx, map, state, kin } = draw;
  const layers = state.ui.dimensionLayers;
  if (!areDimensionLayersActive(layers)) return;

  const v = state.values;
  const bed = { x: bedX0, y: bedY0, w: num(v.bed_x), h: num(v.bed_y) };
  const plate = { x: plateX0, y: plateY0, w: num(v.plate_x), h: num(v.plate_y) };
  const travel = { x: num(v.x_min), y: num(v.y_min), w: num(v.x_max) - num(v.x_min), h: num(v.y_max) - num(v.y_min) };
  const mesh = { x: num(v.mesh_xmin), y: num(v.mesh_ymin), w: num(v.mesh_xmax) - num(v.mesh_xmin), h: num(v.mesh_ymax) - num(v.mesh_ymin) };
  const meshAvailable = !!state.values.probeFeaturesEnabled && kin.supportsProbeFeatures;
  const guideRights = [
    layers.bedPhysicalSize ? plate.x + plate.w : undefined,
    layers.usableBed ? bed.x + bed.w : undefined,
    layers.travelLimits ? travel.x + travel.w : undefined,
    layers.meshBounds && meshAvailable ? mesh.x + mesh.w : undefined
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const outerRight = guideRights.length ? Math.max(...guideRights) : Math.max(bed.x + bed.w, plate.x + plate.w);
  const guideTops = [
    layers.bedPhysicalSize ? plate.y + plate.h : undefined,
    layers.usableBed ? bed.y + bed.h : undefined,
    layers.travelLimits ? travel.y + travel.h : undefined,
    layers.meshBounds && meshAvailable ? mesh.y + mesh.h : undefined
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const outerTop = guideTops.length ? Math.max(...guideTops) : Math.max(bed.y + bed.h, plate.y + plate.h);

  if (layers.bedPhysicalSize) {
    drawRectDimension(draw, {
      ...plate,
      label: `Bed physical size ${fmt(plate.w, 0)} x ${fmt(plate.h, 0)} mm`,
      color: '#64748b',
      horizontalOffset: 18,
      verticalOffset: 18,
      horizontalGuideY: outerTop,
      verticalGuideX: outerRight
    });
  }

  if (layers.usableBed) {
    drawRectDimension(draw, {
      ...bed,
      label: `Usable bed ${fmt(bed.w, 0)} x ${fmt(bed.h, 0)} mm`,
      color: '#059669',
      horizontalOffset: 42,
      verticalOffset: 42,
      horizontalGuideY: outerTop,
      verticalGuideX: outerRight
    });
  }

  if (layers.usableBedOffset) drawBedOffsetDimension(draw, bed.x, bed.y);

  if (layers.travelLimits) {
    drawRectDimension(draw, {
      ...travel,
      label: `Travel ${fmt(travel.w, 0)} x ${fmt(travel.h, 0)} mm`,
      color: '#2563eb',
      horizontalOffset: 66,
      verticalOffset: 66,
      horizontalGuideY: outerTop,
      verticalGuideX: outerRight
    });
  }

  if (layers.meshBounds && meshAvailable) {
    drawRectDimension(draw, {
      ...mesh,
      label: `[bed_mesh] ${fmt(mesh.w, 0)} x ${fmt(mesh.h, 0)} mm`,
      color: '#0f766e',
      horizontalOffset: 90,
      verticalOffset: 90,
      horizontalGuideY: outerTop,
      verticalGuideX: outerRight
    });
  }

  if (layers.probeOffset && meshAvailable) drawProbeOffsetDimension(draw);
  if (layers.screwPositions && meshAvailable && state.values.screwsEnabled) drawScrewPositionDimensions(draw);
}

function drawRectDimension(draw: DrawContext, rect: RectDimension): void {
  if (rect.w <= 0 || rect.h <= 0) return;
  drawHorizontalDimension(draw.ctx, draw.map, rect.x, rect.x + rect.w, rect.y + rect.h, rect.horizontalGuideY ?? rect.y + rect.h, rect.horizontalOffset, rect.label, rect.color);
  drawVerticalDimension(draw.ctx, draw.map, rect.y, rect.y + rect.h, rect.x + rect.w, rect.verticalGuideX ?? rect.x + rect.w, rect.verticalOffset, `${fmt(rect.h, 0)} mm`, rect.color);
}

function drawBedOffsetDimension(draw: DrawContext, x: number, y: number): void {
  const { ctx, map } = draw;
  const origin = worldToScreen(map, 0, 0);
  const bedOrigin = worldToScreen(map, x, y);
  const color = '#7c3aed';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(bedOrigin.x, origin.y);
  ctx.lineTo(bedOrigin.x, bedOrigin.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawScreenTick(ctx, origin.x, origin.y, color);
  drawScreenTick(ctx, bedOrigin.x, bedOrigin.y, color);

  if (Math.abs(x) > 0.001) {
    drawScreenLabel(ctx, `X offset ${fmt(x, 1)} mm`, (origin.x + bedOrigin.x) / 2, origin.y - 8, color, 'center');
  }
  if (Math.abs(y) > 0.001) {
    drawScreenLabel(ctx, `Y offset ${fmt(y, 1)} mm`, bedOrigin.x + 8, (origin.y + bedOrigin.y) / 2, color, 'left');
  }
  if (Math.abs(x) <= 0.001 && Math.abs(y) <= 0.001) {
    drawScreenLabel(ctx, 'Bed offset X0 Y0', bedOrigin.x + 8, bedOrigin.y - 8, color, 'left');
  }
  drawScreenLabel(ctx, 'origin', origin.x + 7, origin.y + 13, '#64748b', 'left');
  ctx.restore();
}

function drawProbeOffsetDimension(draw: DrawContext): void {
  const { state } = draw;
  const v = state.values;
  const p = state.toolhead;
  const probeX = p.x + num(v.probe_x_offset);
  const probeY = p.y + num(v.probe_y_offset);
  const color = '#d97706';

  line(draw.ctx, draw.map, p.x, p.y, probeX, probeY, color, 2.2, [5, 3]);
  point(draw.ctx, draw.map, p.x, p.y, 5, '#ef4444', 'rgba(239,68,68,0.2)');
  point(draw.ctx, draw.map, probeX, probeY, 5, color, 'rgba(217,119,6,0.2)');
  const labelPoint = worldToScreen(draw.map, (p.x + probeX) / 2, (p.y + probeY) / 2);
  drawScreenLabel(draw.ctx, `Probe offset X${fmt(num(v.probe_x_offset), 1)} Y${fmt(num(v.probe_y_offset), 1)}`, labelPoint.x + 8, labelPoint.y - 8, color, 'left');
}

function drawScrewPositionDimensions(draw: DrawContext): void {
  const color = '#9333ea';
  const origin = screwReferenceOrigin(draw.state.values);
  draw.state.screws.forEach((screw, index) => {
    const p = worldToScreen(draw.map, screw.x, screw.y);
    const dx = screw.x - origin.x;
    const dy = screw.y - origin.y;
    point(draw.ctx, draw.map, screw.x, screw.y, 6, color, 'rgba(147,51,234,0.16)');
    drawScreenLabel(draw.ctx, `${index + 1}: X${fmt(dx, 0)} Y${fmt(dy, 0)}`, p.x + 9, p.y - 8, color, 'left');
  });
}

function drawHorizontalDimension(ctx: CanvasRenderingContext2D, map: CanvasMap, x1: number, x2: number, edgeY: number, guideY: number, offsetPx: number, text: string, color: string): void {
  const left = worldToScreen(map, Math.min(x1, x2), edgeY);
  const right = worldToScreen(map, Math.max(x1, x2), edgeY);
  const guide = worldToScreen(map, Math.min(x1, x2), guideY);
  const lineY = guide.y - Math.abs(offsetPx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(left.x, lineY);
  ctx.moveTo(right.x, right.y);
  ctx.lineTo(right.x, lineY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(left.x, lineY);
  ctx.lineTo(right.x, lineY);
  ctx.stroke();
  drawArrowTick(ctx, left.x, lineY, 1, color);
  drawArrowTick(ctx, right.x, lineY, -1, color);
  drawScreenLabel(ctx, text, (left.x + right.x) / 2, lineY + (offsetPx < 0 ? -5 : 15), color, 'center');
  ctx.restore();
}

function drawVerticalDimension(ctx: CanvasRenderingContext2D, map: CanvasMap, y1: number, y2: number, edgeX: number, guideX: number, offsetPx: number, text: string, color: string): void {
  const bottom = worldToScreen(map, edgeX, Math.min(y1, y2));
  const top = worldToScreen(map, edgeX, Math.max(y1, y2));
  const topGuide = worldToScreen(map, guideX, Math.max(y1, y2));
  const lineX = topGuide.x + Math.abs(offsetPx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(lineX, top.y);
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(lineX, bottom.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(lineX, top.y);
  ctx.lineTo(lineX, bottom.y);
  ctx.stroke();
  drawVerticalTick(ctx, lineX, top.y, 1, color);
  drawVerticalTick(ctx, lineX, bottom.y, -1, color);
  drawScreenLabel(ctx, text, lineX + 8, (top.y + bottom.y) / 2, color, 'left');
  ctx.restore();
}

function drawArrowTick(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * 7, y - 4);
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * 7, y + 4);
  ctx.stroke();
}

function drawVerticalTick(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 4, y + dir * 7);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 4, y + dir * 7);
  ctx.stroke();
}

function drawScreenTick(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 4, y);
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.stroke();
}

function drawScreenLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign): void {
  ctx.save();
  ctx.font = '11px Segoe UI, sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 4;
  const height = 14;
  const width = metrics.width + padX * 2;
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const top = y - height + 3;

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}
