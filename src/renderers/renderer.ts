import { kinematicById } from '../kinematics/catalog';
import { num } from '../kinematics/math';
import type { AppState } from '../kinematics/types';
import type { CanvasMap, DrawContext } from './canvasTypes';
import { drawGrid, makeMap } from './canvasPrimitives';
import { rectangularBounds, renderRectangular } from './rectangularRenderer';
import { deltesianBounds, radialBounds, renderDelta, renderDeltesian, renderNone, renderPolar, renderRotaryDelta, renderWinch, winchBounds } from './radialRenderers';
import { drawMacroOverlay } from './macroOverlay';

export function drawScene(canvas: HTMLCanvasElement, state: AppState): { map: CanvasMap; draw: DrawContext } | null {
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  if (!ctx || !parent) return null;
  const width = Math.max(320, parent.clientWidth);
  const height = Math.max(240, parent.clientHeight);
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height);

  const kin = kinematicById(state.values.kinematics);
  const radius =
    kin.family === 'delta'
      ? Math.max(num(state.values.delta_radius), num(state.values.print_radius), 10)
      : kin.family === 'rotary_delta'
        ? Math.max(num(state.values.shoulder_radius), num(state.values.rotary_print_radius), 10)
        : kin.family === 'polar'
          ? Math.max(num(state.values.polar_radius), 10)
          : 100;
  const bounds =
    kin.family === 'rectangular' || kin.family === 'generic_cartesian'
      ? rectangularBounds(state)
      : kin.family === 'deltesian'
        ? deltesianBounds(state)
        : kin.family === 'winch'
          ? winchBounds(state)
          : kin.family === 'none'
            ? { minX: -100, maxX: 100, minY: -100, maxY: 100 }
            : radialBounds(radius);
  const map = makeMap(state.ui.zoom, state.ui.panX, state.ui.panY, width, height, bounds);
  const draw = { ctx, map, state, kin };

  if (kin.family === 'rectangular' || kin.family === 'generic_cartesian') renderRectangular(draw, kin);
  else if (kin.family === 'delta') renderDelta(draw);
  else if (kin.family === 'deltesian') renderDeltesian(draw);
  else if (kin.family === 'rotary_delta') renderRotaryDelta(draw);
  else if (kin.family === 'polar') renderPolar(draw);
  else if (kin.family === 'winch') renderWinch(draw);
  else renderNone(draw);

  drawMacroOverlay(draw);

  return { map, draw };
}
