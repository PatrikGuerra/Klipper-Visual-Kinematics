import { fmt } from '../kinematics/math';
import type { DrawContext } from './canvasTypes';
import { line, point, worldLabel } from './canvasPrimitives';

export function drawMacroOverlay(draw: DrawContext): void {
  const preview = draw.state.macroPreview;
  if (!preview?.segments.length) return;
  const current = draw.state.macroRun.stepIndex;

  preview.segments.forEach((segment, index) => {
    if (segment.type === 'move') {
      const isExtruding = segment.extrusionDelta > 0;
      const isStationary = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y) < 0.001;
      const color = segment.outOfBounds ? 'rgba(239,104,104,0.92)' : isExtruding ? 'rgba(75,208,139,0.9)' : index === current ? 'rgba(241,200,75,0.95)' : 'rgba(90,162,255,0.62)';
      if (isExtruding && isStationary) {
        point(draw.ctx, draw.map, segment.to.x, segment.to.y, index === current ? 8 : 6, '#4bd08b', 'rgba(75,208,139,0.26)');
        worldLabel(draw.ctx, draw.map, `purge +${fmt(segment.extrusionDelta, 1)}E`, segment.to.x + 7, segment.to.y + 12, '#4bd08b');
      } else {
        line(draw.ctx, draw.map, segment.from.x, segment.from.y, segment.to.x, segment.to.y, color, isExtruding || index === current ? 3 : 2, segment.outOfBounds ? [6, 3] : []);
      }
    } else if (segment.type === 'pause') {
      point(draw.ctx, draw.map, segment.from.x, segment.from.y, 4, '#f1c84b', 'rgba(241,200,75,0.2)');
    } else if (!segment.simulated) {
      point(draw.ctx, draw.map, segment.from.x, segment.from.y, 3.5, '#9aa3b8', 'rgba(154,163,184,0.18)');
    }
  });

  point(draw.ctx, draw.map, preview.start.x, preview.start.y, 5, '#4bd08b', 'rgba(75,208,139,0.18)');
  worldLabel(draw.ctx, draw.map, 'macro start', preview.start.x + 7, preview.start.y + 7, '#4bd08b');
  point(draw.ctx, draw.map, preview.finalToolhead.x, preview.finalToolhead.y, 5, '#f1c84b', 'rgba(241,200,75,0.2)');
  worldLabel(draw.ctx, draw.map, `macro end X${fmt(preview.finalToolhead.x, 1)} Y${fmt(preview.finalToolhead.y, 1)}`, preview.finalToolhead.x + 7, preview.finalToolhead.y - 8, '#f1c84b');
}
