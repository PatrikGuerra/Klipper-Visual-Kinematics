import { fmt, num } from '../kinematics/math';
import type { AppState, MacroSegment, Toolhead } from '../kinematics/types';

interface ZMap {
  width: number;
  height: number;
  minZ: number;
  maxZ: number;
  axisX: number;
  plotTop: number;
  plotBottom: number;
}

export function drawSideView(canvas: HTMLCanvasElement, state: AppState): void {
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  if (!ctx || !parent) return;

  const width = Math.max(96, parent.clientWidth);
  const height = Math.max(220, parent.clientHeight);
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const map = makeZMap(width, height, state);
  drawFrame(ctx, map);
  drawZLine(ctx, map, num(state.values.z_min), 'min', '#dc2626', [5, 3]);
  drawZLine(ctx, map, num(state.values.z_max), 'max', '#2563eb', []);
  drawZLine(ctx, map, num(state.values.bed_z), 'bed', '#059669', [3, 3]);
  drawMacroZProjection(ctx, map, state);
  drawToolheadZ(ctx, map, state.toolhead);
}

function makeZMap(width: number, height: number, state: AppState): ZMap {
  const zValues = collectPositions(state).map((p) => p.z);
  let minZ = Math.min(num(state.values.z_min), 0, ...zValues);
  let maxZ = Math.max(num(state.values.z_max), num(state.values.bed_z), 1, ...zValues);
  if (maxZ - minZ < 10) maxZ = minZ + 10;

  const zPad = Math.max(5, (maxZ - minZ) * 0.08);
  minZ -= zPad;
  maxZ += zPad;

  return {
    width,
    height,
    minZ,
    maxZ,
    axisX: Math.round(width * 0.46),
    plotTop: 18,
    plotBottom: height - 24
  };
}

function collectPositions(state: AppState): Toolhead[] {
  const preview = state.macroPreview;
  return [
    state.toolhead,
    preview.start,
    preview.finalToolhead,
    ...preview.segments.flatMap((segment) => [segment.from, segment.to])
  ];
}

function zToY(map: ZMap, z: number): number {
  const plotH = map.plotBottom - map.plotTop;
  return map.plotBottom - ((z - map.minZ) / Math.max(1, map.maxZ - map.minZ)) * plotH;
}

function drawFrame(ctx: CanvasRenderingContext2D, map: ZMap): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = map.plotTop + ((map.plotBottom - map.plotTop) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(map.width - 10, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(map.axisX, map.plotTop);
  ctx.lineTo(map.axisX, map.plotBottom);
  ctx.stroke();

  drawAxisArrow(ctx, map.axisX, map.plotTop, '#334155');
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.fillText('Z+', map.axisX + 7, map.plotTop + 5);
  ctx.fillText(`${fmt(map.maxZ, 0)}`, 6, map.plotTop + 5);
  ctx.fillText(`${fmt(map.minZ, 0)}`, 6, map.plotBottom);
  ctx.restore();
}

function drawZLine(ctx: CanvasRenderingContext2D, map: ZMap, z: number, label: string, color: string, dash: number[]): void {
  if (!Number.isFinite(z)) return;
  const y = zToY(map, z);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(12, y);
  ctx.lineTo(map.width - 12, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '10px Segoe UI, sans-serif';
  ctx.fillText(`${label} ${fmt(z, 0)}`, Math.min(map.axisX + 7, map.width - 52), y - 4);
  ctx.restore();
}

function drawMacroZProjection(ctx: CanvasRenderingContext2D, map: ZMap, state: AppState): void {
  const preview = state.macroPreview;
  if (!preview.segments.length) return;
  const current = state.macroRun.stepIndex;
  const trackX = Math.min(map.axisX + 18, map.width - 22);

  ctx.save();
  preview.segments.forEach((segment, index) => {
    if (segment.type !== 'move') {
      drawZPoint(ctx, map, segment.to.z, trackX, segment.type === 'pause' ? '#f59e0b' : '#94a3b8', 3.5);
      return;
    }
    const fromY = zToY(map, segment.from.z);
    const toY = zToY(map, segment.to.z);
    const color = segment.outOfBounds ? '#dc2626' : index === current ? '#f59e0b' : segment.extrusionDelta > 0 ? '#059669' : '#2563eb';
    ctx.strokeStyle = color;
    ctx.lineWidth = index === current ? 3 : 2;
    ctx.setLineDash(segment.outOfBounds ? [5, 3] : []);
    ctx.beginPath();
    ctx.moveTo(trackX, fromY);
    ctx.lineTo(trackX, toY);
    ctx.stroke();
    if (Math.abs(fromY - toY) < 0.001) drawZPoint(ctx, map, segment.to.z, trackX, color, 3.5);
  });
  ctx.setLineDash([]);
  drawZPoint(ctx, map, preview.start.z, trackX, '#059669', 4.5);
  drawZPoint(ctx, map, preview.finalToolhead.z, trackX, '#f59e0b', 4.5);
  ctx.restore();
}

function drawToolheadZ(ctx: CanvasRenderingContext2D, map: ZMap, toolhead: Toolhead): void {
  const y = zToY(map, toolhead.z);
  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.fillStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(map.axisX - 10, y);
  ctx.lineTo(map.axisX + 10, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(map.axisX, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.fillText(`Z${fmt(toolhead.z, 1)}`, Math.min(map.axisX + 12, map.width - 42), y - 8);
  ctx.restore();
}

function drawZPoint(ctx: CanvasRenderingContext2D, map: ZMap, z: number, x: number, color: string, radius: number): void {
  const y = zToY(map, z);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAxisArrow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 4, y + 8);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 4, y + 8);
  ctx.stroke();
}
