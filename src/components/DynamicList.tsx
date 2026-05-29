import { For, Show } from 'solid-js';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-solid';
import { updateMutable } from '../store';
import { inputToScrew, screwToInput } from '../kinematics/screwReference';
import type { AppState, Carriage, GenericStepper, Screw, Winch } from '../kinematics/types';

interface DynamicListProps {
  state: AppState;
  type: 'screws' | 'winches' | 'carriages' | 'genericSteppers';
  filterText?: string;
}

export default function DynamicList(props: DynamicListProps) {
  const normalizedFilter = () => String(props.filterText ?? '').trim().toLowerCase();
  const visible = () => !!normalizedFilter();

  const screwEntries = () => props.state.screws.map((value, index) => ({ value, index })).filter(({ value }) => screwMatches(value));
  const winchEntries = () => props.state.winches.map((value, index) => ({ value, index })).filter(({ value }) => winchMatches(value));
  const carriageEntries = () => props.state.carriages.map((value, index) => ({ value, index })).filter(({ value }) => carriageMatches(value));
  const genericStepperEntries = () => props.state.genericSteppers.map((value, index) => ({ value, index })).filter(({ value }) => genericStepperMatches(value));

  const n = (value: string): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function matches(...parts: unknown[]): boolean {
    if (!normalizedFilter()) return true;
    const fullText = parts.map((part) => String(part ?? '').toLowerCase()).join(' ');
    const compactText = parts.map((part) => String(part ?? '').toLowerCase().replace(/[\s_\-:[\]()]+/g, '')).join('');
    const compactFilter = normalizedFilter().replace(/[\s_\-:[\]()]+/g, '');
    return fullText.includes(normalizedFilter()) || compactText.includes(compactFilter);
  }

  function screwMatches(screw: Screw): boolean {
    return matches('X', 'screw_x') || matches('Y', 'screw_y') || matches('Name', 'screw_name');
  }

  function winchMatches(winch: Winch): boolean {
    return matches('Name', 'winch_name') || matches('Anchor X', 'anchor_x') || matches('Anchor Y', 'anchor_y') || matches('Anchor Z', 'anchor_z') || matches('Rot dist', 'rotation_distance');
  }

  function carriageMatches(carriage: Carriage): boolean {
    return matches('Name', 'carriage_name') || matches('Axis', 'axis') || matches('Min', 'position_min') || matches('Max', 'position_max') || matches('Endstop', 'position_endstop');
  }

  function genericStepperMatches(stepper: GenericStepper): boolean {
    return matches('Name', 'stepper_name') || matches('Carriages', 'carriages') || matches('Equation', 'equation');
  }

  function remove(index: number): void {
    updateMutable((draft) => {
      if (props.type === 'screws' && draft.screws.length > 3) draft.screws.splice(index, 1);
      if (props.type === 'winches' && draft.winches.length > 3) draft.winches.splice(index, 1);
      if (props.type === 'carriages' && draft.carriages.length > 3) draft.carriages.splice(index, 1);
      if (props.type === 'genericSteppers' && draft.genericSteppers.length > 1) draft.genericSteppers.splice(index, 1);
    });
  }

  function moveScrew(index: number, direction: -1 | 1): void {
    updateMutable((draft) => {
      const next = index + direction;
      if (next < 0 || next >= draft.screws.length) return;
      const [item] = draft.screws.splice(index, 1);
      draft.screws.splice(next, 0, item);
    });
  }

  function updateScrew(index: number, key: keyof Screw, value: string): void {
    updateMutable((draft) => {
      if (key === 'name') draft.screws[index].name = value;
    });
  }

  function updateScrewCoordinate(index: number, key: 'x' | 'y', value: string): void {
    updateMutable((draft) => {
      const currentInput = screwToInput(draft.screws[index], draft.values);
      const nextInput = {
        x: key === 'x' ? n(value) : currentInput.x,
        y: key === 'y' ? n(value) : currentInput.y
      };
      const nextScrew = inputToScrew(nextInput.x, nextInput.y, draft.values);
      draft.screws[index].x = nextScrew.x;
      draft.screws[index].y = nextScrew.y;
    });
  }

  function updateWinch(index: number, key: keyof Winch, value: string): void {
    updateMutable((draft) => {
      if (key === 'name') draft.winches[index].name = value;
      else draft.winches[index][key] = n(value);
    });
  }

  function updateCarriage(index: number, key: keyof Carriage, value: string): void {
    updateMutable((draft) => {
      if (key === 'name' || key === 'axis') draft.carriages[index][key] = value;
      else draft.carriages[index][key] = n(value);
    });
  }

  function updateGenericStepper(index: number, key: keyof GenericStepper, value: string): void {
    updateMutable((draft) => {
      draft.genericSteppers[index][key] = value;
    });
  }

  return (
    <div class="dynamic-list">
      <Show when={props.type === 'screws'}>
        <For each={screwEntries()}>
          {({ value: screw, index }) => (
            <div classList={{ filtered: visible() }} class="list-row screw-row">
              <Show when={matches('X', 'screw_x')}><div><label>X<input type="number" value={screwToInput(screw, props.state.values).x} onInput={(event) => updateScrewCoordinate(index, 'x', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Y', 'screw_y')}><div><label>Y<input type="number" value={screwToInput(screw, props.state.values).y} onInput={(event) => updateScrewCoordinate(index, 'y', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Name', 'screw_name')}><div><label>Name<input type="text" value={screw.name} onInput={(event) => updateScrew(index, 'name', event.currentTarget.value)} /></label></div></Show>
              <Show when={!visible()}>
                <div class="row-icon-actions">
                  <button type="button" class="icon-button" title="Move screw up" aria-label="Move screw up" disabled={index === 0} onClick={() => moveScrew(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" class="icon-button" title="Move screw down" aria-label="Move screw down" disabled={index === props.state.screws.length - 1} onClick={() => moveScrew(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" class="danger icon-button" title="Remove screw" aria-label="Remove screw" onClick={() => remove(index)}><Trash2 size={14} /></button>
                </div>
              </Show>
            </div>
          )}
        </For>
      </Show>

      <Show when={props.type === 'winches'}>
        <For each={winchEntries()}>
          {({ value: winch, index }) => (
            <div classList={{ filtered: visible() }} class="list-row winch-row">
              <Show when={matches('Name', 'winch_name')}><div><label>Name<input type="text" value={winch.name} onInput={(event) => updateWinch(index, 'name', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Anchor X', 'anchor_x')}><div><label>Anchor X<input type="number" value={winch.x} onInput={(event) => updateWinch(index, 'x', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Anchor Y', 'anchor_y')}><div><label>Anchor Y<input type="number" value={winch.y} onInput={(event) => updateWinch(index, 'y', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Anchor Z', 'anchor_z')}><div><label>Anchor Z<input type="number" value={winch.z} onInput={(event) => updateWinch(index, 'z', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Rot dist', 'rotation_distance')}><div><label>Rot dist<input type="number" value={winch.rotation_distance} onInput={(event) => updateWinch(index, 'rotation_distance', event.currentTarget.value)} /></label></div></Show>
              <Show when={!visible()}><button type="button" class="danger" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
            </div>
          )}
        </For>
      </Show>

      <Show when={props.type === 'carriages'}>
        <For each={carriageEntries()}>
          {({ value: carriage, index }) => (
            <div classList={{ filtered: visible() }} class="list-row carriage-row">
              <Show when={matches('Name', 'carriage_name')}><div><label>Name<input type="text" value={carriage.name} onInput={(event) => updateCarriage(index, 'name', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Axis', 'axis')}><div><label>Axis<input type="text" value={carriage.axis} onInput={(event) => updateCarriage(index, 'axis', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Min', 'position_min')}><div><label>Min<input type="number" value={carriage.min} onInput={(event) => updateCarriage(index, 'min', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Max', 'position_max')}><div><label>Max<input type="number" value={carriage.max} onInput={(event) => updateCarriage(index, 'max', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Endstop', 'position_endstop')}><div><label>Endstop<input type="number" value={carriage.endstop} onInput={(event) => updateCarriage(index, 'endstop', event.currentTarget.value)} /></label></div></Show>
              <Show when={!visible()}><button type="button" class="danger" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
            </div>
          )}
        </For>
      </Show>

      <Show when={props.type === 'genericSteppers'}>
        <For each={genericStepperEntries()}>
          {({ value: stepper, index }) => (
            <div classList={{ filtered: visible() }} class="list-row stepper-row">
              <Show when={matches('Name', 'stepper_name')}><div><label>Name<input type="text" value={stepper.name} onInput={(event) => updateGenericStepper(index, 'name', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Carriages', 'carriages')}><div><label>Carriages<input type="text" value={stepper.carriages} onInput={(event) => updateGenericStepper(index, 'carriages', event.currentTarget.value)} /></label></div></Show>
              <Show when={matches('Equation', 'equation')}><div><label>Equation<input type="text" value={stepper.equation} onInput={(event) => updateGenericStepper(index, 'equation', event.currentTarget.value)} /></label></div></Show>
              <Show when={!visible()}><button type="button" class="danger" onClick={() => remove(index)}><Trash2 size={14} />Remove</button></Show>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
