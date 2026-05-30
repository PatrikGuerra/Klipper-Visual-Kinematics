import { createEffect, createMemo, onCleanup, Show, For } from 'solid-js';
import { CircleHelp, Copy, Eye, Pause, Play, Plus, RotateCcw, Sparkles, SquareParking, StepForward, Trash2 } from 'lucide-solid';
import { updateActiveMacro, updateMutable } from '../store';
import { createBlankMacro, createNozzleCleaningMacro, createParkToolheadMacro } from '../macros/presets';
import { simulateMacro } from '../macros/simulator';
import type { AppState, MacroDefinition, MacroSegment, Toolhead } from '../kinematics/types';

interface MacroPanelProps {
  state: AppState;
  vertical?: boolean;
}

export default function MacroPanel(props: MacroPanelProps) {
  let animationFrame: number | undefined;
  let animationSpeed = 0;
  let animationStartedAt = 0;
  let animatedSegmentIndex = -999;

  const activeMacro = createMemo(() => props.state.macros.find((macro) => macro.id === props.state.activeMacroId) ?? props.state.macros[0]);
  const macroDiagnostics = createMemo(() => (props.state.macroPreview.macroId === activeMacro()?.id ? props.state.macroPreview.diagnostics : []));
  const finalExtruder = createMemo(() => Number(props.state.macroPreview.finalExtruder ?? 0));
  const totalExtrusion = createMemo(() => Number(props.state.macroPreview.totalExtrusion ?? 0));

  createEffect(() => {
    if (props.state.macroRun.playing) startAnimation(props.state.macroRun.speed);
    else stopAnimation();
  });

  onCleanup(stopAnimation);

  function startAnimation(speed: number): void {
    if (animationFrame && animationSpeed === speed) return;
    stopAnimation();
    animationSpeed = speed;
    animationStartedAt = 0;
    animatedSegmentIndex = -999;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function stopAnimation(): void {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    animationSpeed = 0;
    animationStartedAt = 0;
    animatedSegmentIndex = -999;
  }

  function animate(now: number): void {
    let keepGoing = true;
    updateMutable((draft) => {
      const macro = draft.macros.find((item) => item.id === draft.activeMacroId);
      if (!macro) {
        draft.macroRun.playing = false;
        keepGoing = false;
        return;
      }
      if (draft.macroPreview.macroId !== macro.id) draft.macroPreview = simulateMacro(macro, draft);
      const segments = draft.macroPreview.segments;
      if (!segments.length) {
        draft.macroRun.playing = false;
        keepGoing = false;
        return;
      }

      let index = draft.macroRun.stepIndex;
      if (index < 0 || index >= segments.length) {
        index = advanceIndex(segments, -1, draft.macroRun.loopPreview);
        draft.macroRun.stepIndex = index;
        draft.macroRun.segmentProgress = 0;
      }
      if (index < 0) {
        draft.macroRun.playing = false;
        keepGoing = false;
        return;
      }

      let segment = segments[index];
      while (segment.type === 'event') {
        draft.toolhead = { ...segment.to };
        const next = advanceIndex(segments, index, draft.macroRun.loopPreview);
        if (next < 0) {
          draft.macroRun.playing = false;
          draft.macroRun.stepIndex = index;
          draft.macroRun.segmentProgress = 1;
          keepGoing = false;
          return;
        }
        index = next;
        segment = segments[index];
        draft.macroRun.stepIndex = index;
        draft.macroRun.segmentProgress = 0;
        animatedSegmentIndex = -999;
      }

      const duration = segmentDurationMs(segment) / Math.max(0.25, draft.macroRun.speed);
      if (animatedSegmentIndex !== index) {
        animatedSegmentIndex = index;
        animationStartedAt = now - draft.macroRun.segmentProgress * duration;
      }

      const progress = Math.max(0, Math.min(1, (now - animationStartedAt) / duration));
      const eased = segment.type === 'move' ? smoothstep(progress) : progress;
      draft.toolhead = interpolate(segment.from, segment.to, eased);
      draft.macroRun.stepIndex = index;
      draft.macroRun.segmentProgress = progress;

      if (progress >= 1) {
        draft.toolhead = { ...segment.to };
        const next = advanceIndex(segments, index, draft.macroRun.loopPreview);
        if (next < 0) {
          draft.macroRun.playing = false;
          keepGoing = false;
          return;
        }
        draft.macroRun.stepIndex = next;
        draft.macroRun.segmentProgress = 0;
        animatedSegmentIndex = -999;
      }
    });

    if (keepGoing) animationFrame = window.requestAnimationFrame(animate);
    else stopAnimation();
  }

  function updateActive(mutator: (macro: MacroDefinition) => void, refreshPreview = true): void {
    updateActiveMacro(mutator, refreshPreview);
  }

  function addMacro(kind: 'blank' | 'clean' | 'park'): void {
    updateMutable((draft) => {
      const next =
        kind === 'clean'
          ? createNozzleCleaningMacro(draft)
          : kind === 'park'
            ? createParkToolheadMacro(draft)
            : createBlankMacro(draft.toolhead, draft.macros.length + 1);
      draft.macros.push(next);
      draft.activeMacroId = next.id;
      draft.macroPreview = simulateMacro(next, draft);
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    });
  }

  function duplicateMacro(): void {
    const macro = activeMacro();
    if (!macro) return;
    updateMutable((draft) => {
      const source = draft.macros.find((item) => item.id === draft.activeMacroId);
      if (!source) return;
      const copy: MacroDefinition = {
        ...source,
        id: `macro-${Date.now()}-${Math.round(Math.random() * 100000)}`,
        name: `${source.name}_COPY`,
        description: source.description ? `${source.description} copy` : 'Macro copy'
      };
      draft.macros.push(copy);
      draft.activeMacroId = copy.id;
      draft.macroPreview = simulateMacro(copy, draft);
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    });
  }

  function deleteMacro(): void {
    updateMutable((draft) => {
      draft.macros = draft.macros.filter((macro) => macro.id !== draft.activeMacroId);
      if (!draft.macros.length) draft.macros.push(createBlankMacro(draft.toolhead, 1));
      draft.activeMacroId = draft.macros[0].id;
      draft.macroPreview = simulateMacro(draft.macros[0], draft);
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    });
  }

  function setActive(id: string): void {
    updateMutable((draft) => {
      draft.activeMacroId = id;
      const macro = draft.macros.find((item) => item.id === id);
      if (macro) draft.macroPreview = simulateMacro(macro, draft);
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    });
  }

  function setSimulationStartMode(mode: 'current' | 'manual'): void {
    updateActive((item) => {
      item.simulationStartMode = mode;
    });
  }

  function preview(): void {
    updateMutable((draft) => {
      const macro = draft.macros.find((item) => item.id === draft.activeMacroId);
      if (!macro) return;
      draft.macroPreview = simulateMacro(macro, draft);
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
    });
  }

  function stepPreview(): void {
    updateMutable((draft) => {
      const macro = draft.macros.find((item) => item.id === draft.activeMacroId);
      if (!macro) return;
      if (draft.macroPreview.macroId !== macro.id) draft.macroPreview = simulateMacro(macro, draft);
      const segments = draft.macroPreview.segments;
      if (!segments.length) {
        draft.macroRun.playing = false;
        return;
      }
      let next = draft.macroRun.stepIndex + 1;
      if (next >= segments.length) {
        if (!draft.macroRun.loopPreview) {
          draft.macroRun.playing = false;
          return;
        }
        next = 0;
      }
      const segment = segments[next];
      draft.macroRun.stepIndex = next;
      draft.macroRun.segmentProgress = 1;
      draft.toolhead = { ...segment.to };
    });
  }

  function resetPreview(): void {
    updateMutable((draft) => {
      draft.macroRun = { ...draft.macroRun, playing: false, stepIndex: -1, segmentProgress: 0 };
      if (draft.macroPreview.macroId) draft.toolhead = { ...draft.macroPreview.start };
    });
  }

  function togglePlay(): void {
    updateMutable((draft) => {
      draft.macroRun.playing = !draft.macroRun.playing;
    });
  }

  function advanceIndex(segments: MacroSegment[], current: number, loop: boolean): number {
    const next = current + 1;
    if (next < segments.length) return next;
    return loop && segments.length ? 0 : -1;
  }

  function segmentDurationMs(segment: MacroSegment): number {
    if (segment.type === 'pause') return Math.max(180, Math.min(segment.durationMs ?? 450, 2500));
    if (segment.type !== 'move') return 90;
    const distance = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y, segment.to.z - segment.from.z);
    const extrusionDistance = Math.abs(segment.extrusionDelta);
    if (distance < 0.001 && extrusionDistance > 0) {
      const feedrate = Math.max(1, segment.feedrate ?? 300);
      const physicalMs = (extrusionDistance / (feedrate / 60)) * 1000;
      return Math.max(250, Math.min(physicalMs, 2200));
    }
    const feedrate = Math.max(1, segment.feedrate ?? 6000);
    const physicalMs = (distance / (feedrate / 60)) * 1000;
    return Math.max(180, Math.min(physicalMs, 2200));
  }

  function interpolate(from: Toolhead, to: Toolhead, progress: number): Toolhead {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      z: from.z + (to.z - from.z) * progress
    };
  }

  function smoothstep(value: number): number {
    return value * value * (3 - 2 * value);
  }

  return (
    <section classList={{ panel: !props.vertical, 'macro-panel-vertical': !!props.vertical, collapsed: !props.vertical && props.state.ui.macroOutputCollapsed }} class="macro-panel">
      <div class="panel-title macro-panel-title">
        <Show when={props.vertical} fallback={<button type="button" class="collapse-toggle" aria-expanded={!props.state.ui.macroOutputCollapsed} onClick={() => updateMutable((draft) => (draft.ui.macroOutputCollapsed = !draft.ui.macroOutputCollapsed))}><span>{props.state.ui.macroOutputCollapsed ? '>' : 'v'}</span><span>Macros</span></button>}>
          <></>
        </Show>
        <div class="button-row">
          <button type="button" class="primary" onClick={() => addMacro('blank')}><Plus size={14} />Add Macro</button>
          <button type="button" class="success" onClick={() => addMacro('clean')}><Sparkles size={14} />Nozzle Cleaning</button>
          <button type="button" class="warning" onClick={() => addMacro('park')}><SquareParking size={14} />Park</button>
        </div>
      </div>

      <Show when={(props.vertical || !props.state.ui.macroOutputCollapsed) && activeMacro()}>
        {(macro) => (
          <>
            <div class="macro-grid">
              <div class="macro-controls">
                <div class="macro-block-divider"></div>
                <div>
                  <label for="active-macro">Active macro</label>
                  <select id="active-macro" value={macro().id} onChange={(event) => setActive(event.currentTarget.value)}>
                    <For each={props.state.macros}>{(item) => <option value={item.id}>{item.name}</option>}</For>
                  </select>
                </div>

                <div class="button-row macro-actions">
                  <button type="button" onClick={duplicateMacro}><Copy size={14} />Duplicate</button>
                  <button type="button" class="danger" onClick={deleteMacro}><Trash2 size={14} />Delete</button>
                </div>

                <div class="macro-block-divider"></div>
                <div class="field-grid">
                  <div class="field">
                    <label for="macro-name">Macro name</label>
                    <input id="macro-name" type="text" value={macro().name} onInput={(event) => updateActive((item) => (item.name = event.currentTarget.value))} />
                  </div>
                  <div class="field">
                    <span class="field-label">Simulation start</span>
                    <div class="sim-start-options" role="radiogroup" aria-label="Simulation start">
                      <label classList={{ active: macro().simulationStartMode === 'current' }} class="sim-start-option">
                        <input type="radio" name={`macro-start-mode-${macro().id}`} checked={macro().simulationStartMode === 'current'} onChange={() => setSimulationStartMode('current')} />
                        <span>Current toolhead</span>
                        <span class="help-icon" title="Starts the macro preview from the current visual toolhead position. Moving the head updates the next preview start."><CircleHelp size={13} /></span>
                      </label>
                      <label classList={{ active: macro().simulationStartMode === 'manual' }} class="sim-start-option">
                        <input type="radio" name={`macro-start-mode-${macro().id}`} checked={macro().simulationStartMode === 'manual'} onChange={() => setSimulationStartMode('manual')} />
                        <span>Manual XYZ</span>
                        <span class="help-icon" title="Starts the macro preview from the fixed X/Y/Z values below, independent of the current toolhead position."><CircleHelp size={13} /></span>
                      </label>
                    </div>
                  </div>
                  <div class="field full">
                    <label for="macro-description">Description</label>
                    <input id="macro-description" type="text" value={macro().description} onInput={(event) => updateActive((item) => (item.description = event.currentTarget.value), false)} />
                  </div>
                </div>

                <Show when={macro().simulationStartMode === 'manual'}>
                  <div class="field-grid">
                    <div class="field"><label for="macro-start-x">Start X</label><input id="macro-start-x" type="number" step="0.1" value={macro().simulationStart.x} onInput={(event) => updateActive((item) => (item.simulationStart.x = Number(event.currentTarget.value)))} /></div>
                    <div class="field"><label for="macro-start-y">Start Y</label><input id="macro-start-y" type="number" step="0.1" value={macro().simulationStart.y} onInput={(event) => updateActive((item) => (item.simulationStart.y = Number(event.currentTarget.value)))} /></div>
                    <div class="field"><label for="macro-start-z">Start Z</label><input id="macro-start-z" type="number" step="0.1" value={macro().simulationStart.z} onInput={(event) => updateActive((item) => (item.simulationStart.z = Number(event.currentTarget.value)))} /></div>
                  </div>
                </Show>

                <div class="run-controls">
                  <button type="button" class="primary" onClick={preview}><Eye size={14} />Preview</button>
                  <button type="button" class="warning" onClick={stepPreview}><StepForward size={14} />Step</button>
                  <button type="button" class={props.state.macroRun.playing ? 'warning' : 'success'} onClick={togglePlay}>
                    <Show when={props.state.macroRun.playing} fallback={<><Play size={14} />Play</>}><Pause size={14} />Pause</Show>
                  </button>
                  <button type="button" onClick={resetPreview}><RotateCcw size={14} />Reset</button>
                  <label class="toggle">
                    <input type="checkbox" checked={props.state.macroRun.loopPreview} onChange={(event) => updateMutable((draft) => (draft.macroRun.loopPreview = event.currentTarget.checked))} />
                    <span>Loop</span>
                  </label>
                  <label class="speed-control">
                    <span>Speed</span>
                    <input type="range" min="0.25" max="4" step="0.25" value={props.state.macroRun.speed} onInput={(event) => updateMutable((draft) => (draft.macroRun.speed = Number(event.currentTarget.value)))} />
                  </label>
                </div>
              </div>

              <div class="macro-editor">
                <label for="macro-params">Optional config lines before gcode:</label>
                <textarea id="macro-params" rows={2} spellcheck={false} value={macro().paramsText} onInput={(event) => updateActive((item) => (item.paramsText = event.currentTarget.value), false)} />
                <label for="macro-gcode">G-code block</label>
                <textarea id="macro-gcode" class="gcode-editor" rows={13} spellcheck={false} value={macro().gcode} onInput={(event) => updateActive((item) => (item.gcode = event.currentTarget.value))} />
              </div>
            </div>

            <div class="macro-summary">
              <span class="pill">{props.state.macroPreview.segments.length} event(s)</span>
              <Show when={props.state.macroPreview.partial}><span class="pill warn">partial preview</span></Show>
              <span class="muted">Step {props.state.macroRun.stepIndex + 1} / {props.state.macroPreview.segments.length} ({Math.round(props.state.macroRun.segmentProgress * 100)}%)</span>
              <span class="muted">Final: X{props.state.macroPreview.finalToolhead.x.toFixed(1)} Y{props.state.macroPreview.finalToolhead.y.toFixed(1)} Z{props.state.macroPreview.finalToolhead.z.toFixed(1)}</span>
              <span class="muted">E: {finalExtruder().toFixed(2)} / +{totalExtrusion().toFixed(2)}mm</span>
            </div>

            <Show when={macroDiagnostics().length}>
              <div class="macro-diagnostics">
                <For each={macroDiagnostics().slice(0, 6)}>{(item) => <div class={`diagnostic ${item.type}`}>{item.type.toUpperCase()}: {item.message}</div>}</For>
              </div>
            </Show>
          </>
        )}
      </Show>
    </section>
  );
}
