import type { Bounds, CanvasMap } from './canvasTypes';
import { fmt } from '../kinematics/math';

export function makeMap(stateZoom: number, panX: number, panY: number, width: number, height: number, bounds: Bounds): CanvasMap {
  const pad = 46;
  const worldW = Math.max(1, bounds.maxX - bounds.minX);
  const worldH = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((width - pad * 2) / worldW, (height - pad * 2) / worldH) * stateZoom;
  return {
    ...bounds,
    width,
    height,
    scale,
    padX: (width - worldW * scale) / 2 + panX,
    padY: (height - worldH * scale) / 2 + panY
  };
}

export function worldToScreen(map: CanvasMap, x: number, y: number): { x: number; y: number } {
  return {
    x: map.padX + (x - map.minX) * map.scale,
    y: map.padY + (map.maxY - y) * map.scale
  };
}

export function screenToWorld(map: CanvasMap, x: number, y: number): { x: number; y: number } {
  return {
    x: (x - map.padX) / map.scale + map.minX,
    y: map.maxY - (y - map.padY) / map.scale
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = 'rgba(37,99,235,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function rect(ctx: CanvasRenderingContext2D, map: CanvasMap, x: number, y: number, w: number, h: number, fill: string, stroke: string, dash: number[] = []): void {
  const p = worldToScreen(map, x, y + h);
  ctx.save();
  ctx.setLineDash(dash);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.fillRect(p.x, p.y, w * map.scale, h * map.scale);
  ctx.strokeRect(p.x, p.y, w * map.scale, h * map.scale);
  ctx.restore();
}

export function circle(ctx: CanvasRenderingContext2D, map: CanvasMap, x: number, y: number, radius: number, fill: string, stroke: string): void {
  const p = worldToScreen(map, x, y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * map.scale, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function point(ctx: CanvasRenderingContext2D, map: CanvasMap, x: number, y: number, radius: number, color: string, fill = color): void {
  const p = worldToScreen(map, x, y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function line(ctx: CanvasRenderingContext2D, map: CanvasMap, x1: number, y1: number, x2: number, y2: number, color: string, width = 1, dash: number[] = []): void {
  const a = worldToScreen(map, x1, y1);
  const b = worldToScreen(map, x2, y2);
  ctx.save();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

export function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left'): void {
  ctx.fillStyle = color;
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.textAlign = 'left';
}

export function worldLabel(ctx: CanvasRenderingContext2D, map: CanvasMap, value: string, x: number, y: number, color: string): void {
  const p = worldToScreen(map, x, y);
  label(ctx, value, p.x, p.y, color);
}

export function tower(ctx: CanvasRenderingContext2D, map: CanvasMap, name: string, x: number, y: number, color: string): void {
  point(ctx, map, x, y, 7, color, 'rgba(255,255,255,0.85)');
  worldLabel(ctx, map, name, x + 8, y + 6, color);
}

export function formatPoint(x: number, y: number): string {
  return `X${fmt(x, 1)} Y${fmt(y, 1)}`;
}
