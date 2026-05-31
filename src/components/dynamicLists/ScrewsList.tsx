import { For, Show } from 'solid-js';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-solid';
import { updateMutable } from '../../store';
import { inputToScrew, screwToInput } from '../../kinematics/screwReference';
import { matchesFilter, normalizeFilter, numberFromInput } from './listUtils';
import type { AppState, Screw } from '../../kinematics/types';

interface ScrewsListProps {
  state: AppState;
  filterText?: string;
}

export default function ScrewsList(props: ScrewsListProps) {
  const visible = () => !!normalizeFilter(props.filterText);
  const entries = () => props.state.screws.map((value, index) => ({ value, index })).filter(({ value }) => screwMatches(value));

  function matches(...parts: unknown[]): boolean {
    return matchesFilter(props.filterText, ...parts);
  }

  function screwMatches(_screw: Screw): boolean {
    return matches('X', 'screw_x') || matches('Y', 'screw_y') || matches('Name', 'screw_name');
  }

  function remove(index: number): void {
    updateMutable((draft) => {
      if (draft.screws.length > 3) draft.screws.splice(index, 1);
    });
  }

  function move(index: number, direction: -1 | 1): void {
    updateMutable((draft) => {
      const next = index + direction;
      if (next < 0 || next >= draft.screws.length) return;
      const [item] = draft.screws.splice(index, 1);
      draft.screws.splice(next, 0, item);
    });
  }

  function updateName(index: number, value: string): void {
    updateMutable((draft) => {
      draft.screws[index].name = value;
    });
  }

  function updateCoordinate(index: number, key: 'x' | 'y', value: string): void {
    updateMutable((draft) => {
      const currentInput = screwToInput(draft.screws[index], draft.values);
      const nextInput = {
        x: key === 'x' ? numberFromInput(value) : currentInput.x,
        y: key === 'y' ? numberFromInput(value) : currentInput.y
      };
      const nextScrew = inputToScrew(nextInput.x, nextInput.y, draft.values);
      draft.screws[index].x = nextScrew.x;
      draft.screws[index].y = nextScrew.y;
    });
  }

  return (
    <For each={entries()}>
      {({ value: screw, index }) => (
        <div classList={{ filtered: visible() }} class="list-row screw-row">
          <Show when={matches('X', 'screw_x')}><div><label>X<input class="input input-bordered input-sm w-full" type="number" value={screwToInput(screw, props.state.values).x} onInput={(event) => updateCoordinate(index, 'x', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Y', 'screw_y')}><div><label>Y<input class="input input-bordered input-sm w-full" type="number" value={screwToInput(screw, props.state.values).y} onInput={(event) => updateCoordinate(index, 'y', event.currentTarget.value)} /></label></div></Show>
          <Show when={matches('Name', 'screw_name')}><div><label>Name<input class="input input-bordered input-sm w-full" type="text" value={screw.name} onInput={(event) => updateName(index, event.currentTarget.value)} /></label></div></Show>
          <Show when={!visible()}>
            <div class="row-icon-actions">
              <button type="button" class="btn btn-square btn-sm" title="Move screw up" aria-label="Move screw up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
              <button type="button" class="btn btn-square btn-sm" title="Move screw down" aria-label="Move screw down" disabled={index === props.state.screws.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
              <button type="button" class="btn btn-error btn-square btn-sm" title="Remove screw" aria-label="Remove screw" onClick={() => remove(index)}><Trash2 size={14} /></button>
            </div>
          </Show>
        </div>
      )}
    </For>
  );
}
