import { createEffect, createMemo, For, onCleanup, onMount, Show } from 'solid-js';
import { Maximize, MousePointer2, Ruler, ZoomIn, ZoomOut } from 'lucide-solid';
import { areDimensionLayersActive, createDefaultDimensionLayers, dimensionLayerIds, dimensionLayerLabels } from '../kinematics/dimensionLayers';
import { kinematicById } from '../kinematics/catalog';
import { patchUi, setToolhead } from '../store';
import { drawScene } from '../renderers/renderer';
import { drawSideView } from '../renderers/sideViewRenderer';
import { screenToWorld } from '../renderers/canvasPrimitives';
import { isInsideToolhead } from '../renderers/shared';
import type { AppState, DimensionLayerId, DimensionLayers } from '../kinematics/types';
import type { CanvasMap, DrawContext } from '../renderers/canvasTypes';

interface VisualizerCanvasProps {
  state: AppState;
}

export default function VisualizerCanvas(props: VisualizerCanvasProps) {
  let canvas!: HTMLCanvasElement;
  let sideCanvas: HTMLCanvasElement | undefined;
  let map: CanvasMap | null = null;
  let draw: DrawContext | null = null;
  let draggingPan = false;
  let draggingHead = false;
  let suppressNextClick = false;
  let lastX = 0;
  let lastY = 0;
  let headGrabOffsetX = 0;
  let headGrabOffsetY = 0;
  let headDragStartX = 0;
  let headDragStartY = 0;

  const kin = () => kinematicById(props.state.values.kinematics);
  const hasActiveDimensions = createMemo(() => areDimensionLayersActive(props.state.ui.dimensionLayers));

  onMount(() => {
    redraw();
    const resize = () => redraw();
    window.addEventListener('resize', resize);
    onCleanup(() => window.removeEventListener('resize', resize));
  });

  createEffect(() => {
    JSON.stringify(props.state.values);
    JSON.stringify(props.state.toolhead);
    JSON.stringify(props.state.ui);
    JSON.stringify(props.state.macroPreview);
    props.state.macroRun.stepIndex;
    props.state.macroRun.segmentProgress;
    redraw();
  });

  function redraw(): void {
    if (!canvas) return;
    requestAnimationFrame(() => {
      const result = drawScene(canvas, props.state);
      if (!result) return;
      map = result.map;
      draw = result.draw;
      if (props.state.ui.sideViewEnabled && sideCanvas) drawSideView(sideCanvas, props.state);
    });
  }

  function eventPosition(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    patchUi({ zoom: Math.max(0.35, Math.min(10, props.state.ui.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12))) });
  }

  function onMouseDown(event: MouseEvent): void {
    if (!map || !draw) return;
    const pos = eventPosition(event);
    const world = screenToWorld(map, pos.x, pos.y);
    if (props.state.ui.testMode && isInsideToolhead(draw, world.x, world.y)) {
      draggingHead = true;
      suppressNextClick = true;
      headDragStartX = event.clientX;
      headDragStartY = event.clientY;
      headGrabOffsetX = props.state.toolhead.x - world.x;
      headGrabOffsetY = props.state.toolhead.y - world.y;
      return;
    }
    draggingPan = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onMouseMove(event: MouseEvent): void {
    if (!map || !draw) return;
    if (draggingHead) {
      const pos = eventPosition(event);
      const world = screenToWorld(map, pos.x, pos.y);
      setToolhead(world.x + headGrabOffsetX, world.y + headGrabOffsetY);
      if (Math.hypot(event.clientX - headDragStartX, event.clientY - headDragStartY) > 3) suppressNextClick = true;
      return;
    }
    if (draggingPan) {
      patchUi({ panX: props.state.ui.panX + event.clientX - lastX, panY: props.state.ui.panY + event.clientY - lastY });
      lastX = event.clientX;
      lastY = event.clientY;
      return;
    }
    if (props.state.ui.testMode) {
      const pos = eventPosition(event);
      const world = screenToWorld(map, pos.x, pos.y);
      canvas.style.cursor = isInsideToolhead(draw, world.x, world.y) ? 'move' : 'crosshair';
    } else {
      canvas.style.cursor = 'grab';
    }
  }

  function onMouseUp(): void {
    draggingHead = false;
    draggingPan = false;
  }

  function onClick(event: MouseEvent): void {
    if (!props.state.ui.testMode || !map) return;
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const pos = eventPosition(event);
    const world = screenToWorld(map, pos.x, pos.y);
    setToolhead(world.x, world.y);
  }

  function toggleTest(): void {
    patchUi({ testMode: !props.state.ui.testMode });
  }

  function toggleDimensions(): void {
    patchUi({ dimensionMenuOpen: !props.state.ui.dimensionMenuOpen });
  }

  function setDimensionLayer(id: DimensionLayerId, enabled: boolean): void {
    patchUi({ dimensionLayers: { ...props.state.ui.dimensionLayers, [id]: enabled } });
  }

  function setAllDimensionLayers(enabled: boolean): void {
    const next = dimensionLayerIds.reduce<DimensionLayers>((layers, id) => {
      layers[id] = enabled;
      return layers;
    }, createDefaultDimensionLayers());
    patchUi({ dimensionLayers: next });
  }

  function toggleSideView(): void {
    patchUi({ sideViewEnabled: !props.state.ui.sideViewEnabled });
  }

  function zoomBy(factor: number): void {
    patchUi({ zoom: Math.max(0.35, Math.min(10, props.state.ui.zoom * factor)) });
  }

  function fit(): void {
    patchUi({ zoom: 1, panX: 0, panY: 0 });
  }

  return (
    <div class="viewer-shell">
      <div class="topbar">
        <div class="readout">
          <span class="pill">Canvas</span>
          <span class="muted">{kin().name}</span>
        </div>
        <div class="toolbar">
          <div class="dimension-menu-wrap">
            <button type="button" classList={{ success: hasActiveDimensions() }} aria-expanded={props.state.ui.dimensionMenuOpen} onClick={toggleDimensions}><Ruler size={13} />Dims</button>
            <Show when={props.state.ui.dimensionMenuOpen}>
              <div class="dimension-menu">
                <div class="dimension-menu-actions">
                  <button type="button" class="ghost" onClick={() => setAllDimensionLayers(true)}>All</button>
                  <button type="button" class="ghost" onClick={() => setAllDimensionLayers(false)}>None</button>
                </div>
                <For each={dimensionLayerIds}>
                  {(id) => (
                    <label class="dimension-layer-row">
                      <input type="checkbox" checked={props.state.ui.dimensionLayers[id]} onChange={(event) => setDimensionLayer(id, event.currentTarget.checked)} />
                      <span>{dimensionLayerLabels[id]}</span>
                    </label>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <button type="button" classList={{ success: props.state.ui.sideViewEnabled }} onClick={toggleSideView}>Side</button>
          <button type="button" classList={{ primary: props.state.ui.testMode }} onClick={toggleTest}><MousePointer2 size={13} />Test</button>
          <button type="button" class="tool-button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}><ZoomOut size={13} /></button>
          <span class="zoom-label">{Math.round(props.state.ui.zoom * 100)}%</span>
          <button type="button" class="tool-button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><ZoomIn size={13} /></button>
          <button type="button" class="fit-button" onClick={fit}><Maximize size={13} />Fit</button>
        </div>
      </div>

      <div classList={{ 'side-enabled': props.state.ui.sideViewEnabled }} class="viewer-canvas-grid">
        <div class="canvas-shell">
          <canvas
            ref={canvas}
            classList={{ 'test-mode': props.state.ui.testMode, dragging: draggingHead || draggingPan }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onClick={onClick}
          />
        </div>
        <Show when={props.state.ui.sideViewEnabled}>
          <div class="side-view-shell">
            <canvas ref={sideCanvas} aria-label="Z side view" />
          </div>
        </Show>
      </div>
    </div>
  );
}
